import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { loadCampusContext, requireCampusUser, requireCampusRole } from '../middleware/campusAuth.js';
import { COMPLETED_STATUS_FILTER } from '../services/interviewMetrics.js';

const router = express.Router();
const pool = { query: db.query };

router.use(authenticateToken);
router.use(loadCampusContext);
router.use(requireCampusUser);
router.use(requireCampusRole('COLLEGE_ADMIN'));

// Shared CTE/Subquery generator for all students in the college
const getCollegeStudentsSubquery = `
  SELECT DISTINCT se.student_user_id 
  FROM student_enrollments se 
  JOIN batches b ON se.batch_id = b.id
  WHERE b.college_id = $1
`;

// 1. College Overview
router.get('/overview', async (req, res) => {
  const collegeId = req.campusContext.college_id;
  
  try {
    const cRes = await pool.query(`SELECT id, name, code FROM colleges WHERE id = $1`, [collegeId]);
    if (cRes.rows.length === 0) return res.status(404).json({ error: 'College not found' });

    const dRes = await pool.query(`SELECT COUNT(*) as count FROM departments WHERE college_id = $1`, [collegeId]);
    const bRes = await pool.query(`SELECT COUNT(*) as count FROM batches WHERE college_id = $1`, [collegeId]);
    const tRes = await pool.query(`SELECT COUNT(*) as count FROM campus_users WHERE college_id = $1 AND system_role = 'TUTOR'`, [collegeId]);
    const sRes = await pool.query(`
      SELECT COUNT(DISTINCT se.student_user_id) as count 
      FROM student_enrollments se 
      JOIN batches b ON b.id = se.batch_id 
      WHERE b.college_id = $1
    `, [collegeId]);

    const activeRes = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.id IN (${getCollegeStudentsSubquery})
      AND (
        EXISTS (SELECT 1 FROM coding_attempts ca WHERE ca.user_id = u.id AND ca.created_at >= NOW() - INTERVAL '7 DAYS') OR
        EXISTS (SELECT 1 FROM interview_sessions iss WHERE iss.user_id = u.id AND iss.created_at >= NOW() - INTERVAL '7 DAYS') OR
        EXISTS (SELECT 1 FROM aptitude_sessions aps WHERE aps.user_id = u.id AND aps.created_at >= NOW() - INTERVAL '7 DAYS')
      )
    `, [collegeId]);

    const interviewsRes = await pool.query(`
      SELECT COUNT(*) as total, ROUND(AVG(overall_score)::numeric, 1) as avg_score 
      FROM interview_sessions 
      WHERE user_id IN (${getCollegeStudentsSubquery}) AND ${COMPLETED_STATUS_FILTER}
    `, [collegeId]);

    const codingRes = await pool.query(`
      SELECT COUNT(DISTINCT (user_id, problem_id)) as total 
      FROM coding_attempts 
      WHERE status = 'solved' AND user_id IN (${getCollegeStudentsSubquery})
    `, [collegeId]);

    const dailyRes = await pool.query(`
      WITH daily_solves AS (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_today
        FROM coding_attempts
        WHERE status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date
        AND user_id IN (${getCollegeStudentsSubquery})
        GROUP BY user_id
      )
      SELECT COUNT(*) as count FROM daily_solves WHERE solved_today >= 20
    `, [collegeId]);

    const totalStudents = parseInt(sRes.rows[0].count, 10);
    const completedStudents = parseInt(dailyRes.rows[0].count, 10);
    
    res.json({
      college: cRes.rows[0],
      departments: parseInt(dRes.rows[0].count, 10),
      batches: parseInt(bRes.rows[0].count, 10),
      tutors: parseInt(tRes.rows[0].count, 10),
      students: totalStudents,
      activeStudents: parseInt(activeRes.rows[0].count, 10),
      interviews: {
        total: parseInt(interviewsRes.rows[0].total, 10),
        averageScore: interviewsRes.rows[0].avg_score ? parseFloat(interviewsRes.rows[0].avg_score) : null
      },
      coding: {
        totalSolved: parseInt(codingRes.rows[0].total, 10)
      },
      dailyTask: {
        completedStudents: completedStudents,
        eligibleStudents: totalStudents,
        completionRate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Department Analytics
router.get('/departments', async (req, res) => {
  const collegeId = req.campusContext.college_id;

  try {
    const depsRes = await pool.query(`
      WITH dept_students AS (
        SELECT d.id as dept_id, se.student_user_id as student_id
        FROM departments d
        LEFT JOIN batches b ON d.id = b.department_id
        LEFT JOIN student_enrollments se ON b.id = se.batch_id
        WHERE d.college_id = $1
      )
      SELECT 
        d.id as department_id, 
        d.name as department,
        (SELECT COUNT(*) FROM batches b WHERE b.department_id = d.id) as batches,
        (SELECT COUNT(DISTINCT student_id) FROM dept_students ds WHERE ds.dept_id = d.id) as students,
        (SELECT COUNT(DISTINCT u.id) FROM users u JOIN dept_students ds ON u.id = ds.student_id WHERE ds.dept_id = d.id AND (
           EXISTS (SELECT 1 FROM coding_attempts ca WHERE ca.user_id = u.id AND ca.created_at >= NOW() - INTERVAL '7 DAYS') OR
           EXISTS (SELECT 1 FROM interview_sessions iss WHERE iss.user_id = u.id AND iss.created_at >= NOW() - INTERVAL '7 DAYS')
        )) as active_students,
        (SELECT COUNT(*) FROM interview_sessions iss WHERE iss.user_id IN (SELECT student_id FROM dept_students ds WHERE ds.dept_id = d.id) AND iss.${COMPLETED_STATUS_FILTER}) as interviews,
        (SELECT ROUND(AVG(overall_score)::numeric, 1) FROM interview_sessions iss WHERE iss.user_id IN (SELECT student_id FROM dept_students ds WHERE ds.dept_id = d.id) AND iss.${COMPLETED_STATUS_FILTER}) as avg_score,
        (SELECT COUNT(DISTINCT (user_id, problem_id)) FROM coding_attempts ca WHERE ca.status = 'solved' AND ca.user_id IN (SELECT student_id FROM dept_students ds WHERE ds.dept_id = d.id)) as coding_solved
      FROM departments d
      WHERE d.college_id = $1
    `, [collegeId]);

    const mapped = depsRes.rows.map(r => ({
      departmentId: r.department_id,
      department: r.department,
      batches: parseInt(r.batches, 10),
      students: parseInt(r.students, 10),
      activeStudents: parseInt(r.active_students, 10),
      interviews: parseInt(r.interviews, 10),
      averageInterviewScore: r.avg_score ? parseFloat(r.avg_score) : null,
      codingSolved: parseInt(r.coding_solved, 10)
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Batch Analytics
router.get('/batches', async (req, res) => {
  const collegeId = req.campusContext.college_id;

  try {
    const batchesRes = await pool.query(`
      WITH batch_students AS (
        SELECT b.id as batch_id, se.student_user_id as student_id
        FROM batches b
        LEFT JOIN student_enrollments se ON b.id = se.batch_id
        WHERE b.college_id = $1
      )
      SELECT 
        b.id as batch_id, 
        b.name as batch_name,
        b.academic_year,
        d.name as department,
        (SELECT COUNT(DISTINCT student_id) FROM batch_students bs WHERE bs.batch_id = b.id) as students,
        (SELECT COUNT(DISTINCT u.id) FROM users u JOIN batch_students bs ON u.id = bs.student_id WHERE bs.batch_id = b.id AND (
           EXISTS (SELECT 1 FROM coding_attempts ca WHERE ca.user_id = u.id AND ca.created_at >= NOW() - INTERVAL '7 DAYS') OR
           EXISTS (SELECT 1 FROM interview_sessions iss WHERE iss.user_id = u.id AND iss.created_at >= NOW() - INTERVAL '7 DAYS')
        )) as active_students,
        (SELECT COUNT(*) FROM interview_sessions iss WHERE iss.user_id IN (SELECT student_id FROM batch_students bs WHERE bs.batch_id = b.id) AND iss.${COMPLETED_STATUS_FILTER}) as interviews,
        (SELECT ROUND(AVG(overall_score)::numeric, 1) FROM interview_sessions iss WHERE iss.user_id IN (SELECT student_id FROM batch_students bs WHERE bs.batch_id = b.id) AND iss.${COMPLETED_STATUS_FILTER}) as avg_score,
        (SELECT COUNT(DISTINCT (user_id, problem_id)) FROM coding_attempts ca WHERE ca.status = 'solved' AND ca.user_id IN (SELECT student_id FROM batch_students bs WHERE bs.batch_id = b.id)) as coding_solved,
        (SELECT COUNT(*) FROM (
          SELECT user_id FROM coding_attempts WHERE status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date AND user_id IN (SELECT student_id FROM batch_students bs WHERE bs.batch_id = b.id)
          GROUP BY user_id HAVING COUNT(DISTINCT problem_id) >= 20
        ) ds) as completed_daily_task
      FROM batches b
      JOIN departments d ON b.department_id = d.id
      WHERE b.college_id = $1
    `, [collegeId]);

    const mapped = batchesRes.rows.map(r => {
      const studentCount = parseInt(r.students, 10);
      const completedDaily = parseInt(r.completed_daily_task, 10);
      return {
        batchId: r.batch_id,
        batchName: r.batch_name,
        academicYear: r.academic_year,
        department: r.department,
        students: studentCount,
        activeStudents: parseInt(r.active_students, 10),
        interviews: parseInt(r.interviews, 10),
        averageInterviewScore: r.avg_score ? parseFloat(r.avg_score) : null,
        codingSolved: parseInt(r.coding_solved, 10),
        dailyTaskCompletionRate: studentCount > 0 ? (completedDaily / studentCount) * 100 : 0
      };
    });
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. Tutor Analytics
router.get('/tutors', async (req, res) => {
  const collegeId = req.campusContext.college_id;

  try {
    const tutorsRes = await pool.query(`
      WITH tutor_students AS (
        SELECT bt.tutor_user_id as tutor_id, se.student_user_id as student_id
        FROM batch_tutors bt
        JOIN batches b ON bt.batch_id = b.id
        JOIN student_enrollments se ON b.id = se.batch_id
        WHERE b.college_id = $1
      )
      SELECT 
        u.id as tutor_id,
        u.full_name as name,
        u.email,
        (SELECT COUNT(*) FROM batch_tutors bt JOIN batches b ON bt.batch_id = b.id WHERE bt.tutor_user_id = u.id AND b.college_id = $1) as assigned_batches,
        (SELECT COUNT(DISTINCT student_id) FROM tutor_students ts WHERE ts.tutor_id = u.id) as assigned_students,
        (SELECT COUNT(*) FROM interview_sessions iss WHERE iss.user_id IN (SELECT student_id FROM tutor_students ts WHERE ts.tutor_id = u.id) AND iss.${COMPLETED_STATUS_FILTER}) as student_interviews,
        (SELECT ROUND(AVG(overall_score)::numeric, 1) FROM interview_sessions iss WHERE iss.user_id IN (SELECT student_id FROM tutor_students ts WHERE ts.tutor_id = u.id) AND iss.${COMPLETED_STATUS_FILTER}) as average_student_interview_score,
        (SELECT COUNT(DISTINCT (user_id, problem_id)) FROM coding_attempts ca WHERE ca.status = 'solved' AND ca.user_id IN (SELECT student_id FROM tutor_students ts WHERE ts.tutor_id = u.id)) as coding_solved_by_students
      FROM campus_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.college_id = $1 AND cu.system_role = 'TUTOR'
    `, [collegeId]);

    const mapped = tutorsRes.rows.map(r => ({
      tutorId: r.tutor_id,
      name: r.name,
      email: r.email,
      assignedBatches: parseInt(r.assigned_batches, 10),
      assignedStudents: parseInt(r.assigned_students, 10),
      studentInterviews: parseInt(r.student_interviews, 10),
      averageStudentInterviewScore: r.average_student_interview_score ? parseFloat(r.average_student_interview_score) : null,
      codingSolvedByStudents: parseInt(r.coding_solved_by_students, 10)
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. Student Analytics
router.get('/students', async (req, res) => {
  const collegeId = req.campusContext.college_id;

  try {
    const studentsRes = await pool.query(`
      SELECT 
        u.id as student_id,
        u.full_name as name,
        u.email,
        d.name as department,
        b.name as batch,
        (SELECT COUNT(*) FROM interview_sessions WHERE user_id = u.id AND ${COMPLETED_STATUS_FILTER}) as interviews,
        (SELECT ROUND(AVG(overall_score)::numeric, 1) FROM interview_sessions WHERE user_id = u.id AND ${COMPLETED_STATUS_FILTER}) as average_interview_score,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved') as coding_solved,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date) as daily_solved,
        (SELECT MAX(created_at) FROM (
          SELECT created_at FROM coding_attempts WHERE user_id = u.id
          UNION ALL
          SELECT created_at FROM interview_sessions WHERE user_id = u.id
        ) acts) as last_activity_at
      FROM student_enrollments se
      JOIN batches b ON se.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
      JOIN users u ON se.student_user_id = u.id
      WHERE b.college_id = $1
    `, [collegeId]);

    const mapped = studentsRes.rows.map(r => ({
      studentId: r.student_id,
      name: r.name,
      email: r.email,
      department: r.department,
      batch: r.batch,
      interviews: parseInt(r.interviews, 10),
      averageInterviewScore: r.average_interview_score ? parseFloat(r.average_interview_score) : null,
      codingSolved: parseInt(r.coding_solved, 10),
      dailyTaskCompleted: parseInt(r.daily_solved, 10) >= 20,
      lastActivityAt: r.last_activity_at
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Student Detail Analytics
router.get('/students/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const collegeId = req.campusContext.college_id;

  try {
    const isAuthorizedRes = await pool.query(`
      SELECT b.name as batch_name, d.name as dept_name 
      FROM student_enrollments se 
      JOIN batches b ON se.batch_id = b.id
      JOIN departments d ON b.department_id = d.id
      WHERE se.student_user_id = $1 AND b.college_id = $2 LIMIT 1
    `, [studentId, collegeId]);
    
    if (isAuthorizedRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });

    const uRes = await pool.query(`SELECT id, full_name, email FROM users WHERE id = $1`, [studentId]);
    
    const iRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ${COMPLETED_STATUS_FILTER})::int as total, 
        ROUND(AVG(overall_score) FILTER (WHERE ${COMPLETED_STATUS_FILTER})::numeric, 1) as avg_score, 
        MAX(overall_score) FILTER (WHERE ${COMPLETED_STATUS_FILTER}) as best_score, 
        MAX(created_at) as last_at
      FROM interview_sessions WHERE user_id = $1
    `, [studentId]);

    const cRes = await pool.query(`
      SELECT COUNT(DISTINCT problem_id) as total, MAX(created_at) as last_at
      FROM coding_attempts WHERE user_id = $1 AND status = 'solved'
    `, [studentId]);

    const cRecentRes = await pool.query(`
      SELECT COUNT(DISTINCT problem_id) as total FROM coding_attempts 
      WHERE user_id = $1 AND status = 'solved' AND created_at >= NOW() - INTERVAL '7 DAYS'
    `, [studentId]);

    const dailyRes = await pool.query(`
      SELECT COUNT(DISTINCT problem_id) as count FROM coding_attempts 
      WHERE user_id = $1 AND status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date
    `, [studentId]);

    const actRes = await pool.query(`
      SELECT MAX(created_at) as last_at FROM (
        SELECT created_at FROM coding_attempts WHERE user_id = $1
        UNION ALL
        SELECT created_at FROM interview_sessions WHERE user_id = $1
      ) acts
    `, [studentId]);

    res.json({
      student: { id: uRes.rows[0].id, name: uRes.rows[0].full_name, email: uRes.rows[0].email },
      academic: { department: isAuthorizedRes.rows[0].dept_name, batch: isAuthorizedRes.rows[0].batch_name },
      interviews: {
        total: parseInt(iRes.rows[0].total, 10),
        averageScore: iRes.rows[0].avg_score ? parseFloat(iRes.rows[0].avg_score) : null,
        bestScore: iRes.rows[0].best_score ? parseFloat(iRes.rows[0].best_score) : null,
        lastInterviewAt: iRes.rows[0].last_at
      },
      coding: {
        totalSolved: parseInt(cRes.rows[0].total, 10),
        recentSolved: parseInt(cRecentRes.rows[0].total, 10),
        lastSolvedAt: cRes.rows[0].last_at
      },
      dailyTask: {
        solvedToday: parseInt(dailyRes.rows[0].count, 10),
        goal: 20,
        completed: parseInt(dailyRes.rows[0].count, 10) >= 20
      },
      activity: {
        lastActivityAt: actRes.rows[0].last_at
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. Recent College Activity
router.get('/activity', async (req, res) => {
  const collegeId = req.campusContext.college_id;

  try {
    const activityRes = await pool.query(`
      SELECT 'INTERVIEW' as type, u.full_name as "studentName", category || ' Interview' as title, iss.created_at as timestamp, overall_score as score
      FROM interview_sessions iss JOIN users u ON iss.user_id = u.id WHERE iss.user_id IN (${getCollegeStudentsSubquery}) AND iss.${COMPLETED_STATUS_FILTER}
      UNION ALL
      SELECT 'CODING' as type, u.full_name as "studentName", 'Solved Problem: ' || problem_id as title, ca.created_at as timestamp, NULL as score
      FROM coding_attempts ca JOIN users u ON ca.user_id = u.id WHERE ca.status = 'solved' AND ca.user_id IN (${getCollegeStudentsSubquery})
      UNION ALL
      SELECT 'APTITUDE' as type, u.full_name as "studentName", category || ' Aptitude' as title, aps.created_at as timestamp, score as score
      FROM aptitude_sessions aps JOIN users u ON aps.user_id = u.id WHERE aps.is_completed = true AND aps.user_id IN (${getCollegeStudentsSubquery})
      ORDER BY timestamp DESC
      LIMIT 30
    `, [collegeId]);

    res.json(activityRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. Domain Analytics
router.get('/domains', async (req, res) => {
  const collegeId = req.campusContext.college_id;

  try {
    const domainsRes = await pool.query(`
      SELECT category as domain, 
             COUNT(DISTINCT user_id) as students, 
             COUNT(*) as interviews, 
             ROUND(AVG(overall_score)::numeric, 1) as avg_score
      FROM interview_sessions
      WHERE category IS NOT NULL AND ${COMPLETED_STATUS_FILTER} AND user_id IN (${getCollegeStudentsSubquery})
      GROUP BY category
      ORDER BY interviews DESC
    `, [collegeId]);

    const mapped = domainsRes.rows.map(r => ({
      domain: r.domain,
      students: parseInt(r.students, 10),
      interviews: parseInt(r.interviews, 10),
      averageScore: r.avg_score ? parseFloat(r.avg_score) : null
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
