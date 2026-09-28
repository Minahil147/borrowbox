const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// POST /api/bookings/:id/reviews — rating+comment after RETURNED, one per person per booking
const create = asyncHandler(async (req, res) => {
  const { id: bookingId } = req.params;
  const { rating, comment } = req.body;

  const bookingRes = await pool.query(
    `SELECT b.*, i.owner_id FROM bookings b JOIN items i ON b.item_id = i.id WHERE b.id = $1`,
    [bookingId]
  );
  if (!bookingRes.rows.length) throw new ApiError(404, 'Booking not found');
  const booking = bookingRes.rows[0];

  if (booking.status !== 'RETURNED') throw new ApiError(409, 'Reviews open only after the item is returned');

  const isOwner = booking.owner_id === req.user.id;
  const isBorrower = booking.borrower_id === req.user.id;
  if (!isOwner && !isBorrower) throw new ApiError(403, 'Not part of this booking');

  const revieweeId = isOwner ? booking.borrower_id : booking.owner_id;

  const existing = await pool.query(
    'SELECT 1 FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
    [bookingId, req.user.id]
  );
  if (existing.rows.length) throw new ApiError(409, 'You already reviewed this booking');

  const { rows } = await pool.query(
    `INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [bookingId, req.user.id, revieweeId, rating, comment || null]
  );
  res.status(201).json({ success: true, data: rows[0], message: 'Review submitted' });
});

// PUT /api/reviews/:id — reviewer only
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
  if (!existing.rows.length) throw new ApiError(404, 'Review not found');
  if (existing.rows[0].reviewer_id !== req.user.id) throw new ApiError(403, 'Not your review');

  const { rating, comment } = req.body;
  const { rows } = await pool.query(
    'UPDATE reviews SET rating = COALESCE($1, rating), comment = COALESCE($2, comment) WHERE id = $3 RETURNING *',
    [rating, comment, id]
  );
  res.json({ success: true, data: rows[0], message: 'Review updated' });
});

// DELETE /api/reviews/:id — reviewer or admin
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
  if (!existing.rows.length) throw new ApiError(404, 'Review not found');

  const isAuthor = existing.rows[0].reviewer_id === req.user.id;
  if (!isAuthor && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');

  await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { create, update, remove };
