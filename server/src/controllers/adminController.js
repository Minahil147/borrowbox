const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/admin/stats
const stats = asyncHandler(async (req, res) => {
  const users = await pool.query('SELECT COUNT(*) FROM users');
  const items = await pool.query('SELECT COUNT(*) FROM items');
  const byStatus = await pool.query('SELECT status, COUNT(*) FROM bookings GROUP BY status');

  const bookingsByStatus = {};
  byStatus.rows.forEach((r) => { bookingsByStatus[r.status] = Number(r.count); });

  res.json({
    success: true,
    data: {
      total_users: Number(users.rows[0].count),
      total_items: Number(items.rows[0].count),
      bookings_by_status: bookingsByStatus,
    },
  });
});

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, area, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ success: true, data: rows });
});

// PATCH /api/admin/users/:id/status  { is_active }
const setUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, is_active',
    [is_active, id]
  );
  if (!rows.length) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: rows[0], message: 'User status updated' });
});

module.exports = { stats, listUsers, setUserStatus };
