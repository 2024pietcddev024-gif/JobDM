import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { loadCampusContext, requireCampusUser, requireCampusRole } from '../middleware/campusAuth.js';
import { completedInterviewsSql, avgInterviewScoreSql, COMPLETED_STATUS_FILTER } from '../services/interviewMetrics.js';

const router = express.Router();
const pool = { query: db.query };

router.use(authenticateToken);
router.use(loadCampusContext);
router.use(requireCampusUser);
router.use(requireCampusRole('TUTOR'));

// 1. TUTOR CONTEXT & PROFILE
router.get('/me', async (req, res) => {
  const { campus_user_id, college_id, system_role, status } = req.campusContext;
  
  try {
    const userRes = await pool.query(
      'SELECT id, full_name, email FROM users WHERE id = $1',
      [req.user.id]
    );

    const colRes = await pool.query(
      'SELECT name, code FROM colleges WHERE id = $1',
      [college_id]
    );

    const batchCountRes = await pool.query(
      'SELECT COUNT(*) as count FROM batch_tutors WHERE tutor_user_id = $1',
      [req.user.id]
    );
    const assigned_batch_count = parseInt(batchCountRes.rows[0].count, 10);

    const userRow = userRes.rows[0] || {};
    const colRow = colRes.rows[0] || {};

    res.json({
      campus_user_id,
      user_id: req.user.id,
      full_name: userRow.full_name,
      email: userRow.email,
      college_id,
      college_name: colRow.name || 'JobDM University',
      college_code: colRow.code || 'JOBDM-UNI',
      role: system_role,
      status,
      assigned_batch_count
    });
  } catch (error) {
    console.error('[TUTOR /me] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. TUTOR PROFILE UPDATE
router.put('/profile', async (req, res) => {
  const { full_name } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    const updated = await pool.query(
      'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email',
      [full_name.trim(), req.user.id]
    );
    res.json({ message: 'Profile updated successfully', user: updated.rows[0] });
  } catch (error) {
    console.error('[TUTOR update profile] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. ASSIGNED BATCHES LIST
router.get('/batches', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT 
        b.id, 
        b.name, 
        b.academic_year, 
        b.status, 
        b.created_at,
        d.name as department_name,
        d.code as department_code,
        (SELECT COUNT(DISTINCT student_user_id) FROM student_enrollments WHERE batch_id = b.id AND status = 'ACTIVE') as student_count
      FROM batches b
      JOIN batch_tutors bt ON b.id = bt.batch_id
      JOIN departments d ON b.department_id = d.id
      WHERE bt.tutor_user_id = $1 AND b.college_id = $2
      ORDER BY b.created_at DESC
    `, [tutorId, collegeId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[TUTOR /batches] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. CREATE NEW BATCH (TEACHER WORKFLOW)
router.post('/batches', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { name, academic_year, department_id } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Batch name is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let resolvedDeptId = department_id;
    if (!resolvedDeptId) {
      // Find existing department or create a default one
      const deptRes = await client.query(
        'SELECT id FROM departments WHERE college_id = $1 LIMIT 1',
        [collegeId]
      );
      if (deptRes.rows.length > 0) {
        resolvedDeptId = deptRes.rows[0].id;
      } else {
        const newDept = await client.query(`
          INSERT INTO departments (college_id, name, code)
          VALUES ($1, 'Computer Science & Engineering', 'CSE')
          RETURNING id
        `, [collegeId]);
        resolvedDeptId = newDept.rows[0].id;
      }
    }

    const year = academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const batchRes = await client.query(`
      INSERT INTO batches (college_id, department_id, name, academic_year, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING *
    `, [collegeId, resolvedDeptId, name.trim(), year]);
    const newBatch = batchRes.rows[0];

    // Assign tutor to batch
    await client.query(`
      INSERT INTO batch_tutors (batch_id, tutor_user_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [newBatch.id, tutorId]);

    await client.query('COMMIT');

    // Fetch complete batch row with department info
    const completeBatch = await pool.query(`
      SELECT b.*, d.name as department_name, 0 as student_count
      FROM batches b
      JOIN departments d ON b.department_id = d.id
      WHERE b.id = $1
    `, [newBatch.id]);

    res.status(201).json(completeBatch.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[TUTOR create batch] error:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  } finally {
    client.release();
  }
});

// 5. UPDATE BATCH
router.patch('/batches/:batchId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batchId } = req.params;
  const { name, academic_year, status } = req.body;

  try {
    // Verify tutor assignment
    const assignRes = await pool.query(
      'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
      [batchId, tutorId]
    );
    if (assignRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });

    const updated = await pool.query(`
      UPDATE batches
      SET name = COALESCE($1, name),
          academic_year = COALESCE($2, academic_year),
          status = COALESCE($3, status),
          updated_at = NOW()
      WHERE id = $4 AND college_id = $5
      RETURNING *
    `, [name, academic_year, status, batchId, collegeId]);

    if (updated.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[TUTOR patch batch] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. DELETE / ARCHIVE BATCH
router.delete('/batches/:batchId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batchId } = req.params;

  try {
    const assignRes = await pool.query(
      'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
      [batchId, tutorId]
    );
    if (assignRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });

    // Safely remove assignment or delete batch if no student enrollments
    const enrollCountRes = await pool.query(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE batch_id = $1',
      [batchId]
    );
    const count = parseInt(enrollCountRes.rows[0].count, 10);

    if (count > 0) {
      // Archive instead of hard delete to preserve historical student records
      await pool.query("UPDATE batches SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1", [batchId]);
      return res.json({ message: 'Batch has active student records and was archived.' });
    }

    await pool.query('DELETE FROM batch_tutors WHERE batch_id = $1', [batchId]);
    await pool.query('DELETE FROM batches WHERE id = $1 AND college_id = $2', [batchId, collegeId]);
    res.json({ message: 'Batch deleted successfully.' });
  } catch (error) {
    console.error('[TUTOR delete batch] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. SINGLE BATCH DETAILS
router.get('/batches/:batchId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batchId } = req.params;

  try {
    const assignRes = await pool.query(
      'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
      [batchId, tutorId]
    );
    if (assignRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });

    const result = await pool.query(`
      SELECT b.id, b.name, b.academic_year, b.status, d.name as department_name 
      FROM batches b
      JOIN departments d ON b.department_id = d.id
      WHERE b.id = $1 AND b.college_id = $2
    `, [batchId, collegeId]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[TUTOR get batch] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. BATCH STUDENTS
router.get('/batches/:batchId/students', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batchId } = req.params;

  try {
    const assignRes = await pool.query(
      'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
      [batchId, tutorId]
    );
    if (assignRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });

    const result = await pool.query(`
      SELECT 
        u.id as user_id, 
        u.full_name, 
        u.email, 
        u.college_email,
        u.personal_email,
        u.account_lifecycle_status,
        se.enrolled_at, 
        se.status as enrollment_status,
        cu.status as campus_status,
        ${completedInterviewsSql('u.id')} as interview_count,
        ${avgInterviewScoreSql('u.id')} as avg_score,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved') as coding_solved
      FROM student_enrollments se
      JOIN users u ON se.student_user_id = u.id
      JOIN campus_users cu ON u.id = cu.user_id AND cu.system_role = 'STUDENT' AND cu.college_id = $1
      WHERE se.batch_id = $2
      ORDER BY u.full_name
    `, [collegeId, batchId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[TUTOR get batch students] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 9. ENROLL STUDENT INTO BATCH
router.post('/batches/:batchId/students', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batchId } = req.params;
  const { email, student_id } = req.body;

  if (!email && !student_id) {
    return res.status(400).json({ error: 'Student email or ID is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verify tutor assignment
    const assignRes = await client.query(
      'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
      [batchId, tutorId]
    );
    if (assignRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });
    }

    // Find student
    let studentUser = null;
    if (student_id) {
      const uRes = await client.query('SELECT id, full_name, email FROM users WHERE id = $1', [student_id]);
      if (uRes.rows.length > 0) studentUser = uRes.rows[0];
    } else if (email) {
      const uRes = await client.query('SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      if (uRes.rows.length > 0) studentUser = uRes.rows[0];
    }

    if (!studentUser) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found in the platform. Please verify the email.' });
    }

    // Ensure student has campus_users record for this college
    await client.query(`
      INSERT INTO campus_users (user_id, college_id, system_role, status)
      VALUES ($1, $2, 'STUDENT', 'ACTIVE')
      ON CONFLICT (user_id, college_id) DO NOTHING
    `, [studentUser.id, collegeId]);

    // Insert student enrollment
    const enrollRes = await client.query(`
      INSERT INTO student_enrollments (student_user_id, batch_id, status)
      VALUES ($1, $2, 'ACTIVE')
      ON CONFLICT (student_user_id, batch_id) 
      DO UPDATE SET status = 'ACTIVE'
      RETURNING *
    `, [studentUser.id, batchId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Student successfully enrolled in batch',
      student: studentUser,
      enrollment: enrollRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[TUTOR enroll student] error:', error);
    res.status(500).json({ error: error.message || 'Failed to enroll student' });
  } finally {
    client.release();
  }
});

// 10. REMOVE STUDENT FROM BATCH
router.delete('/batches/:batchId/students/:studentId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batchId, studentId } = req.params;

  try {
    const assignRes = await pool.query(
      'SELECT id FROM batch_tutors WHERE batch_id = $1 AND tutor_user_id = $2',
      [batchId, tutorId]
    );
    if (assignRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });

    await pool.query(
      'DELETE FROM student_enrollments WHERE batch_id = $1 AND student_user_id = $2',
      [batchId, studentId]
    );
    res.json({ message: 'Student removed from batch successfully' });
  } catch (error) {
    console.error('[TUTOR remove student] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 10B. ALL STUDENTS ACROSS TUTOR'S BATCHES
router.get('/students', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { batch_id, search } = req.query;

  try {
    let query = `
      SELECT DISTINCT ON (u.id)
        u.id as user_id, 
        u.full_name, 
        u.email, 
        u.college_email,
        u.personal_email,
        u.account_lifecycle_status,
        u.target_role,
        u.target_level,
        b.id as batch_id,
        b.name as batch_name,
        se.enrolled_at, 
        se.status as enrollment_status,
        cu.status as campus_status,
        ${completedInterviewsSql('u.id')} as interview_count,
        ${avgInterviewScoreSql('u.id')} as avg_score,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved') as coding_solved
      FROM student_enrollments se
      JOIN batches b ON se.batch_id = b.id
      JOIN batch_tutors bt ON b.id = bt.batch_id
      JOIN users u ON se.student_user_id = u.id
      JOIN campus_users cu ON u.id = cu.user_id AND cu.system_role = 'STUDENT' AND cu.college_id = $1
      WHERE bt.tutor_user_id = $2 AND b.college_id = $1
    `;
    const params = [collegeId, tutorId];
    let idx = 3;

    if (batch_id && batch_id !== 'all') {
      query += ` AND b.id = $${idx++}`;
      params.push(batch_id);
    }

    if (search) {
      query += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY u.id, se.enrolled_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[TUTOR get all students] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 11. SINGLE STUDENT DETAILS
router.get('/students/:studentId', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { studentId } = req.params;

  try {
    const studentRes = await pool.query(`
      SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2 AND system_role = 'STUDENT'
    `, [studentId, collegeId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found in your college' });

    const shareRes = await pool.query(`
      SELECT 1 FROM student_enrollments se
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
      LIMIT 1
    `, [studentId, tutorId]);
    if (shareRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Student is not in any of your assigned batches' });

    const result = await pool.query(`
      SELECT u.id as user_id, u.full_name, u.email, u.target_role, u.target_level, cu.status as campus_status
      FROM users u
      JOIN campus_users cu ON u.id = cu.user_id AND cu.college_id = $1 AND cu.system_role = 'STUDENT'
      WHERE u.id = $2
    `, [collegeId, studentId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[TUTOR get student] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 12. STUDENT BATCH MEMBERSHIP
router.get('/students/:studentId/batches', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  const tutorId = req.user.id;
  const { studentId } = req.params;

  try {
    const result = await pool.query(`
      SELECT b.id, b.name, b.academic_year
      FROM batches b
      JOIN batch_tutors bt ON b.id = bt.batch_id
      JOIN student_enrollments se ON b.id = se.batch_id
      WHERE bt.tutor_user_id = $1 AND se.student_user_id = $2 AND b.college_id = $3
      ORDER BY b.name
    `, [tutorId, studentId, collegeId]);

    res.json(result.rows);
  } catch (error) {
    console.error('[TUTOR student batches] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 13. STUDENT INTERVIEWS LIST
// 13. STUDENT INTERVIEWS LIST (INCLUDING TERMINATED SESSIONS FOR ANTI-CHEATING AUDIT)
router.get('/students/:studentId/interviews', async (req, res) => {
  const tutorId = req.user.id;
  const { studentId } = req.params;

  try {
    // Verify tutor shares batch
    const shareRes = await pool.query(`
      SELECT 1 FROM student_enrollments se
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
      LIMIT 1
    `, [studentId, tutorId]);
    if (shareRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Student not in any of your assigned batches' });

    const intRes = await pool.query(`
      SELECT id, category, role, difficulty, mode, overall_score, duration_minutes, created_at, summary, status,
             tab_switch_count, clipboard_violation_count, termination_reason, terminated_at,
             (
               SELECT json_agg(json_build_object(
                 'id', sv.id,
                 'violation_type', sv.violation_type,
                 'violation_count', sv.violation_count,
                 'created_at', sv.created_at
               ) ORDER BY sv.created_at ASC)
               FROM session_violations sv
               WHERE sv.session_id = interview_sessions.id::text AND sv.session_type = 'INTERVIEW'
             ) as violations
      FROM interview_sessions
      WHERE user_id = $1 AND (status = 'COMPLETED' OR status = 'TERMINATED')
      ORDER BY created_at DESC
    `, [studentId]);

    res.json(intRes.rows);
  } catch (error) {
    console.error('[TUTOR student interviews] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 14. DETAILED INTERVIEW REPORT (STEP 7 IN TEACHER PROTOTYPE)
router.get('/students/:studentId/interviews/:sessionId', async (req, res) => {
  const tutorId = req.user.id;
  const { studentId, sessionId } = req.params;

  try {
    // Verify tutor shares batch with student
    const shareRes = await pool.query(`
      SELECT 1 FROM student_enrollments se
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
      LIMIT 1
    `, [studentId, tutorId]);
    if (shareRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Access denied to student reports' });

    // Fetch session
    const sessionRes = await pool.query(`
      SELECT iss.*, u.full_name as student_name, u.email as student_email
      FROM interview_sessions iss
      JOIN users u ON iss.user_id = u.id
      WHERE iss.id = $1 AND iss.user_id = $2
    `, [sessionId, studentId]);

    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Interview report not found' });
    const session = sessionRes.rows[0];

    // Fetch questions, answers, and scores
    const qaRes = await pool.query(`
      SELECT 
        q.id as question_id,
        q.question_text,
        q.question_type,
        q.topics,
        a.id as answer_id,
        a.transcript,
        a.wpm,
        a.filler_words_count,
        a.eye_contact_score,
        s.accuracy_score,
        s.communication_score,
        s.confidence_score,
        s.depth_score,
        s.overall_score as answer_score,
        s.strengths,
        s.improvements,
        s.detailed_feedback
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      LEFT JOIN scores s ON a.id = s.answer_id
      WHERE q.session_id = $1
      ORDER BY q.created_at ASC
    `, [sessionId]);

    // Fetch violation history for this interview session
    const violationsRes = await pool.query(`
      SELECT id, violation_type, violation_count, details, created_at
      FROM session_violations
      WHERE session_id = $1 AND session_type = 'INTERVIEW'
      ORDER BY created_at ASC
    `, [sessionId]);

    res.json({
      session,
      questions: qaRes.rows,
      violations: violationsRes.rows
    });
  } catch (error) {
    console.error('[TUTOR get interview report] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 14B. STUDENT CODING PRACTICE HISTORY FOR TEACHER
router.get('/students/:studentId/coding', async (req, res) => {
  const tutorId = req.user.id;
  const { studentId } = req.params;

  try {
    // Verify tutor shares batch with student
    const shareRes = await pool.query(`
      SELECT 1 FROM student_enrollments se
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
      LIMIT 1
    `, [studentId, tutorId]);
    if (shareRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Student not in any of your assigned batches' });

    const result = await pool.query(`
      SELECT 
        cs.id as session_id,
        cs.problem_id,
        cp.title as problem_name,
        cp.topic,
        cp.difficulty,
        cs.language,
        cs.status as session_status,
        cs.tab_switch_count,
        cs.clipboard_violation_count,
        cs.termination_reason,
        cs.terminated_at,
        cs.created_at,
        (
          SELECT json_agg(json_build_object(
            'id', sv.id,
            'violation_type', sv.violation_type,
            'violation_count', sv.violation_count,
            'created_at', sv.created_at
          ) ORDER BY sv.created_at ASC)
          FROM session_violations sv
          WHERE sv.session_id = cs.id::text AND sv.session_type = 'CODING'
        ) as violations,
        (
          SELECT json_agg(json_build_object(
            'id', ca.id,
            'language', ca.language,
            'code_content', ca.code_content,
            'status', ca.status,
            'created_at', ca.created_at
          ) ORDER BY ca.created_at DESC)
          FROM coding_attempts ca
          WHERE ca.session_id = cs.id OR (ca.user_id = cs.user_id AND ca.problem_id = cs.problem_id AND ca.created_at >= cs.created_at)
        ) as attempts
      FROM coding_sessions cs
      LEFT JOIN coding_problems cp ON cs.problem_id = cp.id
      WHERE cs.user_id = $1
      ORDER BY cs.created_at DESC
    `, [studentId]);

    res.json(result.rows);
  } catch (error) {
    console.error('[TUTOR get student coding] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 15. TEACHER-INITIATED / ASSIGNED MOCK INTERVIEW (STEP 6 IN TEACHER PROTOTYPE)
router.post('/students/:studentId/assign-interview', async (req, res) => {
  const tutorId = req.user.id;
  const { studentId } = req.params;
  const { category, difficulty, role, mode } = req.body;

  try {
    const shareRes = await pool.query(`
      SELECT 1 FROM student_enrollments se
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2
      LIMIT 1
    `, [studentId, tutorId]);
    if (shareRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden: Student not in any of your assigned batches' });

    const newSession = await pool.query(`
      INSERT INTO interview_sessions (
        user_id, category, role, difficulty, mode, assigned_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      studentId, 
      category || 'Technical', 
      role || 'Software Engineer', 
      difficulty || 'Medium', 
      mode || 'voice', 
      tutorId
    ]);

    res.status(201).json({
      message: 'Mock interview successfully initiated for student.',
      session: newSession.rows[0]
    });
  } catch (error) {
    console.error('[TUTOR assign interview] error:', error);
    res.status(500).json({ error: 'Failed to assign interview' });
  }
});

export default router;
