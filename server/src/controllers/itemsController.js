const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const ITEM_SELECT = `
  SELECT i.*, c.name AS category_name, u.name AS owner_name,
         COALESCE(r.avg_rating, 0)::numeric(3,2) AS owner_rating
  FROM items i
  JOIN categories c ON i.category_id = c.id
  JOIN users u ON i.owner_id = u.id
  LEFT JOIN (
    SELECT reviewee_id, AVG(rating) AS avg_rating FROM reviews GROUP BY reviewee_id
  ) r ON r.reviewee_id = i.owner_id
`;

// GET /api/items?search=&category=&from=&to=&page=
const list = asyncHandler(async (req, res) => {
  const { search, category, from, to, page = 1 } = req.query;
  const limit = 12;
  const offset = (Number(page) - 1) * limit;

  const conditions = ['i.is_active = true', 'u.is_active = true'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(i.title ILIKE $${params.length} OR i.description ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`i.category_id = $${params.length}`);
  }
  if (from && to) {
    params.push(from, to);
    // Item is available if NO approved/picked_up booking overlaps the requested range
    conditions.push(`
      NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.item_id = i.id
          AND b.status IN ('APPROVED', 'PICKED_UP')
          AND b.start_date <= $${params.length} AND b.end_date >= $${params.length - 1}
      )
    `);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM items i JOIN users u ON i.owner_id = u.id ${where}`,
    params
  );
  const total = Number(countRes.rows[0].count);

  params.push(limit, offset);
  const dataRes = await pool.query(
    `${ITEM_SELECT} ${where} ORDER BY i.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    success: true,
    data: dataRes.rows,
    meta: { total, page: Number(page), pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// GET /api/items/mine
const mine = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `${ITEM_SELECT} WHERE i.owner_id = $1 ORDER BY i.created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: rows });
});

// GET /api/items/:id
const getOne = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`${ITEM_SELECT} WHERE i.id = $1`, [req.params.id]);
  if (!rows.length) throw new ApiError(404, 'Item not found');
  res.json({ success: true, data: rows[0] });
});

// GET /api/items/:id/availability -> booked date ranges (approved/picked_up)
const availability = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT start_date, end_date, status FROM bookings
     WHERE item_id = $1 AND status IN ('APPROVED', 'PICKED_UP')
     ORDER BY start_date ASC`,
    [req.params.id]
  );
  res.json({ success: true, data: rows });
});

// POST /api/items
const create = asyncHandler(async (req, res) => {
  const { title, description, category_id, condition, max_days, pickup_area, image_url } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO items (owner_id, category_id, title, description, condition, max_days, pickup_area, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, category_id, title, description || null, condition || 'good', max_days, pickup_area || null, image_url || null]
  );
  res.status(201).json({ success: true, data: rows[0], message: 'Item listed' });
});

// PUT /api/items/:id  (owner only)
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
  if (!item.rows.length) throw new ApiError(404, 'Item not found');
  if (item.rows[0].owner_id !== req.user.id) throw new ApiError(403, 'Not your item');

  const { title, description, category_id, condition, max_days, pickup_area, image_url, is_active } = req.body;
  const current = item.rows[0];

  const { rows } = await pool.query(
    `UPDATE items SET
       title = COALESCE($1, title), description = COALESCE($2, description),
       category_id = COALESCE($3, category_id), condition = COALESCE($4, condition),
       max_days = COALESCE($5, max_days), pickup_area = COALESCE($6, pickup_area),
       image_url = COALESCE($7, image_url), is_active = COALESCE($8, is_active)
     WHERE id = $9 RETURNING *`,
    [title, description, category_id, condition, max_days, pickup_area, image_url,
     is_active !== undefined ? is_active : null, id]
  );
  res.json({ success: true, data: rows[0], message: 'Item updated' });
});

// DELETE /api/items/:id  (owner/admin) — hard delete only if never booked, else deactivate
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
  if (!item.rows.length) throw new ApiError(404, 'Item not found');

  const isOwner = item.rows[0].owner_id === req.user.id;
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');

  const hasBookings = await pool.query('SELECT 1 FROM bookings WHERE item_id = $1 LIMIT 1', [id]);

  if (hasBookings.rows.length) {
    await pool.query('UPDATE items SET is_active = false WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Item has booking history — deactivated instead of deleted' });
  }

  await pool.query('DELETE FROM items WHERE id = $1', [id]);
  res.json({ success: true, message: 'Item deleted' });
});

module.exports = { list, mine, getOne, availability, create, update, remove };
