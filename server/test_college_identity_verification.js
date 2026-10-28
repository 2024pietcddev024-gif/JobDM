import assert from 'assert';
import db from './db.js';
import { getJwtSecret } from './config/jwt.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Start server or connect to it
import app from './server.js';

const BASE_URL = 'http://localhost:3001';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VERIFICATION: COLLEGE IDENTITY & INSTITUTIONAL LOGIN');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function report(condition, testNumber, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] Scenario ${testNumber}: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Scenario ${testNumber}: ${testName} - ${details}`);
      failed++;
    }
  }

  // Allow server to bind
  await wait(1000);

  const timestamp = Date.now();
  let testActiveCollege;
  let testPendingCollege;
  let testSuspendedCollege;

  try {
    // Setup test colleges in DB
    const activeColRes = await db.query(
      `INSERT INTO colleges (name, code, domain, official_email_domain, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, name, code, domain, status`,
      [`Test Active College ${timestamp}`, `TAC-${timestamp}`, `tactest${timestamp}.edu`, `tactest${timestamp}.edu`]
    );
    testActiveCollege = activeColRes.rows[0];

    const pendingColRes = await db.query(
      `INSERT INTO colleges (name, code, domain, official_email_domain, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id, name, code, domain, status`,
      [`Test Pending College ${timestamp}`, `TPC-${timestamp}`, `tpctest${timestamp}.edu`, `tpctest${timestamp}.edu`]
    );
    testPendingCollege = pendingColRes.rows[0];

    const suspColRes = await db.query(
      `INSERT INTO colleges (name, code, domain, official_email_domain, status)
       VALUES ($1, $2, $3, $4, 'SUSPENDED')
       RETURNING id, name, code, domain, status`,
      [`Test Suspended College ${timestamp}`, `TSC-${timestamp}`, `tsctest${timestamp}.edu`, `tsctest${timestamp}.edu`]
    );
    testSuspendedCollege = suspColRes.rows[0];

    // -------------------------------------------------------------------------
    // Scenario 1: Student registers with ACTIVE college + completes verification
    // -------------------------------------------------------------------------
    const s1Email = `s1_${timestamp}@tactest${timestamp}.edu`;
    const s1Password = 'Password123!';
    const regRes1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scenario 1 Student',
        email: s1Email,
        password: s1Password,
        college_code: testActiveCollege.code
      })
    });
    const regData1 = await regRes1.json();
    
    // Check that registration succeeded and generated a verification token
    const tokenDb1 = await db.query(
      `SELECT token, used_at FROM college_verification_tokens 
       WHERE college_id = $1 AND institutional_email = $2`,
      [testActiveCollege.id, s1Email]
    );

    const tokenReceived = regData1.verificationToken || (tokenDb1.rows[0] && tokenDb1.rows[0].token);

    // Verify the institutional token
    const verifyRes1 = await fetch(`${BASE_URL}/api/auth/verify-institutional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: s1Email,
        token: tokenReceived
      })
    });
    const verifyData1 = await verifyRes1.json();

    // Check login after verification
    const loginRes1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s1Email, password: s1Password })
    });
    const loginData1 = await loginRes1.json();

    report(
      (regRes1.status === 200 || regRes1.status === 201) &&
      regData1.verificationRequired === true &&
      verifyRes1.status === 200 &&
      loginRes1.status === 200 &&
      Boolean(loginData1.token),
      1,
      'Student registers with ACTIVE college + completes token verification',
      `Reg status: ${regRes1.status}, Verify status: ${verifyRes1.status}, Login status: ${loginRes1.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 2: Student registration against unknown college code rejected (400)
    // -------------------------------------------------------------------------
    const s2Email = `s2_${timestamp}@example.com`;
    const regRes2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scenario 2 Student',
        email: s2Email,
        password: 'Password123!',
        college_code: `INVALID_CODE_${timestamp}`
      })
    });
    report(
      regRes2.status === 400,
      2,
      'Student registration against unknown college code rejected with 400',
      `Got status: ${regRes2.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 3: Student registration against PENDING college rejected (403)
    // -------------------------------------------------------------------------
    const s3Email = `s3_${timestamp}@tpctest${timestamp}.edu`;
    const regRes3 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scenario 3 Student',
        email: s3Email,
        password: 'Password123!',
        college_code: testPendingCollege.code
      })
    });
    const regData3 = await regRes3.json();
    report(
      regRes3.status === 403 && regData3.error?.toLowerCase().includes('pending'),
      3,
      'Student registration against PENDING college rejected with 403',
      `Got status: ${regRes3.status}, error: ${regData3.error}`
    );

    // -------------------------------------------------------------------------
    // Scenario 4: Student registration against INACTIVE/SUSPENDED college rejected (403)
    // -------------------------------------------------------------------------
    const s4Email = `s4_${timestamp}@tsctest${timestamp}.edu`;
    const regRes4 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scenario 4 Student',
        email: s4Email,
        password: 'Password123!',
        college_code: testSuspendedCollege.code
      })
    });
    const regData4 = await regRes4.json();
    report(
      regRes4.status === 403 && (regData4.error?.toLowerCase().includes('suspended') || regData4.error?.toLowerCase().includes('inactive')),
      4,
      'Student registration against INACTIVE/SUSPENDED college rejected with 403',
      `Got status: ${regRes4.status}, error: ${regData4.error}`
    );

    // -------------------------------------------------------------------------
    // Scenario 5: Teacher account cannot be self-registered via public signup
    // -------------------------------------------------------------------------
    const s5Email = `teacher_${timestamp}@tactest${timestamp}.edu`;
    const regRes5 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Self Assigned Teacher',
        email: s5Email,
        password: 'Password123!',
        role: 'TEACHER',
        college_code: testActiveCollege.code
      })
    });
    report(
      regRes5.status === 403,
      5,
      'Teacher account cannot be self-registered via public signup (403)',
      `Got status: ${regRes5.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 6: Unverified institutional email leaves membership in PENDING_VERIFICATION (login 403)
    // -------------------------------------------------------------------------
    const s6Email = `s6_${timestamp}@tactest${timestamp}.edu`;
    const s6Password = 'Password123!';
    const regRes6 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scenario 6 Student',
        email: s6Email,
        password: s6Password,
        college_code: testActiveCollege.code
      })
    });
    // Attempt login without verifying token
    const loginRes6 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s6Email, password: s6Password })
    });
    const loginData6 = await loginRes6.json();
    report(
      loginRes6.status === 403 && loginData6.error?.toLowerCase().includes('verification'),
      6,
      'Unverified institutional email leaves membership in PENDING_VERIFICATION and blocks login (403)',
      `Got status: ${loginRes6.status}, error: ${loginData6.error}`
    );

    // -------------------------------------------------------------------------
    // Scenario 7: Student cannot self-assign to another college by tampering with college_id
    // -------------------------------------------------------------------------
    const s7Email = `s7_${timestamp}@tactest${timestamp}.edu`;
    const regRes7 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tamperer Student',
        email: s7Email,
        password: 'Password123!',
        college_code: testActiveCollege.code,
        college_id: testSuspendedCollege.id // Attempting to tamper college_id
      })
    });
    // Verify membership belongs to testActiveCollege.id, not testSuspendedCollege.id
    const userDb7 = await db.query(
      `SELECT cu.college_id FROM campus_users cu
       JOIN users u ON cu.user_id = u.id
       WHERE u.email = $1`,
      [s7Email]
    );
    report(
      userDb7.rows.length > 0 && userDb7.rows[0].college_id === testActiveCollege.id,
      7,
      'Student cannot self-assign to arbitrary college by tampering with college_id in request body',
      `Resolved college_id: ${userDb7.rows[0]?.college_id}, Expected: ${testActiveCollege.id}`
    );

    // -------------------------------------------------------------------------
    // Scenario 8: Student cannot self-assign role SUPER_ADMIN or COLLEGE_ADMIN
    // -------------------------------------------------------------------------
    const s8Email = `attacker_${timestamp}@example.com`;
    const regRes8 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker Admin',
        email: s8Email,
        password: 'Password123!',
        role: 'SUPER_ADMIN'
      })
    });
    report(
      regRes8.status === 403,
      8,
      'Student cannot self-assign role SUPER_ADMIN or privileged role on signup (403)',
      `Got status: ${regRes8.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 9: Existing user login blocked when their college is suspended (403)
    // -------------------------------------------------------------------------
    // Create an active student in testActiveCollege
    const s9Email = `s9_${timestamp}@tactest${timestamp}.edu`;
    const s9Password = 'Password123!';
    const regRes9 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scenario 9 Student',
        email: s9Email,
        password: s9Password,
        college_code: testActiveCollege.code
      })
    });
    const regData9 = await regRes9.json();
    // Verify token to make active
    await fetch(`${BASE_URL}/api/auth/verify-institutional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s9Email, token: regData9.verificationToken })
    });
    // Suspend the college
    await db.query(`UPDATE colleges SET status = 'SUSPENDED' WHERE id = $1`, [testActiveCollege.id]);

    const loginRes9 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s9Email, password: s9Password })
    });
    const loginData9 = await loginRes9.json();
    report(
      loginRes9.status === 403 && (loginData9.error?.toLowerCase().includes('inactive') || loginData9.error?.toLowerCase().includes('suspended')),
      9,
      'Existing user login blocked when their college is suspended (403)',
      `Got status: ${loginRes9.status}, error: ${loginData9.error}`
    );
    // Reactivate testActiveCollege
    await db.query(`UPDATE colleges SET status = 'ACTIVE' WHERE id = $1`, [testActiveCollege.id]);

    // -------------------------------------------------------------------------
    // Scenario 10: Protected APIs enforce current membership and active college status
    // -------------------------------------------------------------------------
    // Log in s9 now that college is reactivated
    const loginRes10 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s9Email, password: s9Password })
    });
    const loginData10 = await loginRes10.json();
    const activeUserToken = loginData10.token;

    // Check that active user can access protected route
    const checkActive10 = await fetch(`${BASE_URL}/api/campus/me`, {
      headers: { Authorization: `Bearer ${activeUserToken}` }
    });
    report(
      checkActive10.status === 200,
      10,
      'Protected APIs enforce current membership and active college status for active user (200)',
      `Got status: ${checkActive10.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 11: Teacher cannot read another college's student reports
    // -------------------------------------------------------------------------
    // Create Teacher in College A
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const uTeacherRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      ['Teacher Col A', `t_cola_${timestamp}@tactest${timestamp}.edu`, passwordHash]
    );
    const teacherId = uTeacherRes.rows[0].id;
    await db.query(
      `INSERT INTO campus_users (user_id, college_id, system_role, status)
       VALUES ($1, $2, 'TUTOR', 'ACTIVE')`,
      [teacherId, testActiveCollege.id]
    );
    const teacherToken = jwt.sign(
      { id: teacherId, email: `t_cola_${timestamp}@tactest${timestamp}.edu`, active_college_id: testActiveCollege.id },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Create Student in College B (testPendingCollege or another college)
    const uStudentBRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      ['Student Col B', `s_colb_${timestamp}@tpctest${timestamp}.edu`, passwordHash]
    );
    const studentBId = uStudentBRes.rows[0].id;
    await db.query(
      `INSERT INTO campus_users (user_id, college_id, system_role, status)
       VALUES ($1, $2, 'STUDENT', 'ACTIVE')`,
      [studentBId, testPendingCollege.id]
    );

    // Teacher tries to fetch Student B's interview overview/analytics
    const crossAccessRes = await fetch(`${BASE_URL}/api/campus/tutor/students/${studentBId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    // Expected: 403 or 404 (not accessible to teacher of different college)
    report(
      crossAccessRes.status === 403 || crossAccessRes.status === 404,
      11,
      'Teacher cannot read another college student report (403/404 isolated)',
      `Got status: ${crossAccessRes.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 12: Teacher cannot read students outside assigned batches
    // -------------------------------------------------------------------------
    // Create department & batches in College A
    const deptRes = await db.query(
      `INSERT INTO departments (college_id, name, code) VALUES ($1, $2, $3) RETURNING id`,
      [testActiveCollege.id, `CS Department ${timestamp}`, `CS-${timestamp}`]
    );
    const deptId = deptRes.rows[0].id;

    const b1Res = await db.query(
      `INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, $3, '2025-2026') RETURNING id`,
      [testActiveCollege.id, deptId, `Batch A-${timestamp}`]
    );
    const batch1Id = b1Res.rows[0].id;
    const b2Res = await db.query(
      `INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, $3, '2025-2026') RETURNING id`,
      [testActiveCollege.id, deptId, `Batch B-${timestamp}`]
    );
    const batch2Id = b2Res.rows[0].id;

    // Assign Teacher to Batch 1 only
    await db.query(
      `INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)`,
      [batch1Id, teacherId]
    );

    // Query tutor batches
    const tutorBatchesRes = await fetch(`${BASE_URL}/api/campus/tutor/batches`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const tutorBatchesData = await tutorBatchesRes.json();
    const batchList = Array.isArray(tutorBatchesData) ? tutorBatchesData : (tutorBatchesData.batches || []);
    const returnedBatchIds = batchList.map(b => b.id);
    const isolationSatisfied = returnedBatchIds.includes(batch1Id) && !returnedBatchIds.includes(batch2Id);

    report(
      isolationSatisfied,
      12,
      'Teacher cannot read students outside assigned batches (batch isolation verified)',
      `Returned batch IDs: ${JSON.stringify(returnedBatchIds)}`
    );

    // -------------------------------------------------------------------------
    // Scenario 13: College suspension revokes access for already-issued JWT tokens immediately
    // -------------------------------------------------------------------------
    // Active user s9 has a valid JWT token issued when college was ACTIVE
    // Suspend testActiveCollege
    await db.query(`UPDATE colleges SET status = 'SUSPENDED' WHERE id = $1`, [testActiveCollege.id]);

    const liveJwtCheck = await fetch(`${BASE_URL}/api/campus/me`, {
      headers: { Authorization: `Bearer ${activeUserToken}` }
    });
    report(
      liveJwtCheck.status === 403,
      13,
      'College suspension immediately revokes access for already-issued JWT tokens (403 dynamic invalidation)',
      `Got status: ${liveJwtCheck.status}`
    );
    // Reactivate testActiveCollege
    await db.query(`UPDATE colleges SET status = 'ACTIVE' WHERE id = $1`, [testActiveCollege.id]);

    // -------------------------------------------------------------------------
    // Scenario 14: Super Admin can activate and suspend colleges through protected endpoints
    // -------------------------------------------------------------------------
    // Create Super Admin user & token
    const uAdminRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      ['Super Admin Auditor', `super_admin_${timestamp}@jobdm.internal`, passwordHash]
    );
    const adminId = uAdminRes.rows[0].id;
    await db.query(
      `INSERT INTO campus_users (user_id, college_id, system_role, status)
       VALUES ($1, NULL, 'SUPER_ADMIN', 'ACTIVE')`,
      [adminId]
    );
    const adminToken = jwt.sign(
      { id: adminId, email: `super_admin_${timestamp}@jobdm.internal` },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    const suspendRes = await fetch(`${BASE_URL}/api/campus/registrar/colleges/${testActiveCollege.id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}` 
      },
      body: JSON.stringify({ status: 'SUSPENDED' })
    });
    const suspendData = await suspendRes.json();
    const updatedColStatus = suspendData.status;

    // Reactivate back to ACTIVE
    await fetch(`${BASE_URL}/api/campus/registrar/colleges/${testActiveCollege.id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}` 
      },
      body: JSON.stringify({ status: 'ACTIVE' })
    });

    report(
      suspendRes.status === 200 && updatedColStatus === 'SUSPENDED',
      14,
      'Super Admin can activate/suspend colleges through protected endpoints',
      `Suspend status: ${suspendRes.status}, New status: ${updatedColStatus}`
    );

    // -------------------------------------------------------------------------
    // Scenario 15: HR college permissions continue to work correctly
    // -------------------------------------------------------------------------
    // Create HR user
    const uHrRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      ['Recruiter HR', `recruiter_${timestamp}@hire.com`, passwordHash]
    );
    const hrId = uHrRes.rows[0].id;
    await db.query(
      `INSERT INTO campus_users (user_id, college_id, system_role, status)
       VALUES ($1, $2, 'HR', 'ACTIVE')`,
      [hrId, testActiveCollege.id]
    );
    const hrToken = jwt.sign(
      { id: hrId, email: `recruiter_${timestamp}@hire.com` },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Grant permission for testActiveCollege only, NOT testPendingCollege
    await db.query(
      `INSERT INTO hr_college_permissions (hr_user_id, college_id, status)
       VALUES ($1, $2, 'ACTIVE')`,
      [hrId, testActiveCollege.id]
    );

    // Try posting job to unauthorized college
    const postUnauthorizedRes = await fetch(`${BASE_URL}/api/campus/hr/jobs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}` 
      },
      body: JSON.stringify({
        title: 'Backend Engineer',
        company: 'Tech Corp',
        college_id: testPendingCollege.id
      })
    });

    // Try posting job to authorized college
    const postAuthorizedRes = await fetch(`${BASE_URL}/api/campus/hr/jobs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}` 
      },
      body: JSON.stringify({
        title: 'Backend Engineer',
        company: 'Tech Corp',
        college_id: testActiveCollege.id
      })
    });

    report(
      postUnauthorizedRes.status === 403 && postAuthorizedRes.status === 201,
      15,
      'HR college permissions: unauthorized college rejected (403), authorized accepted (201)',
      `Unauthorized status: ${postUnauthorizedRes.status}, Authorized status: ${postAuthorizedRes.status}`
    );

    // -------------------------------------------------------------------------
    // Scenario 16: Pre-approved roster enrolls student immediately with ACTIVE status
    // -------------------------------------------------------------------------
    const s16Email = `roster_student_${timestamp}@tactest${timestamp}.edu`;
    const s16Password = 'Password123!';
    // Add to approved roster first
    await db.query(
      `INSERT INTO college_approved_roster (college_id, institutional_email, full_name, role, status)
       VALUES ($1, $2, 'Preapproved Student', 'STUDENT', 'PRE_APPROVED')`,
      [testActiveCollege.id, s16Email]
    );

    const regRes16 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Preapproved Student',
        email: s16Email,
        password: s16Password,
        college_code: testActiveCollege.code
      })
    });
    const regData16 = await regRes16.json();

    // Verify student can immediately log in without token step
    const loginRes16 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s16Email, password: s16Password })
    });

    report(
      (regRes16.status === 200 || regRes16.status === 201) &&
      regData16.verificationRequired === false &&
      loginRes16.status === 200,
      16,
      'Pre-approved roster enrolls student immediately with ACTIVE status and direct login',
      `Reg status: ${regRes16.status}, verificationRequired: ${regData16.verificationRequired}, Login status: ${loginRes16.status}`
    );

    // -------------------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------------------
    console.log('================================================================');
    console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

runTests();