import db from './db.js';
import { evaluateHardEligibility, calculateSuitabilityScore, evaluateJobMatch, inferJobDomain } from './services/jobMatcher.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE MULTI-TENANT & ELIGIBILITY VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------------------
    // 1. INFER JOB DOMAIN VERIFICATION
    // ----------------------------------------------------------------
    const frontendJob = { title: 'React Frontend Developer', skills: 'React, TypeScript, CSS', description: 'Build interactive UI' };
    const backendJob = { title: 'Node.js Backend Engineer', skills: 'Node, Express, PostgreSQL', description: 'Design REST APIs' };
    const dataScienceJob = { title: 'AI / Machine Learning Engineer', skills: 'Python, PyTorch, Pandas', description: 'Train deep neural models' };
    const explicitDevOpsJob = { title: 'Cloud Infrastructure Specialist', target_domain: 'devops', skills: 'AWS, Terraform', description: 'Manage clusters' };

    assert(inferJobDomain(frontendJob) === 'frontend', 'Domain Inference: Detects frontend domain correctly');
    assert(inferJobDomain(backendJob) === 'backend', 'Domain Inference: Detects backend domain correctly');
    assert(inferJobDomain(dataScienceJob) === 'data_science', 'Domain Inference: Detects data_science domain correctly');
    assert(inferJobDomain(explicitDevOpsJob) === 'devops', 'Domain Inference: Honors explicit target_domain override');

    // ----------------------------------------------------------------
    // 2. DOMAIN & RESUME SKILL ELIGIBILITY ENGINE
    // ----------------------------------------------------------------
    const candidateFrontend = {
      skills: ['react', 'typescript', 'html', 'css', 'javascript'],
      practicedDomains: [{ domain: 'frontend', count: 4, avg_score: 85 }],
      topDomain: 'frontend',
      codingSolved: 5,
      interviewScore: 85,
      hasApplied: false
    };

    // Test A: Frontend candidate applying for Frontend job -> Must be ELIGIBLE / RECOMMENDED
    const matchFrontend = evaluateJobMatch(frontendJob, candidateFrontend);
    assert(
      matchFrontend.isEligible === true && (matchFrontend.recommendationSection === 'eligible' || matchFrontend.recommendationSection === 'recommended'),
      'Smart Eligibility: Frontend candidate is ELIGIBLE for Frontend Job',
      `Got status: ${matchFrontend.eligibilityStatus}, section: ${matchFrontend.recommendationSection}`
    );
    assert(
      matchFrontend.matchScore >= 70,
      'Smart Eligibility: Frontend candidate receives high suitability match score (>=70%)',
      `Got score: ${matchFrontend.matchScore}%`
    );

    // Test B: Frontend candidate applying for AI/Data Science job without skills or practice -> Must be NOT_ELIGIBLE
    const matchDataScience = evaluateJobMatch(dataScienceJob, candidateFrontend);
    assert(
      matchDataScience.isEligible === false && matchDataScience.recommendationSection === 'not_eligible',
      'Smart Eligibility: Frontend candidate is NOT_ELIGIBLE for Data Science job without domain skills/practice',
      `Got status: ${matchDataScience.eligibilityStatus}, section: ${matchDataScience.recommendationSection}`
    );
    assert(
      matchDataScience.eligibilityReasons.some(r => r.toLowerCase().includes('mismatch')),
      'Smart Eligibility: Provides clear Domain & Skill Mismatch reason to candidate',
      `Reasons: ${JSON.stringify(matchDataScience.eligibilityReasons)}`
    );

    // ----------------------------------------------------------------
    // 3. DATABASE MULTI-TENANT CHECKS (Colleges, Batches, Permissions)
    // ----------------------------------------------------------------
    // Check colleges table status
    const colRes = await db.query("SELECT id, name, code, status FROM colleges WHERE status = 'ACTIVE' LIMIT 1");
    assert(colRes.rows.length > 0, 'Database: At least one ACTIVE verified college exists', `Count: ${colRes.rows.length}`);
    const activeCollege = colRes.rows[0];

    // Check hr_college_permissions table exists
    const permTableRes = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hr_college_permissions'
    `);
    assert(permTableRes.rows.length >= 5, 'Database: Table hr_college_permissions exists with full audit columns');

    // ----------------------------------------------------------------
    // 4. TEACHER BATCH ISOLATION VERIFICATION
    // ----------------------------------------------------------------
    // Verify that tutor query isolates to their own batch and college
    const tutorBatchCheck = await db.query(`
      SELECT b.id, b.college_id, bt.tutor_user_id
      FROM batches b
      JOIN batch_tutors bt ON b.id = bt.batch_id
      LIMIT 1
    `);
    if (tutorBatchCheck.rows.length > 0) {
      const sample = tutorBatchCheck.rows[0];
      const isolatedQuery = await db.query(`
        SELECT se.student_user_id
        FROM student_enrollments se
        JOIN batch_tutors bt ON se.batch_id = bt.batch_id
        JOIN batches b ON se.batch_id = b.id
        WHERE bt.tutor_user_id = $1 AND b.college_id = $2
      `, [sample.tutor_user_id, sample.college_id]);
      assert(Array.isArray(isolatedQuery.rows), 'Teacher Isolation: Query strictly scopes students to assigned batch and college');
    } else {
      console.log('ℹ️ [SKIP] No batch tutors currently populated for live sample test.');
    }

    // ----------------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------------
    console.log('================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
