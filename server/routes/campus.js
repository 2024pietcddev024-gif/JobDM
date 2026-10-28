import express from 'express';
import db from '../db.js';
import { authenticateToken } from './auth.js';
import { loadCampusContext, requireCampusUser, requireCampusRole, verifyBatchAccess, verifyStudentAccess } from '../middleware/campusAuth.js';
import { evaluateJobMatch, evaluateHardEligibility } from '../services/jobMatcher.js';
import { getStudentInterviewMetrics } from '../services/interviewMetrics.js';

const router = express.Router();
const pool = { query: db.query };

// All campus routes require JWT authentication and context loading
router.use(authenticateToken);
router.use(loadCampusContext);

// 8. CAMPUS ME ENDPOINT
router.get('/me', async (req, res) => {
  if (!req.campusContext) {
    return res.json({ 
      user: { id: req.user.id, email: req.user.email },
      campus: null 
    });
  }

  const { campus_user_id, college_id, system_role } = req.campusContext;
  
  let collegeName = null;
  if (college_id) {
    const colRes = await pool.query('SELECT name FROM colleges WHERE id = $1', [college_id]);
    if (colRes.rows.length > 0) collegeName = colRes.rows[0].name;
  }

  let batchIds = [];
  if (system_role === 'TUTOR') {
    const btRes = await pool.query('SELECT batch_id FROM batch_tutors WHERE tutor_user_id = $1', [req.user.id]);
    batchIds = btRes.rows.map(r => r.batch_id);
  } else if (system_role === 'STUDENT') {
    const stRes = await pool.query("SELECT batch_id FROM student_enrollments WHERE student_user_id = $1 AND status = 'ACTIVE'", [req.user.id]);
    batchIds = stRes.rows.map(r => r.batch_id);
  }

  res.json({
    user: { id: req.user.id, email: req.user.email },
    campus: {
      campusUserId: campus_user_id,
      role: system_role,
      collegeId: college_id,
      collegeName,
      batchIds
    }
  });
});

// FOUNDATIONAL CAMPUS API ROUTES

// GET /api/campus/colleges
router.get('/colleges', requireCampusUser, async (req, res) => {
  try {
    const ctx = req.campusContext;
    if (ctx.system_role === 'SUPER_ADMIN') {
      const result = await pool.query('SELECT * FROM colleges ORDER BY name');
      return res.json(result.rows);
    } else {
      // Return only their college
      const result = await pool.query('SELECT * FROM colleges WHERE id = $1', [ctx.college_id]);
      return res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campus/departments
router.get('/departments', requireCampusUser, async (req, res) => {
  try {
    const ctx = req.campusContext;
    if (ctx.system_role === 'SUPER_ADMIN') {
      const result = await pool.query('SELECT * FROM departments ORDER BY name');
      return res.json(result.rows);
    } else {
      // Return only departments for their college
      const result = await pool.query('SELECT * FROM departments WHERE college_id = $1 ORDER BY name', [ctx.college_id]);
      return res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campus/batches
router.get('/batches', requireCampusUser, async (req, res) => {
  try {
    const ctx = req.campusContext;
    if (ctx.system_role === 'SUPER_ADMIN') {
      const result = await pool.query('SELECT * FROM batches ORDER BY name');
      return res.json(result.rows);
    } else if (ctx.system_role === 'COLLEGE_ADMIN') {
      const result = await pool.query('SELECT * FROM batches WHERE college_id = $1 ORDER BY name', [ctx.college_id]);
      return res.json(result.rows);
    } else if (ctx.system_role === 'TUTOR') {
      const result = await pool.query(`
        SELECT b.* FROM batches b
        JOIN batch_tutors bt ON b.id = bt.batch_id
        WHERE bt.tutor_user_id = $1
        ORDER BY b.name
      `, [req.user.id]);
      return res.json(result.rows);
    } else if (ctx.system_role === 'STUDENT') {
      const result = await pool.query(`
        SELECT b.* FROM batches b
        JOIN student_enrollments se ON b.id = se.batch_id
        WHERE se.student_user_id = $1 AND se.status = 'ACTIVE'
        ORDER BY b.name
      `, [req.user.id]);
      return res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campus/batches/:batchId
router.get('/batches/:batchId', requireCampusUser, verifyBatchAccess, async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await pool.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campus/students/:studentId
router.get('/students/:studentId', requireCampusUser, verifyStudentAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      'SELECT id, email, full_name, target_role, target_level FROM users WHERE id = $1', 
      [studentId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// Helper: Build candidate context for smart job matching & eligibility
async function getCandidateMatchingContext(candidateId, collegeId) {
  // User profile
  const userRes = await pool.query(
    'SELECT id, full_name, email, target_role, target_level, preferred_coding_language FROM users WHERE id = $1',
    [candidateId]
  );
  const user = userRes.rows[0] || {};

  // Latest resume skills
  const resumeRes = await pool.query(
    'SELECT extracted_skills FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [candidateId]
  );
  const resumeSkills = resumeRes.rows[0]?.extracted_skills || [];

  // Coding solved & languages
  const codingRes = await pool.query(
    "SELECT COUNT(DISTINCT problem_id) as solved FROM coding_attempts WHERE user_id = $1 AND status = 'solved'",
    [candidateId]
  );
  const codingSolved = parseInt(codingRes.rows[0]?.solved || 0, 10);

  const codingLangRes = await pool.query(
    "SELECT DISTINCT language FROM coding_attempts WHERE user_id = $1 AND status = 'solved'",
    [candidateId]
  );
  const codingLanguages = codingLangRes.rows.map(r => (r.language || '').toLowerCase()).filter(Boolean);

  // Authoritative interview metrics and practiced domains
  const interviewMetrics = await getStudentInterviewMetrics(candidateId);

  // Query interview categories/domains practiced by student
  const domainRes = await pool.query(`
    SELECT 
      LOWER(COALESCE(category, role, 'general')) as domain,
      COUNT(*)::int as count,
      ROUND(AVG(overall_score)::numeric, 1) as avg_score
    FROM interview_sessions
    WHERE user_id = $1 AND (status = 'COMPLETED' OR overall_score IS NOT NULL)
    GROUP BY LOWER(COALESCE(category, role, 'general'))
    ORDER BY count DESC
  `, [candidateId]);

  const practicedDomains = domainRes.rows;
  const topDomain = practicedDomains.length > 0 ? practicedDomains[0].domain : null;

  // Application IDs
  const appsRes = await pool.query(
    'SELECT job_id, status FROM hr_applications WHERE candidate_id = $1',
    [candidateId]
  );
  const appliedJobMap = new Map();
  for (const a of appsRes.rows) {
    appliedJobMap.set(a.job_id, a.status);
  }

  return {
    candidateId,
    collegeId,
    targetRole: user.target_role,
    targetLevel: user.target_level,
    skills: resumeSkills,
    codingSolved,
    codingLanguages,
    practicedDomains,
    topDomain,
    interviewScore: interviewMetrics.averageScore,
    completedInterviews: interviewMetrics.completedInterviews,
    appliedJobMap
  };
}

// GET /api/campus/jobs/eligible - Smart Job Matching with 4 categorized sections
router.get('/jobs/eligible', async (req, res) => {
  try {
    const collegeId = req.campusContext?.college_id;
    const candidateId = req.user.id;

    // 1. Fetch Candidate Matching Context
    const candidateContext = await getCandidateMatchingContext(candidateId, collegeId);

    // 2. Fetch Open Jobs (only for college-approved companies)
    let query = `
      SELECT 
        j.*,
        COALESCE(cpc.company_name, j.company_name, 'Campus Placement Partner') as company_name,
        cpc.industry as company_industry,
        cpc.website as company_website,
        cpc.tier as company_tier,
        cpc.mou_signed as company_mou_signed,
        COALESCE(cpc.is_approved, TRUE) as company_is_approved,
        c.name as college_name,
        c.code as college_code,
        (SELECT COUNT(*) FROM hr_applications WHERE job_id = j.id) as total_applicants
      FROM hr_jobs j
      JOIN colleges c ON j.college_id = c.id
      LEFT JOIN college_partner_companies cpc ON (j.partner_company_id = cpc.id OR (j.college_id = cpc.college_id AND LOWER(j.company_name) = LOWER(cpc.company_name)))
      WHERE j.status = 'OPEN'
        AND (cpc.id IS NULL OR cpc.is_approved = TRUE)
    `;
    const params = [];
    if (collegeId) {
      query += ` AND j.college_id = $1`;
      params.push(collegeId);
    }
    query += ` ORDER BY j.created_at DESC`;

    const jobsRes = await pool.query(query, params);

    // 3. Evaluate each job through Stage 1 & Stage 2 matching
    const recommended = [];
    const eligible = [];
    const potential = [];
    const notEligible = [];
    const applied = [];

    for (const job of jobsRes.rows) {
      const jobCtx = {
        ...candidateContext,
        hasApplied: candidateContext.appliedJobMap.has(job.id),
        applicationStatus: candidateContext.appliedJobMap.get(job.id) || null
      };

      const matchResult = evaluateJobMatch(job, jobCtx);
      matchResult.userApplicationStatus = jobCtx.applicationStatus;

      if (matchResult.recommendationSection === 'applied') {
        applied.push(matchResult);
      } else if (matchResult.recommendationSection === 'recommended') {
        recommended.push(matchResult);
      } else if (matchResult.recommendationSection === 'eligible') {
        eligible.push(matchResult);
      } else if (matchResult.recommendationSection === 'potential') {
        potential.push(matchResult);
      } else {
        notEligible.push(matchResult);
      }
    }

    res.json({
      recommended,
      eligible,
      potential,
      notEligible,
      applied,
      stats: {
        totalOpenJobs: jobsRes.rows.length,
        eligibleCount: recommended.length + eligible.length,
        potentialCount: potential.length,
        appliedCount: applied.length
      }
    });
  } catch (error) {
    console.error('[GET /campus/jobs/eligible] error:', error);
    res.status(500).json({ error: 'Failed to compute eligible job recommendations' });
  }
});

// GET /api/campus/jobs - Browse open jobs (standard list)
router.get('/jobs', async (req, res) => {
  try {
    const collegeId = req.campusContext?.college_id;
    const candidateId = req.user.id;

    let query = `
      SELECT 
        j.*,
        COALESCE(cpc.company_name, j.company_name, 'Campus Placement Partner') as company_name,
        cpc.industry as company_industry,
        cpc.website as company_website,
        cpc.tier as company_tier,
        cpc.mou_signed as company_mou_signed,
        COALESCE(cpc.is_approved, TRUE) as company_is_approved,
        c.name as college_name,
        c.code as college_code,
        ha.id as user_application_id,
        ha.status as user_application_status,
        ha.created_at as applied_at,
        (SELECT COUNT(*) FROM hr_applications WHERE job_id = j.id) as total_applicants
      FROM hr_jobs j
      JOIN colleges c ON j.college_id = c.id
      LEFT JOIN college_partner_companies cpc ON (j.partner_company_id = cpc.id OR (j.college_id = cpc.college_id AND LOWER(j.company_name) = LOWER(cpc.company_name)))
      LEFT JOIN hr_applications ha ON ha.job_id = j.id AND ha.candidate_id = $1
      WHERE j.status = 'OPEN'
        AND (cpc.id IS NULL OR cpc.is_approved = TRUE)
    `;
    const params = [candidateId];

    if (collegeId) {
      query += ` AND j.college_id = $2`;
      params.push(collegeId);
    }

    query += ` ORDER BY j.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[GET /campus/jobs] error:', error);
    res.status(500).json({ error: 'Failed to load jobs' });
  }
});

// GET /api/campus/partner-companies - Get college-approved partner companies for students
router.get('/partner-companies', async (req, res) => {
  try {
    const collegeId = req.campusContext?.college_id;
    if (!collegeId) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT 
        cpc.id,
        cpc.company_name,
        cpc.industry,
        cpc.tier,
        cpc.website,
        cpc.notes,
        cpc.mou_signed,
        cpc.is_approved,
        cpc.created_at,
        COUNT(DISTINCT j.id) as active_drives_count
      FROM college_partner_companies cpc
      LEFT JOIN hr_jobs j ON (j.partner_company_id = cpc.id OR (j.college_id = cpc.college_id AND LOWER(j.company_name) = LOWER(cpc.company_name))) AND j.status = 'OPEN'
      WHERE cpc.college_id = $1 AND cpc.is_approved = TRUE
      GROUP BY cpc.id
      ORDER BY cpc.created_at DESC
    `, [collegeId]);

    const companies = result.rows;
    for (const comp of companies) {
      const jobsRes = await pool.query(`
        SELECT id, title, location, job_type, workplace_type, target_domain, skills, created_at,
               (SELECT COUNT(*) FROM hr_applications WHERE job_id = hr_jobs.id) as applicants_count
        FROM hr_jobs
        WHERE (partner_company_id = $1 OR (college_id = $2 AND LOWER(company_name) = LOWER($3)))
          AND status = 'OPEN'
        ORDER BY created_at DESC
      `, [comp.id, collegeId, comp.company_name]);
      comp.drives = jobsRes.rows;
    }

    res.json(companies);
  } catch (error) {
    console.error('[GET /campus/partner-companies] error:', error);
    res.status(500).json({ error: 'Failed to fetch approved partner companies' });
  }
});

// POST /api/campus/jobs/:id/apply - Student applies for a job
router.post('/jobs/:id/apply', async (req, res) => {
  try {
    const jobId = req.params.id;
    const candidateId = req.user.id;
    const { notes } = req.body;

    // Verify job exists and is OPEN
    const jobRes = await pool.query('SELECT * FROM hr_jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const job = jobRes.rows[0];
    // Hard Eligibility Validation using Stage 1 engine
    const candidateContext = await getCandidateMatchingContext(candidateId, job.college_id);
    candidateContext.hasApplied = false; // check fresh
    const hardEval = evaluateHardEligibility(job, candidateContext);

    if (!hardEval.isEligible) {
      return res.status(400).json({
        error: 'You do not currently meet the mandatory requirements for this position.',
        reason: hardEval.reasons[0] || 'Eligibility condition not satisfied',
        missingRequirements: hardEval.missingRequirements
      });
    }

    // Check if already applied
    const existing = await pool.query(
      'SELECT id, status FROM hr_applications WHERE job_id = $1 AND candidate_id = $2',
      [jobId, candidateId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already submitted an application for this position.',
        status: existing.rows[0].status 
      });
    }

    // Fetch user's latest resume URL if available
    const resumeRes = await pool.query(
      'SELECT file_url FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [candidateId]
    );
    const resumeUrl = resumeRes.rows.length > 0 ? resumeRes.rows[0].file_url : null;

    // If candidate does not have a campus_user row in this college, ensure they are enrolled as STUDENT
    if (job.college_id) {
      await pool.query(`
        INSERT INTO campus_users (user_id, college_id, system_role, status)
        VALUES ($1, $2, 'STUDENT', 'ACTIVE')
        ON CONFLICT (user_id, college_id) DO NOTHING
      `, [candidateId, job.college_id]);
    }

    const appRes = await pool.query(`
      INSERT INTO hr_applications (job_id, candidate_id, status, resume_url, notes)
      VALUES ($1, $2, 'APPLIED', $3, $4)
      RETURNING *
    `, [jobId, candidateId, resumeUrl, notes || null]);

    res.status(201).json({
      message: 'Application submitted successfully!',
      application: appRes.rows[0]
    });
  } catch (error) {
    console.error('[POST /campus/jobs/:id/apply] error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'You have already applied for this job.' });
    }
    res.status(500).json({ error: error.message || 'Failed to submit application' });
  }
});

// GET /api/campus/applications/my - Student's application history & live status
router.get('/applications/my', async (req, res) => {
  try {
    const candidateId = req.user.id;

    const result = await pool.query(`
      SELECT 
        ha.*,
        hj.title as job_title,
        hj.description as job_description,
        hj.skills as job_skills,
        hj.experience_level,
        hj.location as job_location,
        hj.job_type,
        hj.workplace_type,
        c.name as college_name,
        c.code as college_code,
        hi.id as interview_id,
        hi.schedule_time as interview_schedule_time,
        hi.stage as interview_stage,
        hi.status as interview_status,
        hi.feedback as interview_feedback
      FROM hr_applications ha
      JOIN hr_jobs hj ON ha.job_id = hj.id
      JOIN colleges c ON hj.college_id = c.id
      LEFT JOIN hr_interviews hi ON hi.application_id = ha.id
      WHERE ha.candidate_id = $1
      ORDER BY ha.created_at DESC
    `, [candidateId]);

    res.json(result.rows);
  } catch (error) {
    console.error('[GET /campus/applications/my] error:', error);
    res.status(500).json({ error: 'Failed to load your applications' });
  }
});

// DELETE /api/campus/applications/:id/withdraw - Student withdraws application
router.delete('/applications/:id/withdraw', async (req, res) => {
  try {
    const appId = req.params.id;
    const candidateId = req.user.id;

    const appRes = await pool.query(
      'SELECT id, status FROM hr_applications WHERE id = $1 AND candidate_id = $2',
      [appId, candidateId]
    );
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await pool.query(
      "UPDATE hr_applications SET status = 'WITHDRAWN', updated_at = NOW() WHERE id = $1",
      [appId]
    );

    res.json({ message: 'Application withdrawn successfully.' });
  } catch (error) {
    console.error('[DELETE /campus/applications/:id/withdraw] error:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

export default router;
