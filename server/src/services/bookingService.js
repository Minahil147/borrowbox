const pool = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

// Allowed status transitions and who may trigger them (Section 06 of the brief)
const TRANSITIONS = {
  approve: { from: 'REQUESTED', to: 'APPROVED', actor: 'owner' },
  reject:  { from: 'REQUESTED', to: 'REJECTED', actor: 'owner' },
  cancel:  { from: ['REQUESTED', 'APPROVED'], to: 'CANCELLED', actor: 'borrower' },
  pickup:  { from: 'APPROVED', to: 'PICKED_UP', actor: 'owner' },
  return:  { from: 'PICKED_UP', to: 'RETURNED', actor: 'owner' },
};

// Rule 4/9: the heart-of-the-project overlap query.
// Returns true if the requested range overlaps an APPROVED/PICKED_UP booking on the same item.
async function hasOverlap(client, itemId, start, end, excludeBookingId = null) {
  const params = [itemId, start, end];
  let sql = `
    SELECT 1 FROM bookings
    WHERE item_id = $1
      AND status IN ('APPROVED', 'PICKED_UP')
      AND start_date <= $3
      AND end_date >= $2
  `;
  if (excludeBookingId) {
    params.push(excludeBookingId);
    sql += ` AND id != $${params.length}`;
  }
  const { rows } = await client.query(sql, params);
  return rows.length > 0;
}

// POST /api/bookings — validates Rules 1,2,3,4,5,6 then inserts REQUESTED
async function createBooking(userId, { item_id, start_date, end_date, message }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemRes = await client.query(
      `SELECT i.*, u.is_active AS owner_active FROM items i
       JOIN users u ON i.owner_id = u.id WHERE i.id = $1 FOR SHARE`,
      [item_id]
    );
    if (!itemRes.rows.length) throw new ApiError(404, 'Item not found');
    const item = itemRes.rows[0];

    // Rule 5: item + owner must be active
    if (!item.is_active || !item.owner_active) {
      throw new ApiError(400, 'This item is not currently available');
    }
    // Rule 1: cannot borrow own item
    if (item.owner_id === userId) {
      throw new ApiError(400, 'You cannot borrow your own item');
    }
    // Rule 2: dates sane
    const today = new Date().toISOString().slice(0, 10);
    if (start_date < today) throw new ApiError(400, 'Start date cannot be in the past');
    if (end_date < start_date) throw new ApiError(400, 'End date must be on or after start date');

    // Rule 3: within max_days
    const days = (new Date(end_date) - new Date(start_date)) / 86400000 + 1;
    if (days > item.max_days) {
      throw new ApiError(400, `Booking duration exceeds this item's maximum of ${item.max_days} days`);
    }

    // Rule 4: no overlap with an approved/picked-up booking
    if (await hasOverlap(client, item_id, start_date, end_date)) {
      throw new ApiError(409, 'These dates are no longer available for this item');
    }

    // Rule 6: borrower may have at most 3 open bookings
    const openCount = await client.query(
      `SELECT COUNT(*) FROM bookings
       WHERE borrower_id = $1 AND status IN ('REQUESTED','APPROVED','PICKED_UP')`,
      [userId]
    );
    if (Number(openCount.rows[0].count) >= 3) {
      throw new ApiError(400, 'You already have 3 open bookings — resolve one before requesting another');
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (item_id, borrower_id, start_date, end_date, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [item_id, userId, start_date, end_date, message || null]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// PATCH /api/bookings/:id/status — the status state machine (Rules 7, 8, 9, 12)
async function changeStatus(bookingId, userId, action, extra = {}) {
  const transition = TRANSITIONS[action];
  if (!transition) throw new ApiError(400, 'Unknown action');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT b.*, i.owner_id, i.id AS item_id FROM bookings b
       JOIN items i ON b.item_id = i.id WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );
    if (!bookingRes.rows.length) throw new ApiError(404, 'Booking not found');
    const booking = bookingRes.rows[0];

    // Rule 7: only owner or borrower, depending on the action
    const isOwner = booking.owner_id === userId;
    const isBorrower = booking.borrower_id === userId;
    if (transition.actor === 'owner' && !isOwner) throw new ApiError(403, 'Only the item owner can do this');
    if (transition.actor === 'borrower' && !isBorrower) throw new ApiError(403, 'Only the borrower can do this');

    // Rule 8: valid from-status
    const validFrom = Array.isArray(transition.from) ? transition.from : [transition.from];
    if (!validFrom.includes(booking.status)) {
      throw new ApiError(409, `Cannot ${action} a booking with status ${booking.status}`);
    }

    // Rule 9: on approve, re-check overlap (row-locked) then auto-reject clashing REQUESTED bookings
    if (action === 'approve') {
      const overlap = await hasOverlap(client, booking.item_id, booking.start_date, booking.end_date, booking.id);
      if (overlap) throw new ApiError(409, 'These dates were just booked by someone else');

      await client.query(
        `UPDATE bookings SET status = 'REJECTED', reject_reason = 'Auto-rejected: overlapping approved booking'
         WHERE item_id = $1 AND id != $2 AND status = 'REQUESTED'
           AND start_date <= $4 AND end_date >= $3`,
        [booking.item_id, booking.id, booking.start_date, booking.end_date]
      );
    }

    if (action === 'reject' && extra.reject_reason) {
      await client.query('UPDATE bookings SET reject_reason = $1 WHERE id = $2', [extra.reject_reason, booking.id]);
    }

    const { rows } = await client.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [transition.to, booking.id]
    );

    // pickup/return also write a condition_logs row (Module 5)
    if (action === 'pickup' || action === 'return') {
      const stage = action === 'pickup' ? 'handover' : 'return';
      await client.query(
        `INSERT INTO condition_logs (booking_id, stage, condition, note, logged_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [booking.id, stage, extra.condition || 'good', extra.note || null, userId]
      );
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createBooking, changeStatus, hasOverlap };
