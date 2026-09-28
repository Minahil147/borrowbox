const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, area: u.area, role: u.role };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, area } = req.body;

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    throw new ApiError(400, 'An account with this email already exists');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, phone, area)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, area, role`,
    [name, email, password_hash, phone || null, area || null]
  );

  const user = rows[0];
  const token = signToken(user);

  res.status(201).json({ success: true, data: { user: publicUser(user), token }, message: 'Account created' });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!rows.length) throw new ApiError(401, 'Invalid email or password');

  const user = rows[0];
  if (!user.is_active) throw new ApiError(403, 'This account has been deactivated');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, 'Invalid email or password');

  const token = signToken(user);
  res.json({ success: true, data: { user: publicUser(user), token }, message: 'Logged in' });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: publicUser(req.user) });
});

module.exports = { register, login, me };
