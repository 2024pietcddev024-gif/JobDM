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
    college_email: row.college_email || null,
    personal_email: row.personal_email || null,
    college_email_verified: Boolean(row.college_email_verified),
    college_email_verified_at: row.college_email_verified_at || null,
    personal_email_verified: Boolean(row.personal_email_verified),
    personal_email_verified_at: row.personal_email_verified_at || null,
    primary_contact_preference: row.primary_contact_preference || 'PERSONAL',
    account_lifecycle_status: row.account_lifecycle_status || 'ACTIVE_STUDENT',
    graduation_year: row.graduation_year || null,
    target_role: row.target_role,
    targetRole: row.target_role,   // camelCase alias
    targetLevel: row.target_level, // camelCase alias
    streak_days: row.streak_days,
    streakDays: row.streak_days,
    preferred_coding_language: row.preferred_coding_language,
    preferredCodingLanguage: row.preferred_coding_language,
    practice_languages: row.practice_languages,
    practiceLanguages: row.practice_languages
  };
}


const router = express.Router();

const generateToken = (user, collegeId = null) => {
  const payload = { id: user.id, email: user.email };
  if (collegeId) payload.active_college_id = collegeId;
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// Middleware to authenticate
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token || token === 'null' || token === 'undefined') return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(401);
    req.user = user;
    next();
  });
};

// Middleware to allow guests but verify token if present
export const authenticateOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token || token === 'null' || token === 'undefined') {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.sendStatus(401);
    }
    req.user = user;
    next();
  });
};

router.post('/register', async (req, res) => {
  const { name, email, password, college_code } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(college_email) = $1 OR LOWER(personal_email) = $1',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Detect if email domain belongs to an active registered college or college_code provided
    const emailParts = cleanEmail.split('@');
    const emailDomain = emailParts.length > 1 ? emailParts[1].toLowerCase() : null;
    const genericDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'gmil.com'];
    
    let matchedCollege = null;
    if (college_code && college_code.trim()) {
      const colRes = await pool.query('SELECT id, name, domain, status FROM colleges WHERE LOWER(code) = LOWER($1)', [college_code.trim()]);
      if (colRes.rows.length > 0 && colRes.rows[0].status === 'ACTIVE') {
        matchedCollege = colRes.rows[0];
      }
    } else if (emailDomain && !genericDomains.includes(emailDomain)) {
      const colRes = await pool.query('SELECT id, name, domain, status FROM colleges WHERE LOWER(domain) = $1 AND status = $2 LIMIT 1', [emailDomain, 'ACTIVE']);
      if (colRes.rows.length > 0) {
        matchedCollege = colRes.rows[0];
      }
    }

    const result = await pool.query(
      `INSERT INTO users (full_name, email, personal_email, personal_email_verified, personal_email_verified_at, college_email, college_email_verified, college_email_verified_at, password_hash) 
       VALUES ($1, $2, $2, TRUE, NOW(), $3, $4, $5, $6) 
       RETURNING *`,
      [
        name, 
        cleanEmail, 
        matchedCollege ? cleanEmail : null,
        Boolean(matchedCollege),
        matchedCollege ? new Date() : null,
        password_hash
      ]
    );

    const user = result.rows[0];

    // If matched with an active college, automatically register user as STUDENT of that college
    if (matchedCollege) {
      await pool.query(
        "INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'STUDENT', 'ACTIVE') ON CONFLICT (user_id, college_id) DO NOTHING",
        [user.id, matchedCollege.id]
      );
    }

    const token = generateToken(user, matchedCollege?.id || null);
    
    res.status(201).json({ 
      user: formatUser(user), 
      token,
      college: matchedCollege ? { id: matchedCollege.id, name: matchedCollege.name } : null
    });
  } catch (error) {
    console.error('[auth/register] error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  let { email, password, college_code, panel } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email/HR ID and password are required' });
  }

  const normalizedPanel = panel ? panel.toLowerCase() : null;

  if (normalizedPanel === 'hr' && !email.includes('@')) {
    email = `${email}@hr.jobdm.com`.toLowerCase();
  }

  try {
    const cleanIdentifier = email.trim().toLowerCase();
    // Resolve user by canonical email, college_email, or personal_email
    const result = await pool.query(`
      SELECT * FROM users 
      WHERE LOWER(email) = $1 
         OR LOWER(college_email) = $1 
         OR LOWER(personal_email) = $1
      LIMIT 1
    `, [cleanIdentifier]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    let activeCollegeId = null;

    if (college_code) {
      // Verify college exists
      const colRes = await pool.query('SELECT id, status FROM colleges WHERE LOWER(code) = LOWER($1)', [college_code.trim()]);
      if (colRes.rows.length === 0) return res.status(400).json({ error: 'Invalid College Code' });
      if (colRes.rows[0].status !== 'ACTIVE') {
        return res.status(403).json({ error: 'This College/Company account is currently inactive. Please contact your administrator.' });
      }
      activeCollegeId = colRes.rows[0].id;

      // Verify user membership in this college
      const roleRes = await pool.query(
        "SELECT system_role, status FROM campus_users WHERE user_id = $1 AND college_id = $2",
        [user.id, activeCollegeId]
      );

      if (roleRes.rows.length === 0 || roleRes.rows[0].status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Unauthorized: No active affiliation with this college' });
      }

      if (normalizedPanel === 'hr' && roleRes.rows[0].system_role !== 'HR') {
        return res.status(403).json({ error: 'Unauthorized: No HR access for this college' });
      }
      if ((normalizedPanel === 'tutor' || normalizedPanel === 'teacher') && roleRes.rows[0].system_role !== 'TUTOR') {
        return res.status(403).json({ error: 'Unauthorized: No Teacher access for this college' });
      }
    } else if (normalizedPanel === 'hr') {
      return res.status(400).json({ error: 'College / Company Code is required for HR login' });
    } else if (normalizedPanel === 'tutor' || normalizedPanel === 'teacher') {
      const tutorRoleRes = await pool.query(
        "SELECT college_id FROM campus_users WHERE user_id = $1 AND system_role = 'TUTOR' AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
      if (tutorRoleRes.rows.length === 0) {
        return res.status(403).json({ error: 'Access Denied: Your account does not have active Teacher privileges.' });
      }
      activeCollegeId = tutorRoleRes.rows[0].college_id;
    } else {
      const generalRoleRes = await pool.query(
        "SELECT college_id FROM campus_users WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
      if (generalRoleRes.rows.length > 0) {
        activeCollegeId = generalRoleRes.rows[0].college_id;
      }
    }

    const token = generateToken(user, activeCollegeId);
    
    res.json({ user: formatUser(user), token });
  } catch (error) {
    console.error('[auth/login] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
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

// POST /api/auth/link-college-email — Links and verifies college institutional email to canonical account
router.post('/link-college-email', authenticateToken, async (req, res) => {
  try {
    const { college_email, verification_code } = req.body;
    if (!college_email || !college_email.includes('@')) {
      return res.status(400).json({ error: 'Valid college email is required' });
    }

    const cleanEmail = college_email.trim().toLowerCase();

    // Check if another account already owns this college email
    const conflict = await pool.query(
      'SELECT id FROM users WHERE (LOWER(email) = $1 OR LOWER(college_email) = $1) AND id != $2',
      [cleanEmail, req.user.id]
    );
    if (conflict.rows.length > 0) {
      return res.status(400).json({ error: 'This college email is already associated with another account' });
    }

    // Link and mark verified
    const updateRes = await pool.query(`
      UPDATE users 
      SET college_email = $1,
          college_email_verified = TRUE,
          college_email_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [cleanEmail, req.user.id]);

    res.json({
      message: 'College email successfully linked and verified',
      user: formatUser(updateRes.rows[0])
    });
  } catch (error) {
    console.error('[link-college-email] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/link-personal-email — Links and verifies personal recovery email to canonical account
router.post('/link-personal-email', authenticateToken, async (req, res) => {
  try {
    const { personal_email } = req.body;
    if (!personal_email || !personal_email.includes('@')) {
      return res.status(400).json({ error: 'Valid personal email is required' });
    }

    const cleanEmail = personal_email.trim().toLowerCase();

    // Check conflict
    const conflict = await pool.query(
      'SELECT id FROM users WHERE (LOWER(email) = $1 OR LOWER(personal_email) = $1) AND id != $2',
      [cleanEmail, req.user.id]
    );
    if (conflict.rows.length > 0) {
      return res.status(400).json({ error: 'This personal email is already associated with another account' });
    }

    const updateRes = await pool.query(`
      UPDATE users 
      SET personal_email = $1,
          personal_email_verified = TRUE,
          personal_email_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [cleanEmail, req.user.id]);

    res.json({
      message: 'Personal email successfully linked and verified',
      user: formatUser(updateRes.rows[0])
    });
  } catch (error) {
    console.error('[link-personal-email] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/email-preferences — Set primary contact channel (COLLEGE vs PERSONAL)
router.post('/email-preferences', authenticateToken, async (req, res) => {
  try {
    const { preference } = req.body;
    if (!['COLLEGE', 'PERSONAL'].includes(preference)) {
      return res.status(400).json({ error: 'Preference must be either COLLEGE or PERSONAL' });
    }

    const updateRes = await pool.query(`
      UPDATE users
      SET primary_contact_preference = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [preference, req.user.id]);

    res.json({
      message: 'Email preferences updated successfully',
      user: formatUser(updateRes.rows[0])
    });
  } catch (error) {
    console.error('[email-preferences] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/lifecycle-status — Updates student graduation/alumni lifecycle
router.post('/lifecycle-status', authenticateToken, async (req, res) => {
  try {
    const { status, graduation_year } = req.body;
    const validStatuses = ['ACTIVE_STUDENT', 'GRADUATING', 'ALUMNI'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const updateRes = await pool.query(`
      UPDATE users
      SET account_lifecycle_status = $1,
          graduation_year = COALESCE($2, graduation_year),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, graduation_year ? parseInt(graduation_year, 10) : null, req.user.id]);

    res.json({
      message: `Account lifecycle updated to ${status}. All practice data and history preserved.`,
      user: formatUser(updateRes.rows[0])
    });
  } catch (error) {
    console.error('[lifecycle-status] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile — update user profile in the database
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, full_name, target_role, target_level, current_password, new_password, preferred_coding_language, practice_languages } = req.body;
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
    if (preferred_coding_language !== undefined) { updates.push(`preferred_coding_language = $${idx++}`); values.push(preferred_coding_language); }
    if (practice_languages !== undefined) { updates.push(`practice_languages = $${idx++}`); values.push(JSON.stringify(practice_languages)); }

    if (updates.length === 0 && !new_password) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    let updatedUser = null;
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(req.user.id);
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      updatedUser = result.rows[0];
    } else {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
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
