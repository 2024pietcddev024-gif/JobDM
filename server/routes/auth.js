import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const pool = { query: db.query };

// Helper: shape user row for API responses
function formatUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    name: row.full_name,          // frontend alias
    email: row.email,
    target_role: row.target_role,
    targetRole: row.target_role,   // camelCase alias
    target_level: row.target_level,
    targetLevel: row.target_level, // camelCase alias
    streak_days: row.streak_days,
    streakDays: row.streak_days
  };
}


const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// Middleware to authenticate
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, target_role, target_level, streak_days',
      [name, email, password_hash]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    
    res.status(201).json({ user: formatUser(user), token });
  } catch (error) {
    console.error('[auth/register] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    
    res.json({ user: formatUser(user), token });
  } catch (error) {
    console.error('[auth/login] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, target_role, target_level, streak_days FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: formatUser(result.rows[0]) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile — update user profile in the database
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, full_name, target_role, target_level, current_password, new_password } = req.body;
  const resolvedName = name || full_name;

  try {
    // If changing password, verify current password first
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const valid = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(new_password, salt);
      await pool.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [password_hash, req.user.id]
      );
    }

    // Build dynamic UPDATE query for profile fields
    const updates = [];
    const values = [];
    let idx = 1;

    if (resolvedName) { updates.push(`full_name = $${idx++}`); values.push(resolvedName); }
    if (target_role)  { updates.push(`target_role = $${idx++}`); values.push(target_role); }
    if (target_level) { updates.push(`target_level = $${idx++}`); values.push(target_level); }

    if (updates.length === 0 && !new_password) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    let updatedUser = null;
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(req.user.id);
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, target_role, target_level, streak_days`,
        values
      );
      updatedUser = result.rows[0];
    } else {
      const result = await pool.query(
        'SELECT id, full_name, email, target_role, target_level, streak_days FROM users WHERE id = $1',
        [req.user.id]
      );
      updatedUser = result.rows[0];
    }

    res.json({ user: formatUser(updatedUser), message: 'Profile updated successfully' });
  } catch (error) {
    console.error('[auth/profile] Update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
