import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
import { authenticateToken } from './auth.js';
import { loadCampusContext, requireCampusUser, requireCampusRole } from '../middleware/campusAuth.js';

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
  const { name, domain } = req.body;
  let { code } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  if (!code) {
    code = `ORG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  
  try {
    const check = await pool.query('SELECT id FROM colleges WHERE code = $1', [code]);
    if (check.rows.length > 0) return res.status(409).json({ error: 'College code already exists' });

    const result = await pool.query(
      'INSERT INTO colleges (name, code, domain) VALUES ($1, $2, $3) RETURNING *',
      [name, code, domain]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'College code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/colleges/:collegeId/verify', async (req, res) => {
  const { collegeId } = req.params;
  const { official_code, verification_notes } = req.body;

  try {
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
    `, [finalCode, req.user.id, verification_notes || null, collegeId]);

    res.json({
      message: 'College institution verified and activated successfully',
      college: updateRes.rows[0]
    });
  } catch (error) {
    console.error('[colleges verify] error:', error);
    res.status(500).json({ error: 'Failed to verify college' });
  }
});

router.patch('/colleges/:collegeId', async (req, res) => {
  const { name, code, domain } = req.body;
  const { collegeId } = req.params;
  try {
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
  const { status } = req.body;
  const { collegeId } = req.params;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  try {
    const result = await pool.query(
      'UPDATE colleges SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, collegeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
  const { collegeId } = req.params;
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

  try {
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
  const { departmentId } = req.params;
  const { name, code } = req.body;
  try {
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
  const { collegeId } = req.params;
  const { department_id, name, academic_year } = req.body;
  if (!department_id || !name || !academic_year) return res.status(400).json({ error: 'Department, name, and academic year are required' });

  try {
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
  const { batchId } = req.params;
  const { name, academic_year, status } = req.body;
  try {
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
  const { collegeId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try {
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
  const { collegeId } = req.params;
  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });

  try {
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

export default router;
