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

// Shared CTE/Subquery generator for the tutor's authorized students
const getAuthorizedStudentsSubquery = `
  SELECT DISTINCT se.student_user_id 
  FROM student_enrollments se 
  JOIN batch_tutors bt ON se.batch_id = bt.batch_id 
  JOIN batches b ON se.batch_id = b.id
  WHERE bt.tutor_user_id = $1 AND b.college_id = $2
`;

// Shared helper to check batch assignment
const verifyBatchAssignment = async (batchId, tutorUserId, collegeId) => {
  const res = await pool.query(
    `SELECT b.id FROM batches b 
     JOIN batch_tutors bt ON b.id = bt.batch_id 
     WHERE b.id = $1 AND bt.tutor_user_id = $2 AND b.college_id = $3`,
    [batchId, tutorUserId, collegeId]
  );
  return res.rows.length > 0;
};

// 1. Tutor Overview
router.get('/overview', async (req, res) => {
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;
  
  try {
    const studentSubqueryParams = [tutorId, collegeId];

    // Assigned batches
    const batchesRes = await pool.query(
      `SELECT COUNT(*) as count FROM batch_tutors bt JOIN batches b ON bt.batch_id = b.id WHERE bt.tutor_user_id = $1 AND b.college_id = $2`, 
      [tutorId, collegeId]
    );
    const assignedBatches = parseInt(batchesRes.rows[0].count, 10);

    // Total Students
    const studentsRes = await pool.query(
      `SELECT COUNT(DISTINCT se.student_user_id) as count 
       FROM student_enrollments se 
       JOIN batch_tutors bt ON se.batch_id = bt.batch_id 
       JOIN batches b ON b.id = se.batch_id
       WHERE bt.tutor_user_id = $1 AND b.college_id = $2`,
      [tutorId, collegeId]
    );
    const totalStudents = parseInt(studentsRes.rows[0].count, 10);

    // Active Students (activity within last 7 days)
    const activeRes = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.id IN (${getAuthorizedStudentsSubquery})
      AND (
        EXISTS (SELECT 1 FROM coding_attempts ca WHERE ca.user_id = u.id AND ca.created_at >= NOW() - INTERVAL '7 DAYS') OR
        EXISTS (SELECT 1 FROM interview_sessions iss WHERE iss.user_id = u.id AND iss.created_at >= NOW() - INTERVAL '7 DAYS') OR
        EXISTS (SELECT 1 FROM aptitude_sessions aps WHERE aps.user_id = u.id AND aps.created_at >= NOW() - INTERVAL '7 DAYS')
      )
    `, studentSubqueryParams);
    const activeStudents = parseInt(activeRes.rows[0].count, 10);

    // Interviews — strictly completed sessions
    const interviewsRes = await pool.query(`
      SELECT COUNT(*) as total, ROUND(AVG(overall_score)::numeric, 1) as avg_score 
      FROM interview_sessions 
      WHERE user_id IN (${getAuthorizedStudentsSubquery}) AND ${COMPLETED_STATUS_FILTER}
    `, studentSubqueryParams);
    const totalInterviews = parseInt(interviewsRes.rows[0].total, 10);
    const averageInterviewScore = interviewsRes.rows[0].avg_score ? parseFloat(interviewsRes.rows[0].avg_score) : null;

    // Coding Solved
    const codingRes = await pool.query(`
      SELECT COUNT(DISTINCT (user_id, problem_id)) as total 
      FROM coding_attempts 
      WHERE status = 'solved' AND user_id IN (${getAuthorizedStudentsSubquery})
    `, studentSubqueryParams);
    const totalCodingSolved = parseInt(codingRes.rows[0].total, 10);

    // Daily Task
    const dailyRes = await pool.query(`
      WITH daily_solves AS (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_today
        FROM coding_attempts
        WHERE status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date
        AND user_id IN (${getAuthorizedStudentsSubquery})
        GROUP BY user_id
      )
      SELECT COUNT(*) as count FROM daily_solves WHERE solved_today >= 20
    `, studentSubqueryParams);
    const studentsCompletedDailyTask = parseInt(dailyRes.rows[0].count, 10);

    res.json({
      assignedBatches,
      totalStudents,
      activeStudents,
      totalInterviews,
      averageInterviewScore,
      totalCodingSolved,
      studentsCompletedDailyTask,
      totalDailyTaskStudents: totalStudents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Batch Analytics
router.get('/batches/:batchId', async (req, res) => {
  const { batchId } = req.params;
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;

  try {
    const isAuthorized = await verifyBatchAssignment(batchId, tutorId, collegeId);
    if (!isAuthorized) return res.status(403).json({ error: 'Forbidden: You are not assigned to this batch' });

    // Batch details
    const batchRes = await pool.query(`
      SELECT b.id, b.name, b.academic_year, d.name as department_name 
      FROM batches b JOIN departments d ON b.department_id = d.id WHERE b.id = $1
    `, [batchId]);

    // Student Count
    const countRes = await pool.query(`SELECT COUNT(DISTINCT student_user_id) as count FROM student_enrollments WHERE batch_id = $1`, [batchId]);
    const studentCount = parseInt(countRes.rows[0].count, 10);

    const batchStudentsQuery = `SELECT student_user_id FROM student_enrollments WHERE batch_id = $1`;

    // Active Students
    const activeRes = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count FROM users u WHERE u.id IN (${batchStudentsQuery}) AND (
        EXISTS (SELECT 1 FROM coding_attempts ca WHERE ca.user_id = u.id AND ca.created_at >= NOW() - INTERVAL '7 DAYS') OR
        EXISTS (SELECT 1 FROM interview_sessions iss WHERE iss.user_id = u.id AND iss.created_at >= NOW() - INTERVAL '7 DAYS')
      )
    `, [batchId]);

    // Interviews
    const interviewsRes = await pool.query(`
      SELECT COUNT(*) as total, ROUND(AVG(overall_score)::numeric, 1) as avg_score 
      FROM interview_sessions 
      WHERE user_id IN (${batchStudentsQuery}) AND ${COMPLETED_STATUS_FILTER}
    `, [batchId]);

    // Coding
    const codingRes = await pool.query(`
      SELECT COUNT(DISTINCT (user_id, problem_id)) as total FROM coding_attempts WHERE status = 'solved' AND user_id IN (${batchStudentsQuery})
    `, [batchId]);

    // Daily Task
    const dailyRes = await pool.query(`
      WITH daily_solves AS (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_today FROM coding_attempts
        WHERE status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date AND user_id IN (${batchStudentsQuery}) GROUP BY user_id
      )
      SELECT COUNT(*) as count FROM daily_solves WHERE solved_today >= 20
    `, [batchId]);
    
    const dailyTaskCompletionRate = studentCount > 0 ? (parseInt(dailyRes.rows[0].count, 10) / studentCount) * 100 : 0;

    res.json({
      batch: {
        id: batchRes.rows[0].id,
        name: batchRes.rows[0].name,
        academicYear: batchRes.rows[0].academic_year,
        department: batchRes.rows[0].department_name
      },
      studentCount,
      activeStudents: parseInt(activeRes.rows[0].count, 10),
      totalInterviews: parseInt(interviewsRes.rows[0].total, 10),
      averageInterviewScore: interviewsRes.rows[0].avg_score ? parseFloat(interviewsRes.rows[0].avg_score) : null,
      totalCodingSolved: parseInt(codingRes.rows[0].total, 10),
      dailyTaskCompletionRate
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Batch Student Analytics
router.get('/batches/:batchId/students', async (req, res) => {
  const { batchId } = req.params;
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;

  try {
    const isAuthorized = await verifyBatchAssignment(batchId, tutorId, collegeId);
    if (!isAuthorized) return res.status(403).json({ error: 'Forbidden' });

    const result = await pool.query(`
      SELECT u.id as student_id, u.full_name as name, u.email, u.college_email, u.personal_email,
        ${completedInterviewsSql('u.id')} as interviews,
        ${avgInterviewScoreSql('u.id')} as average_interview_score,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved') as coding_solved,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved' AND created_at >= (NOW() AT TIME ZONE 'UTC')::date) as daily_solved,
        (SELECT MAX(created_at) FROM (
          SELECT created_at FROM coding_attempts WHERE user_id = u.id
          UNION ALL
          SELECT created_at FROM interview_sessions WHERE user_id = u.id
        ) acts) as last_activity_at
      FROM users u
      JOIN student_enrollments se ON u.id = se.student_user_id
      WHERE se.batch_id = $1
    `, [batchId]);

    const mapped = result.rows.map(r => ({
      studentId: r.student_id,
      name: r.name,
      email: r.email,
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

// 4. Individual Student Analytics
router.get('/students/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;

  try {
    const isAuthorizedRes = await pool.query(`
      SELECT 1 FROM student_enrollments se 
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id 
      JOIN batches b ON se.batch_id = b.id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2 AND b.college_id = $3 LIMIT 1
    `, [studentId, tutorId, collegeId]);
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

// 5. Student Recent Activity
router.get('/students/:studentId/activity', async (req, res) => {
  const { studentId } = req.params;
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;

  try {
    const isAuthorizedRes = await pool.query(`
      SELECT 1 FROM student_enrollments se 
      JOIN batch_tutors bt ON se.batch_id = bt.batch_id 
      JOIN batches b ON se.batch_id = b.id
      WHERE se.student_user_id = $1 AND bt.tutor_user_id = $2 AND b.college_id = $3 LIMIT 1
    `, [studentId, tutorId, collegeId]);
    if (isAuthorizedRes.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });

    const activityRes = await pool.query(`
      SELECT 'INTERVIEW' as type, category || ' Interview' as title, created_at as timestamp, overall_score as score
      FROM interview_sessions WHERE user_id = $1
      UNION ALL
      SELECT 'CODING' as type, 'Solved Problem: ' || problem_id as title, created_at as timestamp, NULL as score
      FROM coding_attempts WHERE user_id = $1 AND status = 'solved'
      UNION ALL
      SELECT 'APTITUDE' as type, category || ' Aptitude' as title, created_at as timestamp, score as score
      FROM aptitude_sessions WHERE user_id = $1 AND is_completed = true
      ORDER BY timestamp DESC
      LIMIT 20
    `, [studentId]);

    res.json(activityRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Domain Analytics
router.get('/domains', async (req, res) => {
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;

  try {
    const domainsRes = await pool.query(`
      SELECT category as domain, 
             COUNT(DISTINCT user_id) as students, 
             COUNT(*) as interviews, 
             ROUND(AVG(overall_score)::numeric, 1) as avg_score
      FROM interview_sessions
      WHERE category IS NOT NULL AND ${COMPLETED_STATUS_FILTER} AND user_id IN (${getAuthorizedStudentsSubquery})
      GROUP BY category
      ORDER BY interviews DESC
    `, [tutorId, collegeId]);

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

// 7. Visual Reports & Trends (Step 8 in Teacher Prototype)
router.get('/trends', async (req, res) => {
  const tutorId = req.user.id;
  const collegeId = req.campusContext.college_id;
  const { days = 30, batch_id } = req.query;

  try {
    let studentFilter = getAuthorizedStudentsSubquery;
    const filterParams = [tutorId, collegeId];

    if (batch_id && batch_id !== 'all') {
      const isAuth = await verifyBatchAssignment(batch_id, tutorId, collegeId);
      if (!isAuth) return res.status(403).json({ error: 'Forbidden' });
      studentFilter = `SELECT student_user_id FROM student_enrollments WHERE batch_id = $3 AND status = 'ACTIVE'`;
      filterParams.push(batch_id);
    }

    // Interview Trends grouped by date
    const intervalDays = parseInt(days, 10) || 30;
    const trendsRes = await pool.query(`
      SELECT 
        TO_CHAR(iss.created_at, 'Mon DD') as date_label,
        DATE(iss.created_at) as raw_date,
        COUNT(*) as total_interviews,
        ROUND(AVG(iss.overall_score)) as avg_score
      FROM interview_sessions iss
      WHERE iss.user_id IN (${studentFilter})
      AND iss.${COMPLETED_STATUS_FILTER}
      AND iss.created_at >= NOW() - INTERVAL '${intervalDays} DAYS'
      GROUP BY raw_date, date_label
      ORDER BY raw_date ASC
    `, filterParams);

    // Batch Performance comparison
    const batchPerfRes = await pool.query(`
      SELECT 
        b.id,
        b.name as batch_name,
        COUNT(DISTINCT se.student_user_id) as student_count,
        COUNT(iss.id) as total_interviews,
        ROUND(AVG(iss.overall_score)) as avg_score
      FROM batches b
      JOIN batch_tutors bt ON b.id = bt.batch_id
      LEFT JOIN student_enrollments se ON b.id = se.batch_id AND se.status = 'ACTIVE'
      LEFT JOIN interview_sessions iss ON se.student_user_id = iss.user_id AND iss.${COMPLETED_STATUS_FILTER}
      WHERE bt.tutor_user_id = $1 AND b.college_id = $2
      GROUP BY b.id, b.name
      ORDER BY b.name ASC
    `, [tutorId, collegeId]);

    res.json({
      interviewTrends: trendsRes.rows.map(r => ({
        date: r.date_label,
        totalInterviews: parseInt(r.total_interviews, 10),
        averageScore: r.avg_score ? parseFloat(r.avg_score) : null
      })),
      batchPerformance: batchPerfRes.rows.map(r => ({
        batchName: r.batch_name,
        studentCount: parseInt(r.student_count, 10),
        totalInterviews: parseInt(r.total_interviews, 10),
        avgScore: r.avg_score ? parseFloat(r.avg_score) : 0
      }))
    });
  } catch (error) {
    console.error('[TUTOR analytics trends] error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
