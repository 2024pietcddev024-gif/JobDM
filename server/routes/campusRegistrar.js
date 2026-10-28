import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
import { authenticateToken } from './auth.js';
import { loadCampusContext, requireCampusUser, requireCampusRole } from '../middleware/campusAuth.js';
import { bulkProvisionUsers } from '../services/bulkProvisioningService.js';

const router = express.Router();
const pool = { query: db.query };

// Public onboarding request for educational institutions
router.post('/onboard-request', async (req, res) => {
  try {
    const { name, domain, contact_email, contact_phone, admin_name, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Institution name is required' });
    }
    if (!contact_email || !contact_email.includes('@')) {
      return res.status(400).json({ error: 'Valid contact email is required' });
    }

    const tempCode = `PENDING-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const insertRes = await pool.query(`
      INSERT INTO colleges (name, domain, code, status, contact_email, contact_phone, verification_notes)
      VALUES ($1, $2, $3, 'PENDING', $4, $5, $6)
      RETURNING *
    `, [
      name.trim(),
      domain ? domain.trim().toLowerCase() : null,
      tempCode,
      contact_email.trim().toLowerCase(),
      contact_phone || null,
      notes || `Requested by ${admin_name || 'Institution Representative'}`
    ]);

    res.status(201).json({
      message: 'Onboarding request submitted successfully. Pending platform administrator verification.',
      college: insertRes.rows[0]
    });
  } catch (error) {
    console.error('[onboard-request] error:', error);
    res.status(500).json({ error: 'Failed to submit onboarding request' });
  }
});

router.use(authenticateToken);
router.use(loadCampusContext);
router.use(requireCampusUser);
router.use(requireCampusRole('SUPER_ADMIN'));

// 1. COLLEGE MANAGEMENT
router.get('/colleges', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM colleges ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/colleges', async (req, res) => {
  try {
    const { name, domain } = req.body || {};
    let { code } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    if (!code) {
      code = `ORG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    
    const check = await pool.query('SELECT id FROM colleges WHERE code = $1', [code]);
    if (check.rows.length > 0) return res.status(409).json({ error: 'College code already exists' });

    const result = await pool.query(
      'INSERT INTO colleges (name, code, domain) VALUES ($1, $2, $3) RETURNING *',
      [name, code, domain || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'College code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/colleges/:collegeId/verify', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { official_code, verification_notes } = req.body || {};

    const check = await pool.query('SELECT * FROM colleges WHERE id = $1', [collegeId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    
    const college = check.rows[0];
    let finalCode = official_code ? official_code.trim().toUpperCase() : college.code;
    if (!finalCode || finalCode.startsWith('PENDING-')) {
      finalCode = `ORG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    const updateRes = await pool.query(`
      UPDATE colleges 
      SET status = 'ACTIVE',
          code = $1,
          verified_at = NOW(),
          verified_by = $2,
          verification_notes = COALESCE($3, verification_notes),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [finalCode, req.user?.id || null, verification_notes || null, collegeId]);

    res.json({
      message: 'College institution verified and activated successfully',
      college: updateRes.rows[0]
    });
  } catch (error) {
    console.error('[colleges verify] error:', error);
    res.status(500).json({ error: 'Failed to verify college: ' + error.message });
  }
});

router.patch('/colleges/:collegeId', async (req, res) => {
  try {
    const { name, code, domain } = req.body || {};
    const { collegeId } = req.params;
    const result = await pool.query(
      'UPDATE colleges SET name = COALESCE($1, name), code = COALESCE($2, code), domain = COALESCE($3, domain), updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, code, domain, collegeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'College code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/colleges/:collegeId/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const { collegeId } = req.params;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const result = await pool.query(
      'UPDATE colleges SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, collegeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// 2. DEPARTMENT MANAGEMENT
router.get('/colleges/:collegeId/departments', async (req, res) => {
  const { collegeId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM departments WHERE college_id = $1 ORDER BY name', [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/colleges/:collegeId/departments', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { name, code } = req.body || {};
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

    const checkCol = await pool.query('SELECT id FROM colleges WHERE id = $1', [collegeId]);
    if (checkCol.rows.length === 0) return res.status(404).json({ error: 'College not found' });

    const checkDep = await pool.query('SELECT id FROM departments WHERE college_id = $1 AND code = $2', [collegeId, code]);
    if (checkDep.rows.length > 0) return res.status(409).json({ error: 'Department code already exists in this college' });

    const result = await pool.query(
      'INSERT INTO departments (college_id, name, code) VALUES ($1, $2, $3) RETURNING *',
      [collegeId, name, code]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Department code already exists in this college' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/departments/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name, code } = req.body || {};
    const result = await pool.query(
      'UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code), updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, code, departmentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Department code already exists in this college' });
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. BATCH MANAGEMENT
router.get('/colleges/:collegeId/batches', async (req, res) => {
  const { collegeId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM batches WHERE college_id = $1 ORDER BY name', [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/colleges/:collegeId/batches', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { department_id, name, academic_year } = req.body || {};
    if (!department_id || !name || !academic_year) return res.status(400).json({ error: 'Department, name, and academic year are required' });

    const deptRes = await pool.query('SELECT college_id FROM departments WHERE id = $1', [department_id]);
    if (deptRes.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    if (deptRes.rows[0].college_id !== collegeId) return res.status(400).json({ error: 'Department does not belong to the specified college' });

    const result = await pool.query(
      'INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, $3, $4) RETURNING *',
      [collegeId, department_id, name, academic_year]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/batches/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { name, academic_year, status } = req.body || {};
    const result = await pool.query(
      'UPDATE batches SET name = COALESCE($1, name), academic_year = COALESCE($2, academic_year), status = COALESCE($3, status), updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, academic_year, status, batchId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. COLLEGE ADMIN ASSIGNMENT
router.post('/colleges/:collegeId/admins', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const userRes = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const colRes = await pool.query('SELECT id FROM colleges WHERE id = $1', [collegeId]);
    if (colRes.rows.length === 0) return res.status(404).json({ error: 'College not found' });

    const existingRes = await pool.query('SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2', [userId, collegeId]);
    if (existingRes.rows.length > 0) return res.status(409).json({ error: 'User already has a campus identity in this college' });

    const result = await pool.query(
      "INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'COLLEGE_ADMIN') RETURNING *",
      [userId, collegeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Duplicate campus user or unique constraint violated' });
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. HR PROVISIONING
router.post('/colleges/:collegeId/hr', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { full_name } = req.body || {};
    if (!full_name) return res.status(400).json({ error: 'Full name is required' });

    const colRes = await pool.query('SELECT code FROM colleges WHERE id = $1', [collegeId]);
    if (colRes.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    const colCode = colRes.rows[0].code;

    // Generate HR ID and secure password
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hrId = `HR-${colCode}-${randomHex}`;
    const email = `${hrId}@hr.jobdm.com`.toLowerCase();
    
    const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const hash = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id',
      [email, hash, full_name]
    );
    const userId = userRes.rows[0].id;

    await pool.query(
      "INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'HR', 'ACTIVE')",
      [userId, collegeId]
    );

    res.status(201).json({
      hr_id: hrId,
      college_code: colCode,
      initial_password: password,
      message: 'HR account provisioned securely. Please securely communicate the HR ID, College Code, and Initial Password to the user.'
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'HR account already exists or collision occurred' });
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. DETAILED SUMMARY OF ALL COLLEGES WITH COUNTS
router.get('/colleges-summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.name, c.code, c.domain, c.status, c.created_at,
        COUNT(DISTINCT CASE WHEN cu.system_role = 'STUDENT' AND cu.status = 'ACTIVE' THEN cu.id END) AS student_count,
        COUNT(DISTINCT CASE WHEN cu.system_role = 'TUTOR' AND cu.status = 'ACTIVE' THEN cu.id END) AS tutor_count,
        COUNT(DISTINCT CASE WHEN cu.system_role = 'HR' AND cu.status = 'ACTIVE' THEN cu.id END) AS hr_count,
        COUNT(DISTINCT b.id) AS batch_count
      FROM colleges c
      LEFT JOIN campus_users cu ON c.id = cu.college_id
      LEFT JOIN batches b ON c.id = b.college_id
      GROUP BY c.id, c.name, c.code, c.domain, c.status, c.created_at
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[colleges-summary] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. LIST ALL PROVISIONED HR ACCOUNTS
router.get('/hrs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cu.id as campus_user_id,
        cu.user_id,
        cu.college_id,
        cu.status,
        cu.created_at,
        u.full_name,
        u.email,
        c.name as college_name,
        c.code as college_code
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      JOIN colleges c ON cu.college_id = c.id
      WHERE cu.system_role = 'HR'
      ORDER BY cu.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[registrar/hrs] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. LIST ALL TEACHERS (TUTORS) ACROSS COLLEGES
router.get('/teachers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cu.id as campus_user_id,
        cu.user_id,
        cu.college_id,
        cu.status,
        cu.created_at,
        u.full_name,
        u.email,
        c.name as college_name,
        c.code as college_code
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      JOIN colleges c ON cu.college_id = c.id
      WHERE cu.system_role = 'TUTOR'
      ORDER BY cu.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[registrar/teachers] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 9. PROVISION TEACHER DIRECTLY (SUPER ADMIN)
router.post('/provision-teacher', async (req, res) => {
  try {
    const { collegeId, full_name, email, password } = req.body || {};
    if (!collegeId || !full_name || !email || !password) {
      return res.status(400).json({ error: 'College, full name, email, and password are required' });
    }

    const colRes = await pool.query('SELECT id, name, code FROM colleges WHERE id = $1', [collegeId]);
    if (colRes.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    const college = colRes.rows[0];

    const cleanEmail = email.trim().toLowerCase();
    let userRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    let userId;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, full_name = COALESCE($2, full_name) WHERE id = $3',
        [hash, full_name.trim(), userId]
      );
    } else {
      const hash = await bcrypt.hash(password, 10);
      const newU = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, college_email, college_email_verified) VALUES ($1, $2, $3, $1, TRUE) RETURNING id',
        [cleanEmail, hash, full_name.trim()]
      );
      userId = newU.rows[0].id;
    }

    const checkCu = await pool.query(
      'SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2',
      [userId, collegeId]
    );

    if (checkCu.rows.length > 0) {
      await pool.query(
        "UPDATE campus_users SET system_role = 'TUTOR', status = 'ACTIVE', updated_at = NOW() WHERE id = $1",
        [checkCu.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'TUTOR', 'ACTIVE')",
        [userId, collegeId]
      );
    }

    res.status(201).json({
      message: `Teacher ${full_name} provisioned successfully for ${college.name}.`,
      teacher: {
        email: cleanEmail,
        name: full_name,
        college: college.name,
        college_code: college.code
      }
    });
  } catch (error) {
    console.error('[provision-teacher] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// 10. TOGGLE ACTIVE / INACTIVE STATUS FOR ANY CAMPUS USER (TEACHER, HR, ETC.)
router.patch('/campus-users/:campusUserId/toggle-status', async (req, res) => {
  const { campusUserId } = req.params;
  try {
    const current = await pool.query('SELECT status, system_role FROM campus_users WHERE id = $1', [campusUserId]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'User record not found' });
    const newStatus = current.rows[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const updateRes = await pool.query(
      'UPDATE campus_users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, campusUserId]
    );
    res.json({
      message: `Status updated to ${newStatus}`,
      user: updateRes.rows[0]
    });
  } catch (error) {
    console.error('[toggle-status] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 11. HR COLLEGE PERMISSIONS MANAGEMENT (SUPER ADMIN GOVERNANCE)
router.get('/hr-permissions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        hcp.id,
        hcp.hr_user_id,
        u.full_name as hr_name,
        u.email as hr_email,
        hcp.college_id,
        c.name as college_name,
        c.code as college_code,
        c.status as college_status,
        hcp.status as permission_status,
        hcp.notes,
        hcp.created_at,
        gu.full_name as granted_by_name
      FROM hr_college_permissions hcp
      JOIN users u ON hcp.hr_user_id = u.id
      JOIN colleges c ON hcp.college_id = c.id
      LEFT JOIN users gu ON hcp.granted_by = gu.id
      ORDER BY hcp.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[GET /hr-permissions] error:', error);
    res.status(500).json({ error: 'Server error loading HR permissions' });
  }
});

router.post('/hr-permissions', async (req, res) => {
  try {
    const { hr_user_id, hr_email, college_id, notes } = req.body || {};
    if ((!hr_user_id && !hr_email) || !college_id) {
      return res.status(400).json({ error: 'HR user (ID or email) and target college ID are required' });
    }

    // 1. Verify college exists and is active
    const colRes = await pool.query('SELECT id, name, status FROM colleges WHERE id = $1', [college_id]);
    if (colRes.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    if (colRes.rows[0].status !== 'ACTIVE') {
      return res.status(400).json({ error: `Cannot grant permissions for inactive college (${colRes.rows[0].name}). Activate college first.` });
    }

    // 2. Resolve HR user
    let targetUserId = hr_user_id;
    if (!targetUserId && hr_email) {
      const uRes = await pool.query('SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER($1)', [hr_email.trim()]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'HR user not found with provided email' });
      targetUserId = uRes.rows[0].id;
    }

    // Ensure user has HR campus_users role
    await pool.query(`
      INSERT INTO campus_users (user_id, college_id, system_role, status)
      VALUES ($1, $2, 'HR', 'ACTIVE')
      ON CONFLICT (user_id, college_id) DO UPDATE SET system_role = 'HR', status = 'ACTIVE'
    `, [targetUserId, college_id]);

    // Insert or update permission record
    const permRes = await pool.query(`
      INSERT INTO hr_college_permissions (hr_user_id, college_id, granted_by, status, notes)
      VALUES ($1, $2, $3, 'ACTIVE', $4)
      ON CONFLICT (hr_user_id, college_id) 
      DO UPDATE SET status = 'ACTIVE', notes = COALESCE($4, hr_college_permissions.notes), updated_at = NOW()
      RETURNING *
    `, [targetUserId, college_id, req.user.id, notes || 'Authorized by Super Admin']);

    res.status(201).json({
      message: `HR recruiter granted permission to post jobs and access candidates for ${colRes.rows[0].name}`,
      permission: permRes.rows[0]
    });
  } catch (error) {
    console.error('[POST /hr-permissions] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.patch('/hr-permissions/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const cur = await pool.query('SELECT status, hr_user_id, college_id FROM hr_college_permissions WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Permission not found' });
    const newStatus = cur.rows[0].status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';

    const upd = await pool.query(
      'UPDATE hr_college_permissions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    // Sync status in campus_users as well
    await pool.query(
      'UPDATE campus_users SET status = $1, updated_at = NOW() WHERE user_id = $2 AND college_id = $3 AND system_role = \'HR\'',
      [newStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE', cur.rows[0].hr_user_id, cur.rows[0].college_id]
    );

    res.json({ message: `Permission status updated to ${newStatus}`, permission: upd.rows[0] });
  } catch (error) {
    console.error('[toggle hr-permission] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/hr-permissions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const cur = await pool.query('SELECT hr_user_id, college_id FROM hr_college_permissions WHERE id = $1', [id]);
    if (cur.rows.length > 0) {
      await pool.query('DELETE FROM hr_college_permissions WHERE id = $1', [id]);
      await pool.query(
        "UPDATE campus_users SET status = 'INACTIVE' WHERE user_id = $1 AND college_id = $2 AND system_role = 'HR'",
        [cur.rows[0].hr_user_id, cur.rows[0].college_id]
      );
    }
    res.json({ message: 'HR permission revoked successfully' });
  } catch (error) {
    console.error('[delete hr-permission] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 12. PENDING MEMBERSHIPS & VERIFICATION MANAGEMENT (SUPER ADMIN)
router.get('/pending-memberships', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cu.id as campus_user_id,
        cu.user_id,
        u.full_name,
        u.email as account_email,
        cu.institutional_email,
        cu.system_role,
        cu.status as membership_status,
        cu.verification_method,
        cu.created_at,
        c.id as college_id,
        c.name as college_name,
        c.code as college_code
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      JOIN colleges c ON cu.college_id = c.id
      WHERE cu.status = 'PENDING_VERIFICATION' OR cu.status = 'PENDING'
      ORDER BY cu.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[GET /pending-memberships] error:', error);
    res.status(500).json({ error: 'Server error loading pending memberships' });
  }
});

router.post('/memberships/:campusUserId/approve', async (req, res) => {
  const { campusUserId } = req.params;
  try {
    const cur = await pool.query('SELECT * FROM campus_users WHERE id = $1', [campusUserId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Membership record not found' });
    
    const updated = await pool.query(`
      UPDATE campus_users
      SET status = 'ACTIVE',
          verified_at = NOW(),
          verified_by = $1,
          verification_method = 'SUPER_ADMIN_MANUAL',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [req.user.id, campusUserId]);

    await pool.query(
      'UPDATE users SET college_email_verified = TRUE, college_email_verified_at = NOW() WHERE id = $1',
      [cur.rows[0].user_id]
    );

    res.json({ message: 'Campus membership approved and activated.', membership: updated.rows[0] });
  } catch (error) {
    console.error('[approve membership] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/memberships/:campusUserId/reject', async (req, res) => {
  const { campusUserId } = req.params;
  try {
    const cur = await pool.query('SELECT * FROM campus_users WHERE id = $1', [campusUserId]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Membership record not found' });

    await pool.query(`
      UPDATE campus_users
      SET status = 'REJECTED',
          updated_at = NOW()
      WHERE id = $1
    `, [campusUserId]);

    res.json({ message: 'Campus membership rejected.' });
  } catch (error) {
    console.error('[reject membership] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 13. PRE-APPROVED ROSTER MANAGEMENT
router.get('/colleges/:collegeId/roster', async (req, res) => {
  const { collegeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM college_approved_roster 
      WHERE college_id = $1 
      ORDER BY created_at DESC
    `, [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[GET roster] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/colleges/:collegeId/roster', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { institutional_email, full_name, role, department_code, academic_year, batch_id } = req.body || {};

    if (!institutional_email || !institutional_email.includes('@')) {
      return res.status(400).json({ error: 'Valid institutional email is required' });
    }

    const colCheck = await pool.query('SELECT id, name, status FROM colleges WHERE id = $1', [collegeId]);
    if (colCheck.rows.length === 0) return res.status(404).json({ error: 'College not found' });

    const result = await pool.query(`
      INSERT INTO college_approved_roster (college_id, institutional_email, full_name, role, department_code, academic_year, batch_id, added_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PRE_APPROVED')
      ON CONFLICT (college_id, institutional_email) 
      DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, batch_id = EXCLUDED.batch_id, updated_at = NOW()
      RETURNING *
    `, [
      collegeId, 
      institutional_email.trim().toLowerCase(), 
      full_name || null, 
      role || 'STUDENT', 
      department_code || null, 
      academic_year || null, 
      batch_id || null, 
      req.user.id
    ]);

    res.status(201).json({
      message: 'Student pre-approved on institutional roster',
      rosterEntry: result.rows[0]
    });
  } catch (error) {
    console.error('[POST roster] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/colleges/:collegeId/roster/:rosterId', async (req, res) => {
  const { collegeId, rosterId } = req.params;
  try {
    await pool.query('DELETE FROM college_approved_roster WHERE id = $1 AND college_id = $2', [rosterId, collegeId]);
    res.json({ message: 'Roster entry removed successfully' });
  } catch (error) {
    console.error('[DELETE roster] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 14. INSTITUTIONAL BULK PROVISIONING (SUPER ADMIN)
router.post('/colleges/:collegeId/bulk-provision', async (req, res) => {
  const { collegeId } = req.params;
  const { users, forcePasswordChange = true, autoCreateDepartmentsAndBatches = true } = req.body;

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'A non-empty "users" array is required' });
  }

  try {
    const result = await bulkProvisionUsers(collegeId, req.user.id, users, {
      forcePasswordChange,
      autoCreateDepartmentsAndBatches
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('[POST registrar bulk-provision] error:', error);
    res.status(500).json({ error: error.message || 'Bulk provisioning failed' });
  }
});

export default router;
