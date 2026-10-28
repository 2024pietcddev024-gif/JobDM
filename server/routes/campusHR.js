import express from 'express';
import db from '../db.js';
import { loadCampusContext, requireCampusRole } from '../middleware/campusAuth.js';
import { authenticateToken } from './auth.js';
import { completedInterviewsSql, avgInterviewScoreSql, COMPLETED_STATUS_FILTER } from '../services/interviewMetrics.js';

const router = express.Router();
const pool = { query: db.query };

router.use(authenticateToken);
router.use(loadCampusContext);
router.use(requireCampusRole('HR'));

// Helper: Verify if HR user has verified Super Admin permission for a college
async function isHrAuthorizedForCollege(hrUserId, targetCollegeId) {
  if (!targetCollegeId) return { authorized: false, reason: 'Target institution is required' };

  // 1. Verify college status is ACTIVE
  const colRes = await pool.query('SELECT id, name, status FROM colleges WHERE id = $1', [targetCollegeId]);
  if (colRes.rows.length === 0) {
    return { authorized: false, reason: 'College not found in platform' };
  }
  if (colRes.rows[0].status !== 'ACTIVE') {
    return { authorized: false, reason: `Target institution (${colRes.rows[0].name}) is currently inactive or pending administrator approval.` };
  }

  // 2. Check explicit hr_college_permissions granted by Super Admin
  const permRes = await pool.query(
    "SELECT id FROM hr_college_permissions WHERE hr_user_id = $1 AND college_id = $2 AND status = 'ACTIVE'",
    [hrUserId, targetCollegeId]
  );
  if (permRes.rows.length > 0) return { authorized: true, college: colRes.rows[0] };

  // 3. Check direct campus_users membership with HR role
  const cuRes = await pool.query(
    "SELECT id FROM campus_users WHERE user_id = $1 AND college_id = $2 AND system_role = 'HR' AND status = 'ACTIVE'",
    [hrUserId, targetCollegeId]
  );
  if (cuRes.rows.length > 0) return { authorized: true, college: colRes.rows[0] };

  return { 
    authorized: false, 
    reason: `Permission Denied: You do not have Super Admin permission to post jobs or access student talent for ${colRes.rows[0].name}.` 
  };
}

// 0. GET /api/campus/hr/authorized-colleges - Colleges this HR has verified permission to target
router.get('/authorized-colleges', async (req, res) => {
  try {
    const hrUserId = req.user.id;
    const result = await pool.query(`
      SELECT DISTINCT c.id, c.name, c.code, c.domain, c.status
      FROM colleges c
      WHERE c.status = 'ACTIVE' AND (
        c.id IN (SELECT college_id FROM hr_college_permissions WHERE hr_user_id = $1 AND status = 'ACTIVE')
        OR
        c.id IN (SELECT college_id FROM campus_users WHERE user_id = $1 AND system_role = 'HR' AND status = 'ACTIVE')
      )
      ORDER BY c.name
    `, [hrUserId]);

    res.json(result.rows);
  } catch (err) {
    console.error('[HR authorized-colleges] error:', err);
    res.status(500).json({ error: 'Server error loading authorized colleges' });
  }
});

// 1. GET /api/campus/hr/overview
router.get('/overview', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    
    // Total Jobs (all jobs posted for this college)
    const totalJobsRes = await pool.query(
      'SELECT COUNT(*) as total FROM hr_jobs WHERE college_id = $1',
      [collegeId]
    );

    // Total Applications
    const totalAppsRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1
    `, [collegeId]);

    // Shortlisted Candidates
    const shortRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1 AND ha.status = 'SHORTLISTED'
    `, [collegeId]);

    // Scheduled Interviews
    const intRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_interviews hi
      JOIN hr_applications ha ON hi.application_id = ha.id
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1 AND hi.status = 'SCHEDULED'
    `, [collegeId]);

    // Total Hired / Selected
    const hiredRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1 AND ha.status IN ('SELECTED', 'HIRED')
    `, [collegeId]);

    // Recent Applications (with candidate and job metadata)
    const recentRes = await pool.query(`
      SELECT 
        ha.id as application_id, 
        ha.status, 
        ha.created_at, 
        u.id as candidate_id,
        u.full_name as candidate_name, 
        u.email as candidate_email, 
        hj.id as job_id,
        hj.title as job_title,
        hj.job_type,
        hj.workplace_type
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      JOIN users u ON ha.candidate_id = u.id
      WHERE hj.college_id = $1
      ORDER BY ha.created_at DESC
      LIMIT 10
    `, [collegeId]);

    res.json({
      totalJobs: parseInt(totalJobsRes.rows[0].total, 10),
      totalApplications: parseInt(totalAppsRes.rows[0].total, 10),
      shortlisted: parseInt(shortRes.rows[0].total, 10),
      interviewsScheduled: parseInt(intRes.rows[0].total, 10),
      hiredCount: parseInt(hiredRes.rows[0].total, 10),
      recentApplications: recentRes.rows
    });
  } catch (err) {
    console.error('[HR overview] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. GET /api/campus/hr/analytics - Recruitment Performance & Charts
router.get('/analytics', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;

    // KPI Totals
    const totalAppsRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1
    `, [collegeId]);

    const shortRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1 AND ha.status = 'SHORTLISTED'
    `, [collegeId]);

    const intRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_interviews hi
      JOIN hr_applications ha ON hi.application_id = ha.id
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1
    `, [collegeId]);

    const hiredRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1 AND ha.status IN ('SELECTED', 'HIRED')
    `, [collegeId]);

    // Trend analysis: Applications by date
    const trendRes = await pool.query(`
      SELECT 
        TO_CHAR(ha.created_at, 'Mon DD') as date_label,
        DATE(ha.created_at) as raw_date,
        COUNT(*) as applications_count
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1 AND ha.created_at >= NOW() - INTERVAL '30 DAYS'
      GROUP BY raw_date, date_label
      ORDER BY raw_date ASC
    `, [collegeId]);

    // Role / Department distribution
    const deptRes = await pool.query(`
      SELECT 
        COALESCE(hj.title, 'General') as role_title,
        COUNT(ha.id) as count
      FROM hr_jobs hj
      LEFT JOIN hr_applications ha ON hj.id = ha.job_id
      WHERE hj.college_id = $1
      GROUP BY role_title
      ORDER BY count DESC
      LIMIT 6
    `, [collegeId]);

    // Status breakdown
    const statusRes = await pool.query(`
      SELECT 
        ha.status,
        COUNT(*) as count
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hj.college_id = $1
      GROUP BY ha.status
    `, [collegeId]);

    res.json({
      totalApplications: parseInt(totalAppsRes.rows[0].total, 10),
      shortlisted: parseInt(shortRes.rows[0].total, 10),
      interviews: parseInt(intRes.rows[0].total, 10),
      hired: parseInt(hiredRes.rows[0].total, 10),
      applicationsTrend: trendRes.rows.map(r => ({
        date: r.date_label,
        applications: parseInt(r.applications_count, 10)
      })),
      departmentDistribution: deptRes.rows.map(r => ({
        name: r.role_title,
        value: parseInt(r.count, 10)
      })),
      statusDistribution: statusRes.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('[HR analytics] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. GET /api/campus/hr/jobs - List all jobs with applicant statistics
router.get('/jobs', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const jobsRes = await pool.query(`
      SELECT 
        j.*,
        (SELECT COUNT(*) FROM hr_applications WHERE job_id = j.id) as applications_count,
        (SELECT COUNT(*) FROM hr_applications WHERE job_id = j.id AND status = 'SHORTLISTED') as shortlisted_count
      FROM hr_jobs j
      WHERE j.college_id = $1 
      ORDER BY j.created_at DESC
    `, [collegeId]);

    res.json(jobsRes.rows);
  } catch (err) {
    console.error('[HR jobs] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. POST /api/campus/hr/jobs - Create Job Post (Permission Guarded)
router.post('/jobs', async (req, res) => {
  try {
    const targetCollegeId = req.body.college_id || req.campusContext.college_id;
    if (!targetCollegeId) {
      return res.status(400).json({ error: 'Target college institution is required' });
    }

    // Strict Super-Admin permission check for target college
    const authCheck = await isHrAuthorizedForCollege(req.user.id, targetCollegeId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason });
    }

    const { 
      title, 
      description, 
      skills, 
      preferred_skills,
      required_degree,
      min_cgpa,
      min_interview_score,
      min_coding_solved,
      eligibility_criteria,
      target_domain,
      experience_level, 
      location, 
      job_type, 
      workplace_type, 
      deadline 
    } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Job title is required' });
    }

    // Automatically resolve domain if not explicitly provided
    let resolvedDomain = target_domain;
    if (!resolvedDomain) {
      const textToSearch = `${title} ${description || ''} ${skills || ''}`.toLowerCase();
      if (textToSearch.includes('frontend') || textToSearch.includes('react') || textToSearch.includes('angular') || textToSearch.includes('vue') || textToSearch.includes('ui')) {
        resolvedDomain = 'frontend';
      } else if (textToSearch.includes('backend') || textToSearch.includes('node') || textToSearch.includes('django') || textToSearch.includes('spring') || textToSearch.includes('api')) {
        resolvedDomain = 'backend';
      } else if (textToSearch.includes('data') || textToSearch.includes('machine learning') || textToSearch.includes('ai') || textToSearch.includes('pandas')) {
        resolvedDomain = 'data_science';
      } else if (textToSearch.includes('devops') || textToSearch.includes('cloud') || textToSearch.includes('docker') || textToSearch.includes('kubernetes') || textToSearch.includes('aws')) {
        resolvedDomain = 'devops';
      } else if (textToSearch.includes('mobile') || textToSearch.includes('android') || textToSearch.includes('flutter') || textToSearch.includes('ios')) {
        resolvedDomain = 'mobile';
      } else {
        resolvedDomain = 'fullstack';
      }
    }

    const newJob = await pool.query(`
      INSERT INTO hr_jobs (
        college_id, creator_id, title, description, skills, 
        preferred_skills, required_degree, min_cgpa, min_interview_score, min_coding_solved, eligibility_criteria,
        target_domain, experience_level, location, job_type, workplace_type, deadline, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'OPEN')
      RETURNING *
    `, [
      targetCollegeId, 
      req.user.id, 
      title.trim(), 
      description || '', 
      skills || '', 
      preferred_skills || '',
      required_degree || null,
      min_cgpa ? parseFloat(min_cgpa) : null,
      min_interview_score ? parseFloat(min_interview_score) : null,
      min_coding_solved ? parseInt(min_coding_solved, 10) : 0,
      eligibility_criteria ? JSON.stringify(eligibility_criteria) : null,
      resolvedDomain,
      experience_level || 'Entry Level', 
      location || 'Remote',
      job_type || 'Full Time',
      workplace_type || 'Remote',
      deadline || null
    ]);
    
    res.status(201).json(newJob.rows[0]);
  } catch (err) {
    console.error('[HR post job] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. GET /api/campus/hr/jobs/:id
router.get('/jobs/:id', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const jobRes = await pool.query(`
      SELECT 
        j.*,
        (SELECT COUNT(*) FROM hr_applications WHERE job_id = j.id) as applications_count,
        (SELECT COUNT(*) FROM hr_applications WHERE job_id = j.id AND status = 'SHORTLISTED') as shortlisted_count
      FROM hr_jobs j
      WHERE j.id = $1 AND j.college_id = $2
    `, [req.params.id, collegeId]);
    
    if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(jobRes.rows[0]);
  } catch (err) {
    console.error('[HR get job] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. PATCH /api/campus/hr/jobs/:id - Edit Job Details or Toggle Status
router.patch('/jobs/:id', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { 
      status, 
      title, 
      description, 
      skills, 
      preferred_skills,
      required_degree,
      min_cgpa,
      min_interview_score,
      min_coding_solved,
      eligibility_criteria,
      experience_level, 
      location,
      job_type,
      workplace_type,
      deadline
    } = req.body;
    
    const updateRes = await pool.query(`
      UPDATE hr_jobs
      SET status = COALESCE($1, status),
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          skills = COALESCE($4, skills),
          preferred_skills = COALESCE($5, preferred_skills),
          required_degree = COALESCE($6, required_degree),
          min_cgpa = COALESCE($7, min_cgpa),
          min_interview_score = COALESCE($8, min_interview_score),
          min_coding_solved = COALESCE($9, min_coding_solved),
          eligibility_criteria = COALESCE($10, eligibility_criteria),
          experience_level = COALESCE($11, experience_level),
          location = COALESCE($12, location),
          job_type = COALESCE($13, job_type),
          workplace_type = COALESCE($14, workplace_type),
          deadline = COALESCE($15, deadline),
          updated_at = NOW()
      WHERE id = $16 AND college_id = $17
      RETURNING *
    `, [
      status, title, description, skills, 
      preferred_skills, required_degree, 
      min_cgpa !== undefined ? parseFloat(min_cgpa) : null,
      min_interview_score !== undefined ? parseFloat(min_interview_score) : null,
      min_coding_solved !== undefined ? parseInt(min_coding_solved, 10) : null,
      eligibility_criteria !== undefined ? JSON.stringify(eligibility_criteria) : null,
      experience_level, location, 
      job_type, workplace_type, deadline, req.params.id, collegeId
    ]);

    if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('[HR patch job] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. GET /api/campus/hr/candidates - List Candidates with Application & Assessment Context
router.get('/candidates', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { status, job_id, search } = req.query;

    let query = `
      SELECT 
        ha.id as application_id,
        ha.status,
        ha.created_at as applied_at,
        ha.resume_url,
        u.id as candidate_id,
        u.full_name as name,
        u.email,
        u.target_role,
        u.target_level,
        hj.id as job_id,
        hj.title as applied_for,
        hj.location,
        ${completedInterviewsSql('u.id')} as interview_count,
        ${avgInterviewScoreSql('u.id')} as avg_interview_score,
        (SELECT COUNT(DISTINCT problem_id) FROM coding_attempts WHERE user_id = u.id AND status = 'solved') as coding_solved,
        (SELECT extracted_skills FROM resumes WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as skills,
        (SELECT json_build_object(
          'id', hi.id,
          'schedule_time', hi.schedule_time,
          'stage', hi.stage,
          'status', hi.status
        ) FROM hr_interviews hi WHERE hi.application_id = ha.id ORDER BY hi.created_at DESC LIMIT 1) as interview_details
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      JOIN users u ON ha.candidate_id = u.id
      WHERE hj.college_id = $1
    `;
    const params = [collegeId];
    let idx = 2;

    if (status && status !== 'All') {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'APPLIED' || upperStatus === 'NEW') {
        query += ` AND ha.status IN ('APPLIED', 'REVIEWING', 'NEW')`;
      } else if (upperStatus === 'SELECTED' || upperStatus === 'HIRED' || upperStatus === 'OFFERED') {
        query += ` AND ha.status IN ('SELECTED', 'HIRED', 'OFFERED')`;
      } else if (upperStatus === 'INTERVIEW_SCHEDULED' || upperStatus === 'INTERVIEW') {
        query += ` AND ha.status IN ('INTERVIEW_SCHEDULED', 'INTERVIEW', 'SCHEDULED')`;
      } else if (upperStatus === 'REJECTED') {
        query += ` AND ha.status IN ('REJECTED', 'CANCELLED')`;
      } else {
        query += ` AND ha.status = $${idx++}`;
        params.push(upperStatus);
      }
    }

    if (job_id) {
      query += ` AND hj.id = $${idx++}`;
      params.push(job_id);
    }

    if (search) {
      query += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR hj.title ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY ha.created_at DESC`;

    const candidatesRes = await pool.query(query, params);
    res.json(candidatesRes.rows);
  } catch (err) {
    console.error('[HR candidates] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. GET /api/campus/hr/candidates/:id - Detailed Candidate Profile
router.get('/candidates/:id', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const candidateId = req.params.id;

    // Verify candidate has applied to at least one job in this college
    const verifyRes = await pool.query(`
      SELECT 1 FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE ha.candidate_id = $1 AND hj.college_id = $2
      LIMIT 1
    `, [candidateId, collegeId]);

    if (verifyRes.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Candidate has no applications with your organization' });
    }

    // User Profile
    const userRes = await pool.query(
      'SELECT id, full_name, email, target_role, target_level, streak_days, preferred_coding_language FROM users WHERE id = $1',
      [candidateId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Candidate not found' });

    // Latest Resume
    const resumeRes = await pool.query(
      'SELECT file_name, file_url, extracted_skills, extracted_projects, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [candidateId]
    );

    // Applications History in this college
    const appsRes = await pool.query(`
      SELECT ha.*, hj.title as job_title, hj.location, hj.job_type
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE ha.candidate_id = $1 AND hj.college_id = $2
      ORDER BY ha.created_at DESC
    `, [candidateId, collegeId]);

    // Assessment Overview (Interviews, Coding, Aptitude)
    const intRes = await pool.query(`
      SELECT id, category, role, difficulty, overall_score, duration_minutes, created_at
      FROM interview_sessions
      WHERE user_id = $1 AND ${COMPLETED_STATUS_FILTER}
      ORDER BY created_at DESC
      LIMIT 5
    `, [candidateId]);

    const codingRes = await pool.query(`
      SELECT COUNT(DISTINCT problem_id) as total_solved
      FROM coding_attempts
      WHERE user_id = $1 AND status = 'solved'
    `, [candidateId]);

    const aptRes = await pool.query(`
      SELECT category, score, total_questions, created_at
      FROM aptitude_sessions
      WHERE user_id = $1 AND is_completed = true
      ORDER BY created_at DESC
      LIMIT 5
    `, [candidateId]);

    res.json({
      candidate: userRes.rows[0],
      resume: resumeRes.rows[0] || null,
      applications: appsRes.rows,
      interviewHistory: intRes.rows,
      codingSolved: parseInt(codingRes.rows[0]?.total_solved || 0, 10),
      aptitudeHistory: aptRes.rows
    });
  } catch (err) {
    console.error('[HR candidate details] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 9. GET /api/campus/hr/applications
router.get('/applications', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { job_id } = req.query;
    
    let query = `
      SELECT 
        ha.*, 
        u.full_name as candidate_name, 
        u.email as candidate_email, 
        hj.title as job_title,
        hj.job_type,
        hj.location as job_location
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      JOIN users u ON ha.candidate_id = u.id
      WHERE hj.college_id = $1
    `;
    const params = [collegeId];
    
    if (job_id) {
      query += ` AND ha.job_id = $2`;
      params.push(job_id);
    }
    
    query += ` ORDER BY ha.created_at DESC`;
    
    const appsRes = await pool.query(query, params);
    res.json(appsRes.rows);
  } catch (err) {
    console.error('[HR applications] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 10. PATCH /api/campus/hr/applications/:id/status - Update Status (New, Shortlisted, Interview, Rejected, Selected)
router.patch('/applications/:id/status', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { status } = req.body;
    
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const verifyRes = await pool.query(`
      SELECT ha.id FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE ha.id = $1 AND hj.college_id = $2
    `, [req.params.id, collegeId]);

    if (verifyRes.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    const updateRes = await pool.query(`
      UPDATE hr_applications
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status.toUpperCase(), req.params.id]);

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('[HR update application status] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 11. GET /api/campus/hr/interviews - List scheduled/completed interviews
router.get('/interviews', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { status } = req.query;

    let query = `
      SELECT 
        hi.*, 
        ha.candidate_id, 
        ha.status as application_status,
        u.full_name as candidate_name, 
        u.email as candidate_email,
        hj.title as job_role, 
        u2.full_name as interviewer_name
      FROM hr_interviews hi
      JOIN hr_applications ha ON hi.application_id = ha.id
      JOIN hr_jobs hj ON ha.job_id = hj.id
      JOIN users u ON ha.candidate_id = u.id
      JOIN users u2 ON hi.interviewer_id = u2.id
      WHERE hj.college_id = $1
    `;
    const params = [collegeId];

    if (status && status !== 'All') {
      query += ` AND hi.status = $2`;
      params.push(status.toUpperCase());
    }

    query += ` ORDER BY hi.schedule_time ASC`;

    const intRes = await pool.query(query, params);
    res.json(intRes.rows);
  } catch (err) {
    console.error('[HR interviews] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 12. POST /api/campus/hr/interviews - Schedule an interview
router.post('/interviews', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { application_id, schedule_time, stage, type } = req.body;
    
    if (!application_id || !schedule_time) {
      return res.status(400).json({ error: 'Application and schedule time are required' });
    }

    const verifyRes = await pool.query(`
      SELECT ha.id, ha.candidate_id FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE ha.id = $1 AND hj.college_id = $2
    `, [application_id, collegeId]);

    if (verifyRes.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    const intRes = await pool.query(`
      INSERT INTO hr_interviews (application_id, interviewer_id, schedule_time, stage, status)
      VALUES ($1, $2, $3, $4, 'SCHEDULED')
      RETURNING *
    `, [application_id, req.user.id, schedule_time, type || stage || 'Technical']);

    // Also transition application status to INTERVIEW_SCHEDULED
    await pool.query(`
      UPDATE hr_applications SET status = 'INTERVIEW_SCHEDULED', updated_at = NOW() WHERE id = $1
    `, [application_id]);

    res.status(201).json(intRes.rows[0]);
  } catch (err) {
    console.error('[HR schedule interview] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 13. PATCH /api/campus/hr/interviews/:id - Update Interview status/feedback
router.patch('/interviews/:id', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;
    const { status, feedback, score, schedule_time } = req.body;
    
    const verifyRes = await pool.query(`
      SELECT hi.id, hi.application_id FROM hr_interviews hi
      JOIN hr_applications ha ON hi.application_id = ha.id
      JOIN hr_jobs hj ON ha.job_id = hj.id
      WHERE hi.id = $1 AND hj.college_id = $2
    `, [req.params.id, collegeId]);

    if (verifyRes.rows.length === 0) return res.status(404).json({ error: 'Interview not found' });

    const updateRes = await pool.query(`
      UPDATE hr_interviews
      SET status = COALESCE($1, status),
          feedback = COALESCE($2, feedback),
          score = COALESCE($3, score),
          schedule_time = COALESCE($4, schedule_time),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, feedback, score, schedule_time, req.params.id]);

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('[HR update interview] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 14. GET /api/campus/hr/profile - HR Profile with Organization Details
router.get('/profile', async (req, res) => {
  try {
    const collegeId = req.campusContext.college_id;

    const userRes = await pool.query(
      'SELECT id, full_name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    const colRes = await pool.query(
      'SELECT name, code, domain FROM colleges WHERE id = $1',
      [collegeId]
    );

    const userRow = userRes.rows[0] || {};
    const colRow = colRes.rows[0] || {};

    // Extract HR ID from email if patterned as HR-xxx
    let hrId = userRow.email?.split('@')[0]?.toUpperCase();
    if (!hrId.startsWith('HR-')) {
      hrId = `HR-${colRow.code || 'ORG'}-${userRow.id.substring(0, 6).toUpperCase()}`;
    }

    res.json({
      role: req.campusContext.system_role,
      user_id: req.user.id,
      full_name: userRow.full_name,
      email: userRow.email,
      hr_id: hrId,
      college_id: collegeId,
      college_name: colRow.name || 'JobDM Partner Institution',
      college_code: colRow.code || 'N/A'
    });
  } catch (err) {
    console.error('[HR profile] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
