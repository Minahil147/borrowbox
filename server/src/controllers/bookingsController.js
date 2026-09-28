const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const bookingService = require('../services/bookingService');

const BOOKING_SELECT = `
  SELECT b.*, i.title AS item_title, i.image_url AS item_image, i.owner_id,
         owner.name AS owner_name, borrower.name AS borrower_name,
         (b.end_date < CURRENT_DATE AND b.status = 'PICKED_UP') AS overdue
  FROM bookings b
  JOIN items i ON b.item_id = i.id
  JOIN users owner ON i.owner_id = owner.id
  JOIN users borrower ON b.borrower_id = borrower.id
`;

// POST /api/bookings
const create = asyncHandler(async (req, res) => {
  const { item_id, start_date, end_date, message } = req.body;
  const booking = await bookingService.createBooking(req.user.id, { item_id, start_date, end_date, message });
  res.status(201).json({ success: true, data: booking, message: 'Booking request sent' });
});

// GET /api/bookings/mine (as borrower)
const mine = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `${BOOKING_SELECT} WHERE b.borrower_id = $1 ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: rows });
});

// GET /api/bookings/incoming (as owner)
const incoming = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `${BOOKING_SELECT} WHERE i.owner_id = $1 ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: rows });
});

// GET /api/bookings/:id
const getOne = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [req.params.id]);
  if (!rows.length) throw new ApiError(404, 'Booking not found');
  const booking = rows[0];
  if (booking.borrower_id !== req.user.id && booking.owner_id !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed');
  }

  const logsRes = await pool.query(
    'SELECT * FROM condition_logs WHERE booking_id = $1 ORDER BY logged_at ASC',
    [booking.id]
  );
  const reviewsRes = await pool.query('SELECT * FROM reviews WHERE booking_id = $1', [booking.id]);

  res.json({ success: true, data: { ...booking, condition_logs: logsRes.rows, reviews: reviewsRes.rows } });
});

// PUT /api/bookings/:id — borrower may edit dates/message while REQUESTED
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (!existing.rows.length) throw new ApiError(404, 'Booking not found');
  const booking = existing.rows[0];

  if (booking.borrower_id !== req.user.id) throw new ApiError(403, 'Not your booking');
  if (booking.status !== 'REQUESTED') throw new ApiError(409, 'Can only edit a booking while it is REQUESTED');

  const { start_date, end_date, message } = req.body;
  const { rows } = await pool.query(
    `UPDATE bookings SET start_date = COALESCE($1, start_date), end_date = COALESCE($2, end_date),
       message = COALESCE($3, message) WHERE id = $4 RETURNING *`,
    [start_date, end_date, message, id]
  );
  res.json({ success: true, data: rows[0], message: 'Booking updated' });
});

// DELETE /api/bookings/:id — only REJECTED or CANCELLED
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (!existing.rows.length) throw new ApiError(404, 'Booking not found');
  const booking = existing.rows[0];

  const isOwnerOfBooking = booking.borrower_id === req.user.id;
  if (!isOwnerOfBooking && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  if (!['REJECTED', 'CANCELLED'].includes(booking.status)) {
    throw new ApiError(409, 'Only a REJECTED or CANCELLED booking can be removed');
  }

  await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
  res.json({ success: true, message: 'Booking removed' });
});

// PATCH /api/bookings/:id/status  { action, note, condition, reject_reason }
const changeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note, condition, reject_reason } = req.body;
  if (!action) throw new ApiError(400, 'action is required');

  const booking = await require('../services/bookingService').changeStatus(
    id, req.user.id, action, { note, condition, reject_reason }
  );
  res.json({ success: true, data: booking, message: `Booking ${action}d` });
});

module.exports = { create, mine, incoming, getOne, update, remove, changeStatus };
