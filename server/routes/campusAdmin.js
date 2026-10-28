import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { loadCampusContext, requireCampusUser, requireCampusRole } from '../middleware/campusAuth.js';
import { bulkProvisionUsers } from '../services/bulkProvisioningService.js';

const router = express.Router();
const pool = { query: db.query };

router.use(authenticateToken);
router.use(loadCampusContext);
router.use(requireCampusUser);
// Only allow COLLEGE_ADMIN for these endpoints
router.use(requireCampusRole('COLLEGE_ADMIN'));

// 2. COLLEGE ADMIN PROFILE / CONTEXT
router.get('/me', (req, res) => {
  const { campus_user_id, college_id, system_role, status } = req.campusContext;
  res.json({
    campus_user_id,
    user_id: req.user.id,
    college_id,
    role: system_role,
    status
  });
});

// 3. COLLEGE INFORMATION
router.get('/college', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const result = await pool.query('SELECT * FROM colleges WHERE id = $1', [collegeId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'College not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. DEPARTMENTS
router.get('/departments', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const result = await pool.query('SELECT * FROM departments WHERE college_id = $1 ORDER BY name', [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/departments', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

  try {
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
  const collegeId = req.campusContext.college_id;
  const { departmentId } = req.params;
  const { name, code } = req.body;
  
  try {
    const depRes = await pool.query('SELECT college_id FROM departments WHERE id = $1', [departmentId]);
    if (depRes.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    if (depRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Department belongs to another college' });

    const result = await pool.query(
      'UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code), updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, code, departmentId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Department code already exists in this college' });
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. BATCHES
router.get('/batches', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const result = await pool.query('SELECT * FROM batches WHERE college_id = $1 ORDER BY name', [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/batches', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { name, academic_year, department_id, status } = req.body;
  if (!name || !academic_year || !department_id) return res.status(400).json({ error: 'Name, academic year, and department ID are required' });

  try {
    const depRes = await pool.query('SELECT college_id FROM departments WHERE id = $1', [department_id]);
    if (depRes.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    if (depRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Department belongs to another college' });

    const result = await pool.query(
      'INSERT INTO batches (college_id, department_id, name, academic_year, status) VALUES ($1, $2, $3, $4, COALESCE($5, \'ACTIVE\')) RETURNING *',
      [collegeId, department_id, name, academic_year, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/batches/:batchId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { batchId } = req.params;
  const { name, academic_year, department_id, status } = req.body;

  try {
    const batchRes = await pool.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (batchRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });

    if (department_id) {
      const depRes = await pool.query('SELECT college_id FROM departments WHERE id = $1', [department_id]);
      if (depRes.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
      if (depRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Target department belongs to another college' });
    }

    const result = await pool.query(
      'UPDATE batches SET name = COALESCE($1, name), academic_year = COALESCE($2, academic_year), department_id = COALESCE($3, department_id), status = COALESCE($4, status), updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, academic_year, department_id, status, batchId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. TUTOR MANAGEMENT
router.get('/tutors', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const result = await pool.query(`
      SELECT cu.id as campus_user_id, cu.user_id, cu.system_role, cu.status, u.full_name, u.email 
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.college_id = $1 AND cu.system_role = 'TUTOR'
      ORDER BY u.full_name
    `, [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tutors', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const checkRes = await pool.query('SELECT id, system_role FROM campus_users WHERE user_id = $1 AND college_id = $2', [userId, collegeId]);
    if (checkRes.rows.length > 0) return res.status(409).json({ error: 'User already has a campus identity in this college' });

    const result = await pool.query(
      "INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR') RETURNING *",
      [userId, collegeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Duplicate campus user or constraint violation' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/tutors/:userId/status', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { userId } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const checkRes = await pool.query('SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2 AND system_role = \'TUTOR\'', [userId, collegeId]);
    if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Tutor not found in this college' });

    const result = await pool.query(
      'UPDATE campus_users SET status = $1, updated_at = NOW() WHERE user_id = $2 AND college_id = $3 AND system_role = \'TUTOR\' RETURNING *',
      [status, userId, collegeId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. TUTOR -> BATCH ASSIGNMENT
router.get('/batches/:batchId/tutors', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { batchId } = req.params;

  try {
    const batchRes = await pool.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (batchRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });

    const result = await pool.query(`
      SELECT bt.id, bt.batch_id, bt.tutor_user_id, bt.assigned_at, u.full_name, u.email
      FROM batch_tutors bt
      JOIN users u ON bt.tutor_user_id = u.id
      WHERE bt.batch_id = $1
    `, [batchId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/batches/:batchId/tutors', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { batchId } = req.params;
  const { tutorUserId } = req.body;

  if (!tutorUserId) return res.status(400).json({ error: 'Tutor user ID is required' });

  try {
    const batchRes = await pool.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (batchRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });

    const tutorRes = await pool.query(
      "SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2 AND system_role = 'TUTOR' AND status = 'ACTIVE'",
      [tutorUserId, collegeId]
    );
    if (tutorRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Tutor does not belong to this college or is inactive' });

    const checkAssignment = await pool.query('SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2', [batchId, tutorUserId]);
    if (checkAssignment.rows.length > 0) return res.status(409).json({ error: 'Tutor is already assigned to this batch' });

    const result = await pool.query(
      'INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2) RETURNING *',
      [batchId, tutorUserId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Duplicate assignment' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/batches/:batchId/tutors/:tutorUserId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { batchId, tutorUserId } = req.params;

  try {
    const batchRes = await pool.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (batchRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });

    const result = await pool.query(
      'DELETE FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2 RETURNING id',
      [batchId, tutorUserId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ success: true, message: 'Tutor removed from batch' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. STUDENT MANAGEMENT
router.get('/students', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  try {
    // Return students enrolled in any batch of this college
    const result = await pool.query(`
      SELECT DISTINCT se.student_user_id, u.full_name, u.email, cu.status
      FROM student_enrollments se
      JOIN batches b ON se.batch_id = b.id
      JOIN users u ON se.student_user_id = u.id
      JOIN campus_users cu ON cu.user_id = u.id AND cu.college_id = b.college_id AND cu.system_role = 'STUDENT'
      WHERE b.college_id = $1
      ORDER BY u.full_name
    `, [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/batches/:batchId/students', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { batchId } = req.params;
  const { studentUserId } = req.body;

  if (!studentUserId) return res.status(400).json({ error: 'Student user ID is required' });

  try {
    const batchRes = await pool.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (batchRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });

    const userRes = await pool.query('SELECT id FROM users WHERE id = $1', [studentUserId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Student user not found' });

    // Make sure user is a STUDENT in this college
    const cuRes = await pool.query(
      "SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2 AND system_role = 'STUDENT'",
      [studentUserId, collegeId]
    );
    if (cuRes.rows.length === 0) {
      // If the schema requires a STUDENT campus_users record, we create it here or fail if it's supposed to be manually managed.
      // Based on usual designs, the user needs to have the identity. Let's create it if missing, or we can just reject if not there.
      // Wait, Phase 5: "student must have appropriate STUDENT Campus identity if the current architecture requires it"
      // If we don't know, creating it if it doesn't exist is safe. But actually, "assigning student" usually involves creating the campus identity if they don't have one in that college.
      // Let's create the campus_user identity if not exists:
      const checkOtherRes = await pool.query('SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2', [studentUserId, collegeId]);
      if (checkOtherRes.rows.length > 0) {
        return res.status(409).json({ error: 'User already has a non-student campus identity in this college' });
      }
      await pool.query(
        "INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')",
        [studentUserId, collegeId]
      );
    }

    const checkEnrollment = await pool.query('SELECT id FROM student_enrollments WHERE batch_id = $1 AND student_user_id = $2', [batchId, studentUserId]);
    if (checkEnrollment.rows.length > 0) return res.status(409).json({ error: 'Student is already enrolled in this batch' });

    const result = await pool.query(
      'INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2) RETURNING *',
      [batchId, studentUserId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Duplicate enrollment or constraint violation' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/batches/:batchId/students/:studentUserId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { batchId, studentUserId } = req.params;

  try {
    const batchRes = await pool.query('SELECT college_id FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    if (batchRes.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Batch belongs to another college' });

    const result = await pool.query(
      'DELETE FROM student_enrollments WHERE batch_id = $1 AND student_user_id = $2 RETURNING id',
      [batchId, studentUserId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Enrollment not found' });
    res.json({ success: true, message: 'Student removed from batch' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. ROSTER & PENDING MEMBERSHIP MANAGEMENT (COLLEGE ADMIN)
router.get('/roster', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  try {
    const result = await pool.query(`
      SELECT * FROM college_approved_roster 
      WHERE college_id = $1 
      ORDER BY created_at DESC
    `, [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[GET admin roster] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/roster', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { institutional_email, full_name, role, department_code, academic_year, batch_id } = req.body;

  if (!institutional_email || !institutional_email.includes('@')) {
    return res.status(400).json({ error: 'Valid institutional email is required' });
  }

  try {
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
    console.error('[POST admin roster] error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/pending-members', async (req, res) => {
  const collegeId = req.campusContext.college_id;
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
        cu.created_at
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.college_id = $1 AND (cu.status = 'PENDING_VERIFICATION' OR cu.status = 'PENDING')
      ORDER BY cu.created_at DESC
    `, [collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[GET admin pending-members] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/pending-members/:campusUserId/approve', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { campusUserId } = req.params;
  try {
    const check = await pool.query('SELECT user_id, college_id FROM campus_users WHERE id = $1', [campusUserId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    if (check.rows[0].college_id !== collegeId) return res.status(403).json({ error: 'Forbidden: Member belongs to another college' });

    const updated = await pool.query(`
      UPDATE campus_users
      SET status = 'ACTIVE',
          verified_at = NOW(),
          verified_by = $1,
          verification_method = 'COLLEGE_ADMIN_MANUAL',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [req.user.id, campusUserId]);

    await pool.query(
      'UPDATE users SET college_email_verified = TRUE, college_email_verified_at = NOW() WHERE id = $1',
      [check.rows[0].user_id]
    );

    res.json({ message: 'Campus member approved and activated.', membership: updated.rows[0] });
  } catch (error) {
    console.error('[approve pending member] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. INSTITUTIONAL BULK PROVISIONING (STUDENTS & TEACHERS)
router.post('/bulk-provision', async (req, res) => {
  const collegeId = req.campusContext.college_id;
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
    console.error('[POST /bulk-provision] error:', error);
    res.status(500).json({ error: error.message || 'Bulk provisioning failed' });
  }
});

// 9. PROVISIONED CAMPUS DIRECTORY & CREDENTIALS EXPORT
router.get('/provisioned-directory', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  try {
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        cu.id as campus_user_id,
        u.full_name,
        u.email,
        cu.institutional_email,
        cu.system_role,
        cu.status as membership_status,
        cu.roll_number,
        u.must_change_password,
        d.name as department_name,
        d.code as department_code,
        b.name as batch_name,
        b.academic_year,
        cu.created_at
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      LEFT JOIN departments d ON cu.department_id = d.id
      LEFT JOIN student_enrollments se ON se.student_user_id = u.id AND cu.system_role = 'STUDENT'
      LEFT JOIN batch_tutors bt ON bt.tutor_user_id = u.id AND cu.system_role = 'TUTOR'
      LEFT JOIN batches b ON b.id = COALESCE(se.batch_id, bt.batch_id)
      WHERE cu.college_id = $1
      ORDER BY cu.system_role DESC, u.full_name ASC
    `, [collegeId]);

    res.json(result.rows);
  } catch (error) {
    console.error('[GET /provisioned-directory] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 10. RESET USER'S PASSWORD TO NEW TEMPORARY PASSWORD (BY COLLEGE ADMIN)
router.post('/users/:userId/reset-password', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const { userId } = req.params;
  const { temporary_password } = req.body;

  try {
    // Verify user belongs to this college
    const cuRes = await pool.query(
      'SELECT id, system_role FROM campus_users WHERE user_id = $1 AND college_id = $2',
      [userId, collegeId]
    );
    if (cuRes.rows.length === 0) {
      return res.status(404).json({ error: 'User does not belong to your college' });
    }

    const colRes = await pool.query('SELECT code FROM colleges WHERE id = $1', [collegeId]);
    const collegeCode = colRes.rows[0]?.code || 'COLLEGE';

    const newTempPassword = temporary_password && temporary_password.trim() 
      ? temporary_password.trim() 
      : `${collegeCode.toUpperCase()}@${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newTempPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    res.json({
      success: true,
      temporary_password: newTempPassword,
      message: 'Password reset successfully. The user must set a new personal password on their next login.'
    });
  } catch (error) {
    console.error('[POST /users/:userId/reset-password] error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
