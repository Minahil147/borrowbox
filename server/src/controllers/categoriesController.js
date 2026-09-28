const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/categories
const list = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  res.json({ success: true, data: rows });
});

// POST /api/categories (admin)
const create = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const existing = await pool.query('SELECT id FROM categories WHERE name = $1', [name]);
  if (existing.rows.length) throw new ApiError(400, 'Category already exists');

  const { rows } = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
  res.status(201).json({ success: true, data: rows[0], message: 'Category created' });
});

// PUT /api/categories/:id (admin)
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { rows } = await pool.query(
    'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  );
  if (!rows.length) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: rows[0], message: 'Category renamed' });
});

// DELETE /api/categories/:id (admin) — 409 if items use it
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inUse = await pool.query('SELECT 1 FROM items WHERE category_id = $1 LIMIT 1', [id]);
  if (inUse.rows.length) {
    throw new ApiError(409, 'Category is in use by one or more items and cannot be deleted');
  }
  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  if (!rowCount) throw new ApiError(404, 'Category not found');
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = { list, create, update, remove };
