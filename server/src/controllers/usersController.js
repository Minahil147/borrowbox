const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// PUT /api/users/me
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, area } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), area = COALESCE($3, area)
     WHERE id = $4
     RETURNING id, name, email, phone, area, role`,
    [name, phone, area, req.user.id]
  );
  res.json({ success: true, data: rows[0], message: 'Profile updated' });
});

// DELETE /api/users/me  (soft delete; blocked while bookings are open)
const deleteMe = asyncHandler(async (req, res) => {
  const openBookings = await pool.query(
    `SELECT 1 FROM bookings
     WHERE borrower_id = $1 AND status IN ('REQUESTED','APPROVED','PICKED_UP')
     UNION
     SELECT 1 FROM bookings b JOIN items i ON b.item_id = i.id
     WHERE i.owner_id = $1 AND b.status IN ('REQUESTED','APPROVED','PICKED_UP')
     LIMIT 1`,
    [req.user.id]
  );
  if (openBookings.rows.length) {
    throw new ApiError(409, 'Cannot delete account while you have open bookings');
  }

  await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.user.id]);
  res.json({ success: true, message: 'Account deactivated' });
});

// GET /api/users/:id  (public profile with trust score + reviews)
const getPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userRes = await pool.query(
    'SELECT id, name, area, created_at FROM users WHERE id = $1 AND is_active = true',
    [id]
  );
  if (!userRes.rows.length) throw new ApiError(404, 'User not found');

  const ratingRes = await pool.query(
    'SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE reviewee_id = $1',
    [id]
  );

  const reviewsRes = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
     FROM reviews r JOIN users u ON r.reviewer_id = u.id
     WHERE r.reviewee_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
    [id]
  );

  res.json({
    success: true,
    data: {
      user: userRes.rows[0],
      trust_score: Number(ratingRes.rows[0].avg_rating),
      review_count: Number(ratingRes.rows[0].review_count),
      reviews: reviewsRes.rows,
    },
  });
});

module.exports = { updateMe, deleteMe, getPublicProfile };
