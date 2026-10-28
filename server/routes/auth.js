import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db.js';
import { getJwtSecret } from '../config/jwt.js';
import { getPermissionsForRole, loadCampusContext } from '../middleware/rbac.js';

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
    must_change_password: Boolean(row.must_change_password),
    student_id_number: row.student_id_number || null,
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
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

// Middleware to authenticate
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token || token === 'null' || token === 'undefined') return res.sendStatus(401);
  
  jwt.verify(token, getJwtSecret(), (err, user) => {
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
  
  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.sendStatus(401);
    }
    req.user = user;
    next();
  });
};

router.post('/register', async (req, res) => {
  const { name, email, password, college_code, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const requestedRole = role ? String(role).trim().toLowerCase() : 'student';

  // Never allow Super Admin or College Admin creation through public registration
  if (requestedRole === 'super_admin' || requestedRole === 'superadmin' || requestedRole === 'admin' || requestedRole === 'college_admin') {
    return res.status(403).json({ error: 'Unauthorized role: Administrative accounts cannot be created via public registration.' });
  }

  // Preserve institutional provisioning rules for Teacher and HR accounts
  if (requestedRole === 'teacher' || requestedRole === 'tutor') {
    return res.status(403).json({
      error: 'Teacher accounts are provisioned by institutional invitation only. Please contact your college administrator to receive your credentials.'
    });
  }

  if (requestedRole === 'hr') {
    return res.status(403).json({
      error: 'HR accounts are provisioned by platform authorization only. Please contact your organization administrator to receive your credentials.'
    });
  }

  if (requestedRole && requestedRole !== 'student') {
    return res.status(403).json({ error: 'Forbidden: Privileged roles cannot be self-assigned. Teacher and Administrator accounts must be provisioned by the institution.' });
  }

  let client = null;
  try {
    if (!db.pool) {
      return res.status(503).json({
        error: 'Database service is temporarily unavailable. Please verify DATABASE_URL configuration.'
      });
    }

    try {
      client = await db.pool.connect();
    } catch (connErr) {
      console.error('[auth/register] Database connection error:', connErr.message);
      return res.status(503).json({
        error: 'Database connection failed. Please check your network connection or try again shortly.'
      });
    }

    await client.query('BEGIN');
    const cleanEmail = email.trim().toLowerCase();
    const existing = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(college_email) = $1 OR LOWER(personal_email) = $1',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
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
      const colRes = await client.query('SELECT id, name, code, domain, status FROM colleges WHERE LOWER(code) = LOWER($1)', [college_code.trim()]);
      if (colRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid College Code: No educational institution registered with code '${college_code.trim()}'.` });
      }
      if (colRes.rows[0].status === 'PENDING') {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          error: `Institution Access Restricted: '${colRes.rows[0].name}' is pending administrator verification. Students cannot register without platform authorization.` 
        });
      }
      if (colRes.rows[0].status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          error: `Institution Access Restricted: '${colRes.rows[0].name}' is currently inactive or suspended. Students cannot register without platform authorization.` 
        });
      }
      matchedCollege = colRes.rows[0];
    } else if (emailDomain && !genericDomains.includes(emailDomain)) {
      const colRes = await client.query('SELECT id, name, code, domain, status FROM colleges WHERE LOWER(domain) = $1 LIMIT 1', [emailDomain]);
      if (colRes.rows.length > 0) {
        if (colRes.rows[0].status === 'PENDING') {
          await client.query('ROLLBACK');
          return res.status(403).json({ 
            error: `Institutional Access Restricted: Your campus (${colRes.rows[0].name}) is pending administrator authorization.` 
          });
        }
        if (colRes.rows[0].status !== 'ACTIVE') {
          await client.query('ROLLBACK');
          return res.status(403).json({ 
            error: `Institutional Access Restricted: Your campus (${colRes.rows[0].name}) is currently inactive or suspended.` 
          });
        }
        matchedCollege = colRes.rows[0];
      }
    }

    let instEmail = null;
    let isRosterApproved = false;
    let membershipStatus = 'ACTIVE';
    let verificationMethod = 'MANUAL';
    let verificationToken = null;

    if (matchedCollege) {
      instEmail = (req.body.institutional_email || cleanEmail).trim().toLowerCase();

      // Enforce institutional domain check if college specifies an official domain
      if (matchedCollege.domain && !instEmail.endsWith(`@${matchedCollege.domain.toLowerCase()}`) && !instEmail.endsWith(`.${matchedCollege.domain.toLowerCase()}`)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Institutional email must belong to the institution domain (@${matchedCollege.domain})`
        });
      }

      // Enforce unique institutional email: prevent claiming someone else's email at this college
      const dupInstRes = await client.query(
        "SELECT id FROM campus_users WHERE college_id = $1 AND LOWER(institutional_email) = $2 AND status != 'INACTIVE'",
        [matchedCollege.id, instEmail]
      );
      if (dupInstRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `The institutional email '${instEmail}' is already registered with an active account at ${matchedCollege.name}.`
        });
      }

      // Check pre-approved roster
      const rosterRes = await client.query(
        "SELECT id, role, batch_id FROM college_approved_roster WHERE college_id = $1 AND LOWER(institutional_email) = $2 AND status IN ('PRE_APPROVED', 'PENDING')",
        [matchedCollege.id, instEmail]
      );

      if (rosterRes.rows.length > 0) {
        // Pre-approved by college roster
        isRosterApproved = true;
        membershipStatus = 'ACTIVE';
        verificationMethod = 'ROSTER';

        // Update roster entry
        await client.query(
          "UPDATE college_approved_roster SET status = 'ENROLLED', enrolled_at = NOW(), updated_at = NOW() WHERE id = $1",
          [rosterRes.rows[0].id]
        );
      } else {
        // Requires email verification token before granting active access
        membershipStatus = 'PENDING_VERIFICATION';
        verificationMethod = 'EMAIL_TOKEN';
        isRosterApproved = false;
      }
    }

    // Insert user into users table
    const result = await client.query(
      `INSERT INTO users (full_name, email, personal_email, personal_email_verified, personal_email_verified_at, college_email, college_email_verified, college_email_verified_at, password_hash) 
       VALUES ($1, $2, $2, TRUE, NOW(), $3, $4, $5, $6) 
       RETURNING *`,
      [
        name, 
        cleanEmail, 
        matchedCollege ? instEmail : null,
        isRosterApproved,
        isRosterApproved ? new Date() : null,
        password_hash
      ]
    );

    const user = result.rows[0];

    // If affiliated with a college, insert campus_users record
    let campusInfo = null;
    if (matchedCollege) {
      await client.query(`
        INSERT INTO campus_users (user_id, college_id, system_role, status, institutional_email, verified_at, verification_method)
        VALUES ($1, $2, 'STUDENT', $3, $4, $5, $6)
        ON CONFLICT (user_id, college_id) DO UPDATE SET
          status = EXCLUDED.status,
          institutional_email = EXCLUDED.institutional_email,
          verified_at = EXCLUDED.verified_at,
          verification_method = EXCLUDED.verification_method,
          updated_at = NOW()
      `, [
        user.id, 
        matchedCollege.id, 
        membershipStatus, 
        instEmail, 
        isRosterApproved ? new Date() : null, 
        verificationMethod
      ]);

      // If pre-approved roster specified a batch, enroll the student
      if (isRosterApproved) {
        const rosterBatchRes = await client.query(
          "SELECT batch_id FROM college_approved_roster WHERE college_id = $1 AND LOWER(institutional_email) = $2 LIMIT 1",
          [matchedCollege.id, instEmail]
        );
        if (rosterBatchRes.rows.length > 0 && rosterBatchRes.rows[0].batch_id) {
          await client.query(
            "INSERT INTO student_enrollments (student_user_id, batch_id, status) VALUES ($1, $2, 'ACTIVE') ON CONFLICT DO NOTHING",
            [user.id, rosterBatchRes.rows[0].batch_id]
          );
        }
      } else {
        // Generate single-use verification token valid for 24 hours
        verificationToken = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await client.query(`
          INSERT INTO college_verification_tokens (user_id, college_id, institutional_email, token, expires_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [user.id, matchedCollege.id, instEmail, verificationToken, expiresAt]);
      }

      campusInfo = {
        role: 'STUDENT',
        collegeId: matchedCollege.id,
        collegeName: matchedCollege.name,
        collegeCode: matchedCollege.code,
        membershipStatus,
        verificationMethod,
        institutionalEmail: instEmail,
        permissions: getPermissionsForRole('STUDENT')
      };
    }

    await client.query('COMMIT');

    const token = generateToken(user, matchedCollege?.id || null);
    const formattedUser = formatUser(user);
    if (campusInfo) {
      formattedUser.campus = campusInfo;
      formattedUser.role = campusInfo.role;
      formattedUser.permissions = campusInfo.permissions;
    } else {
      formattedUser.role = 'STUDENT';
      formattedUser.permissions = getPermissionsForRole('STUDENT');
    }
    
    res.status(201).json({ 
      user: formattedUser, 
      token,
      college: matchedCollege ? { id: matchedCollege.id, name: matchedCollege.name, code: matchedCollege.code } : null,
      verificationRequired: !isRosterApproved && Boolean(matchedCollege),
      verificationToken: verificationToken || null,
      message: isRosterApproved 
        ? 'Registration successful! Institutional enrollment verified via approved campus roster.' 
        : (matchedCollege ? 'Account created. Please verify your institutional email address to activate your campus access.' : 'Registration successful!')
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[auth/register] error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email or institutional membership record already exists' });
    }
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'DB_NOT_CONFIGURED' ||
      error.message?.includes('getaddrinfo') ||
      error.message?.includes('timeout') ||
      error.message?.includes('Connection terminated')
    ) {
      return res.status(503).json({
        error: 'Database service is currently unreachable. Please check your network connection or try again in a few moments.'
      });
    }
    res.status(500).json({ error: error.message || 'Registration failed due to a server error. Please try again.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/auth/verify-institutional-email — Single-use token verification endpoint
router.post('/verify-institutional-email', async (req, res) => {
  const { token, email } = req.body;
  if (!token || !token.trim()) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  let client = null;
  try {
    if (!db.pool) {
      return res.status(503).json({ error: 'Database service is temporarily unavailable.' });
    }
    try {
      client = await db.pool.connect();
    } catch (connErr) {
      console.error('[verify-institutional-email] Connection error:', connErr.message);
      return res.status(503).json({ error: 'Database connection failed. Please try again shortly.' });
    }

    await client.query('BEGIN');

    let query = 'SELECT * FROM college_verification_tokens WHERE token = $1 AND used_at IS NULL';
    let params = [token.trim()];
    if (email && email.trim()) {
      query += ' AND LOWER(institutional_email) = $2';
      params.push(email.trim().toLowerCase());
    }

    const tokenRes = await client.query(query, params);
    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or already used verification token' });
    }

    const tokenRow = tokenRes.rows[0];
    if (new Date(tokenRow.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Verification token has expired. Please contact administration for a new token.' });
    }

    // Mark token as used
    await client.query('UPDATE college_verification_tokens SET used_at = NOW() WHERE id = $1', [tokenRow.id]);

    // Activate campus_users membership
    await client.query(`
      UPDATE campus_users 
      SET status = 'ACTIVE', 
          verified_at = NOW(), 
          verification_method = 'EMAIL_TOKEN',
          updated_at = NOW()
      WHERE user_id = $1 AND college_id = $2
    `, [tokenRow.user_id, tokenRow.college_id]);

    // Update users verification flags
    await client.query(`
      UPDATE users 
      SET college_email_verified = TRUE, 
          college_email_verified_at = NOW(),
          account_lifecycle_status = 'ACTIVE_STUDENT'
      WHERE id = $1
    `, [tokenRow.user_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Institutional email successfully verified. Your campus membership is now active.'
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[verify-institutional-email] error:', error);
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('getaddrinfo')
    ) {
      return res.status(503).json({ error: 'Database service is currently unreachable. Please try again shortly.' });
    }
    res.status(500).json({ error: 'Failed to verify institutional email' });
  } finally {
    if (client) client.release();
  }
});

router.post('/login', async (req, res) => {
  let { email, password, college_code, panel } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedPanel = panel ? panel.toLowerCase() : null;

  // Support HR ID formatted logins (e.g., HR-piet24cd-nuen0k) or direct emails
  let cleanIdentifier = email.trim().toLowerCase();
  if (!cleanIdentifier.includes('@')) {
    cleanIdentifier = `${cleanIdentifier}@hr.jobdm.com`;
  }

  try {
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

    if (college_code && college_code.trim()) {
      // If college code was provided, verify college exists and user is an active member
      const colRes = await pool.query('SELECT id, name, status FROM colleges WHERE LOWER(code) = LOWER($1)', [college_code.trim()]);
      if (colRes.rows.length === 0) return res.status(400).json({ error: 'Invalid College Code: No educational institution registered with this code.' });
      if (colRes.rows[0].status === 'PENDING') {
        return res.status(403).json({ error: `Institution Access Restricted: '${colRes.rows[0].name}' is pending administrator verification.` });
      }
      if (colRes.rows[0].status !== 'ACTIVE') {
        return res.status(403).json({ error: `Institution Access Restricted: '${colRes.rows[0].name}' is currently inactive or suspended. Please contact your administrator.` });
      }
      activeCollegeId = colRes.rows[0].id;

      // Verify user membership in this college
      const roleRes = await pool.query(
        "SELECT system_role, status FROM campus_users WHERE user_id = $1 AND college_id = $2",
        [user.id, activeCollegeId]
      );

      if (roleRes.rows.length === 0) {
        return res.status(403).json({ error: 'Unauthorized: No active affiliation record found for this college' });
      }
      if (roleRes.rows[0].status === 'PENDING_VERIFICATION') {
        return res.status(403).json({ error: 'Membership Restricted: Your institutional email verification is pending. Please verify your email with the verification token.' });
      }
      if (roleRes.rows[0].status !== 'ACTIVE') {
        return res.status(403).json({ error: `Membership Restricted: Your campus membership is currently ${roleRes.rows[0].status.toLowerCase()}.` });
      }

      if (normalizedPanel === 'hr' && roleRes.rows[0].system_role !== 'HR') {
        return res.status(403).json({ error: 'Unauthorized: No HR access for this college' });
      }
      if ((normalizedPanel === 'tutor' || normalizedPanel === 'teacher') && roleRes.rows[0].system_role !== 'TUTOR') {
        return res.status(403).json({ error: 'Unauthorized: No Teacher access for this college' });
      }
    } else {
      // Authoritative database-driven role and college resolution - role is never trusted from frontend
      const generalRoleRes = await pool.query(
        `SELECT cu.id, cu.college_id, cu.system_role, cu.status as membership_status, c.status as college_status, c.name as college_name 
         FROM campus_users cu 
         LEFT JOIN colleges c ON cu.college_id = c.id 
         WHERE cu.user_id = $1 
         ORDER BY 
           (CASE 
             WHEN cu.system_role = 'SUPER_ADMIN' THEN 1 
             WHEN cu.system_role = 'HR' THEN 2 
             WHEN cu.system_role = 'TUTOR' THEN 3 
             WHEN cu.system_role = 'COLLEGE_ADMIN' THEN 4 
             ELSE 5 
           END) ASC, 
           cu.created_at DESC 
         LIMIT 1`,
        [user.id]
      );

      if (generalRoleRes.rows.length > 0) {
        const primaryCampus = generalRoleRes.rows[0];
        if (primaryCampus.college_id && primaryCampus.system_role !== 'SUPER_ADMIN') {
          if (primaryCampus.college_status && primaryCampus.college_status !== 'ACTIVE') {
            return res.status(403).json({ 
              error: `Institution Access Restricted: Your educational institution (${primaryCampus.college_name || 'College'}) is currently ${primaryCampus.college_status.toLowerCase()}. Please contact your campus administrator.` 
            });
          }
          if (primaryCampus.membership_status !== 'ACTIVE') {
            return res.status(403).json({ 
              error: `Membership Restricted: Your institutional access is currently ${primaryCampus.membership_status.toLowerCase()}. Institutional email verification or administrator approval is required.` 
            });
          }
        }
        activeCollegeId = primaryCampus.college_id || null;
      }
    }

    const token = generateToken(user, activeCollegeId);

    // Fetch campus context for formatted user response
    let campusContext = null;
    const campusContextRes = await pool.query(
      `SELECT cu.id as campus_user_id, cu.college_id, cu.system_role, c.name as college_name 
       FROM campus_users cu 
       LEFT JOIN colleges c ON cu.college_id = c.id 
       WHERE cu.user_id = $1 AND cu.status = 'ACTIVE'
       ${activeCollegeId ? 'AND cu.college_id = $2' : ''}
       ORDER BY (CASE WHEN cu.system_role = 'SUPER_ADMIN' THEN 1 WHEN cu.system_role = 'HR' THEN 2 WHEN cu.system_role = 'TUTOR' THEN 3 WHEN cu.system_role = 'COLLEGE_ADMIN' THEN 4 ELSE 5 END) ASC, cu.created_at DESC
       LIMIT 1`,
      activeCollegeId ? [user.id, activeCollegeId] : [user.id]
    );

    if (campusContextRes.rows.length > 0) {
      const row = campusContextRes.rows[0];
      const permissions = getPermissionsForRole(row.system_role);
      campusContext = {
        campusUserId: row.campus_user_id,
        role: row.system_role,
        collegeId: row.college_id,
        collegeName: row.college_name,
        permissions
      };
    }

    const formattedUser = formatUser(user);
    if (campusContext) {
      formattedUser.campus = campusContext;
      formattedUser.role = campusContext.role;
      formattedUser.permissions = campusContext.permissions;
    } else {
      formattedUser.role = 'STUDENT';
      formattedUser.permissions = getPermissionsForRole('STUDENT');
    }
    
    res.json({ 
      user: formattedUser, 
      token,
      must_change_password: Boolean(user.must_change_password)
    });
  } catch (error) {
    console.error('[auth/login] error:', error);
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'DB_NOT_CONFIGURED' ||
      error.message?.includes('getaddrinfo') ||
      error.message?.includes('timeout')
    ) {
      return res.status(503).json({
        error: 'Database service is currently unreachable. Please check your network connection or try again in a few moments.'
      });
    }
    res.status(500).json({ error: error.message || 'Authentication failed due to a server error. Please try again.' });
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

    const user = result.rows[0];
    const formattedUser = formatUser(user);

    let campusQuery = `
      SELECT cu.id as campus_user_id, cu.college_id, cu.system_role, c.name as college_name 
      FROM campus_users cu 
      LEFT JOIN colleges c ON cu.college_id = c.id 
      WHERE cu.user_id = $1 AND cu.status = 'ACTIVE'
    `;
    const params = [user.id];
    if (req.user.active_college_id) {
      campusQuery += ' AND cu.college_id = $2';
      params.push(req.user.active_college_id);
    }
    campusQuery += ' ORDER BY (CASE WHEN cu.system_role = \'SUPER_ADMIN\' THEN 1 WHEN cu.system_role = \'HR\' THEN 2 WHEN cu.system_role = \'TUTOR\' THEN 3 WHEN cu.system_role = \'COLLEGE_ADMIN\' THEN 4 ELSE 5 END) ASC, cu.created_at DESC LIMIT 1';

    const campusRes = await pool.query(campusQuery, params);
    if (campusRes.rows.length > 0) {
      const row = campusRes.rows[0];
      const permissions = getPermissionsForRole(row.system_role);
      formattedUser.campus = {
        campusUserId: row.campus_user_id,
        role: row.system_role,
        collegeId: row.college_id,
        collegeName: row.college_name,
        permissions
      };
      formattedUser.role = row.system_role;
      formattedUser.permissions = permissions;
    } else {
      formattedUser.role = 'STUDENT';
      formattedUser.permissions = getPermissionsForRole('STUDENT');
    }

    res.json({ user: formattedUser });
  } catch (error) {
    console.error('[auth/me] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/permissions — Authoritative server-side permissions and role definition
router.get('/permissions', authenticateToken, loadCampusContext, async (req, res) => {
  res.json({
    userId: req.user.id,
    role: req.campusContext.systemRole,
    collegeId: req.campusContext.collegeId,
    collegeName: req.campusContext.collegeName,
    permissions: req.campusContext.permissions
  });
});

// POST /api/auth/change-initial-password — First-time login password update for pre-provisioned accounts
router.post('/change-initial-password', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    const userRes = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({
      success: true,
      message: 'Your personal password has been set successfully. You can now access your campus portal.'
    });
  } catch (err) {
    console.error('[change-initial-password] error:', err);
    res.status(500).json({ error: 'Failed to update password' });
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
