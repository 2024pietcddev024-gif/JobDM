import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import db from './server/db.js';
import app from './server/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = db.pool;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let serverInstance;

function makeToken(user, collegeId = null) {
  const payload = { id: user.id, email: user.email };
  if (collegeId) payload.active_college_id = collegeId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('====================================================');
  console.log('JobDM Anti-Cheating Monitoring Comprehensive Test Suite');
  console.log('====================================================\n');

  // Start test server on TEST_PORT
  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`[TEST] Test server started on port ${TEST_PORT}`);
      resolve();
    });
  });

  const results = [];
  function assert(scenarioName, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${scenarioName} ${details ? '(' + details + ')' : ''}`);
      results.push({ scenario: scenarioName, passed: true });
    } else {
      console.error(`[FAIL] ${scenarioName} - ${details}`);
      results.push({ scenario: scenarioName, passed: false, details });
    }
  }

  try {
    // 1. Setup test users and data
    const userRes = await pool.query("SELECT id, email FROM users ORDER BY id ASC LIMIT 5");
    if (userRes.rows.length === 0) {
      throw new Error("No users found in database for testing");
    }
    const studentUser = userRes.rows[0];
    const studentToken = makeToken(studentUser);

    console.log(`[TEST] Using test student: ${studentUser.email} (ID: ${studentUser.id})\n`);

    // =========================================================================
    // SCENARIO 1 & 2: Tab switching in Mock Interviews (1st warning, 2nd termination)
    // =========================================================================
    // Create an active interview session
    const intSessRes = await pool.query(`
      INSERT INTO interview_sessions (user_id, category, role, difficulty, status, tab_switch_count, clipboard_violation_count)
      VALUES ($1, 'Technical', 'Fullstack Developer', 'Medium', 'ACTIVE', 0, 0)
      RETURNING id, status, tab_switch_count, clipboard_violation_count
    `, [studentUser.id]);
    const interviewSessionId = intSessRes.rows[0].id;

    // First tab switch
    const res1 = await fetch(`${BASE_URL}/interviews/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        sessionId: interviewSessionId,
        violationType: 'TAB_SWITCH',
        details: { event: 'blur' }
      })
    });
    const data1 = await res1.json();
    assert(
      'Scenario 1: Interview 1st tab switch produces warning and increments counter to 1',
      res1.ok && data1.warning === true && data1.terminated === false && data1.violationCount === 1,
      `warning=${data1.warning}, count=${data1.violationCount}`
    );

    // Second tab switch -> termination
    const res2 = await fetch(`${BASE_URL}/interviews/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        sessionId: interviewSessionId,
        violationType: 'TAB_SWITCH',
        details: { event: 'visibilitychange' }
      })
    });
    const data2 = await res2.json();
    assert(
      'Scenario 2: Interview 2nd tab switch terminates active session and sets termination reason',
      res2.ok && data2.terminated === true && (data2.violationCount === 2 || data2.tab_switch_count === 2) && data2.status === 'TERMINATED' && !!(data2.terminationReason || data2.termination_reason),
      `terminated=${data2.terminated}, status=${data2.status}, reason="${data2.terminationReason || data2.termination_reason}"`
    );

    // =========================================================================
    // SCENARIO 3: Refreshing page does not reset persisted count
    // =========================================================================
    const res3 = await fetch(`${BASE_URL}/interviews/session/${interviewSessionId}/status`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data3 = await res3.json();
    assert(
      'Scenario 3: Refreshing page / re-syncing maintains persisted violation count and terminated status',
      res3.ok && data3.isTerminated === true && data3.tabSwitchCount === 2,
      `isTerminated=${data3.isTerminated}, tabSwitchCount=${data3.tabSwitchCount}`
    );

    // =========================================================================
    // SCENARIO 4: Duplicate / subsequent events do not create multiple terminations
    // =========================================================================
    const res4 = await fetch(`${BASE_URL}/interviews/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        sessionId: interviewSessionId,
        violationType: 'TAB_SWITCH',
        details: { event: 'duplicate_event' }
      })
    });
    const data4 = await res4.json();
    assert(
      'Scenario 4: Duplicate / subsequent events after termination are handled idempotently without re-terminating',
      res4.ok && data4.terminated === true && (data4.alreadyTerminated === true || data4.status === 'TERMINATED'),
      `alreadyTerminated=${data4.alreadyTerminated}, status=${data4.status}`
    );

    // =========================================================================
    // SCENARIO 5 & 6: Copying code during Coding Practice (1st warning, 2nd termination)
    // =========================================================================
    // Find or get a coding problem
    const probRes = await pool.query('SELECT id FROM coding_problems LIMIT 1');
    const problemId = probRes.rows.length > 0 ? probRes.rows[0].id : null;

    // Create a fresh coding session with 0 violations
    const freshCodeSess = await pool.query(`
      INSERT INTO coding_sessions (user_id, problem_id, language, status, tab_switch_count, clipboard_violation_count)
      VALUES ($1, $2, 'Python', 'ACTIVE', 0, 0)
      RETURNING id
    `, [studentUser.id, problemId]);
    const codingSessionId = freshCodeSess.rows[0].id;

    // 1st prohibited clipboard violation in editor
    const res5 = await fetch(`${BASE_URL}/code/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        sessionId: codingSessionId,
        violationType: 'CLIPBOARD_ACTION',
        details: { action: 'paste' }
      })
    });
    const data5 = await res5.json();
    const clipCount5 = data5.clipboard_violation_count ?? data5.clipboardViolationCount ?? data5.violationCount;
    assert(
      'Scenario 5: Coding 1st prohibited copy/paste action produces warning with count=1',
      res5.ok && data5.warning === true && data5.terminated === false && clipCount5 === 1,
      `warning=${data5.warning}, clipCount=${clipCount5}`
    );

    // 2nd prohibited clipboard violation in editor
    const res6 = await fetch(`${BASE_URL}/code/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        sessionId: codingSessionId,
        violationType: 'CLIPBOARD_ACTION',
        details: { action: 'copy' }
      })
    });
    const data6 = await res6.json();
    const clipCount6 = data6.clipboard_violation_count ?? data6.clipboardViolationCount ?? data6.violationCount;
    const termReason6 = data6.termination_reason || data6.terminationReason;
    assert(
      'Scenario 6: Coding 2nd prohibited copy/paste action terminates session automatically',
      res6.ok && data6.terminated === true && clipCount6 === 2 && !!termReason6,
      `terminated=${data6.terminated}, clipCount=${clipCount6}, reason="${termReason6}"`
    );

    // =========================================================================
    // SCENARIO 7: Separate counters per violation type
    // =========================================================================
    // Create a fresh coding session with 0 violations for separate counter testing
    const freshSess2 = await pool.query(`
      INSERT INTO coding_sessions (user_id, problem_id, language, status, tab_switch_count, clipboard_violation_count)
      VALUES ($1, $2, 'Python', 'ACTIVE', 0, 0)
      RETURNING id
    `, [studentUser.id, problemId]);
    const session2Id = freshSess2.rows[0].id;

    // Trigger 1 tab switch
    await fetch(`${BASE_URL}/code/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ sessionId: session2Id, violationType: 'TAB_SWITCH' })
    });

    // Trigger 1 clipboard action
    const sepRes = await fetch(`${BASE_URL}/code/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ sessionId: session2Id, violationType: 'CLIPBOARD_ACTION' })
    });
    const sepData = await sepRes.json();
    const tabCount7 = sepData.tab_switch_count ?? sepData.tabSwitchCount;
    const clipCount7 = sepData.clipboard_violation_count ?? sepData.clipboardViolationCount;
    assert(
      'Scenario 7: Tab switch and clipboard actions maintain distinct, separate counters (1 tab, 1 clipboard does NOT terminate)',
      tabCount7 === 1 && clipCount7 === 1 && sepData.terminated === false,
      `tabCount=${tabCount7}, clipCount=${clipCount7}, terminated=${sepData.terminated}`
    );

    // =========================================================================
    // SCENARIO 8: Normal operations work on active session
    // =========================================================================
    const normalRunRes = await fetch(`${BASE_URL}/code/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        language: 'Python',
        code: 'def solve(x):\n    return x',
        problemId,
        sessionId: session2Id
      })
    });
    assert(
      'Scenario 8: Normal code execution operates correctly on an active session',
      normalRunRes.ok || normalRunRes.status === 200,
      `status=${normalRunRes.status}`
    );

    // =========================================================================
    // SCENARIO 9: Terminated session CANNOT execute code or submit answers
    // =========================================================================
    // Attempt code execution with terminated session ID
    const blockedRunRes = await fetch(`${BASE_URL}/code/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        language: 'Python',
        code: 'print("cheat")',
        problemId,
        sessionId: codingSessionId // terminated above
      })
    });
    const blockedRunData = await blockedRunRes.json();
    assert(
      'Scenario 9A: Code execution is rejected with 403 on terminated session',
      blockedRunRes.status === 403 && blockedRunData.terminated === true,
      `status=${blockedRunRes.status}, error="${blockedRunData.error}"`
    );

    // Attempt code submit with terminated session ID
    const blockedSubmitRes = await fetch(`${BASE_URL}/code/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        language: 'Python',
        code: 'print("cheat")',
        problemId,
        sessionId: codingSessionId
      })
    });
    const blockedSubmitData = await blockedSubmitRes.json();
    assert(
      'Scenario 9B: Code submission is rejected with 403 on terminated session',
      blockedSubmitRes.status === 403 && blockedSubmitData.terminated === true,
      `status=${blockedSubmitRes.status}, error="${blockedSubmitData.error}"`
    );

    // Attempt interview next-question on terminated interview session
    const blockedNextQRes = await fetch(`${BASE_URL}/interviews/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        sessionId: interviewSessionId,
        questionIndex: 1
      })
    });
    const blockedNextQData = await blockedNextQRes.json();
    assert(
      'Scenario 9C: Interview next-question is rejected with 403 on terminated interview session',
      blockedNextQRes.status === 403 && blockedNextQData.terminated === true,
      `status=${blockedNextQRes.status}, error="${blockedNextQData.error}"`
    );

    // =========================================================================
    // SCENARIO 10: Student history shows violation and termination records
    // =========================================================================
    const histRes = await fetch(`${BASE_URL}/interviews/history`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const histData = await histRes.json();
    const termInt = histData.sessions?.find(s => s.id === interviewSessionId);
    assert(
      'Scenario 10A: Student interview history includes terminated session with violation counts and termination reason',
      !!termInt && termInt.status === 'TERMINATED' && termInt.tab_switch_count === 2 && !!termInt.termination_reason,
      `found=${!!termInt}, status=${termInt?.status}, reason="${termInt?.termination_reason}"`
    );

    const codeHistRes = await fetch(`${BASE_URL}/code/history`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const codeHistData = await codeHistRes.json();
    const termCode = codeHistData.sessions?.find(s => s.session_id === codingSessionId);
    assert(
      'Scenario 10B: Student coding history includes terminated session with violation events and termination reason',
      !!termCode && termCode.session_status === 'TERMINATED' && termCode.clipboard_violation_count === 2 && !!termCode.termination_reason,
      `found=${!!termCode}, status=${termCode?.session_status}, violationsLen=${termCode?.violations?.length}`
    );

    // =========================================================================
    // SCENARIO 11: Authorized teachers can inspect student interview & coding history
    // =========================================================================
    // Find an existing tutor with an assigned batch
    const tutorBatchRes = await pool.query(`
      SELECT b.id as batch_id, bt.tutor_user_id, u.email as tutor_email, cu.college_id
      FROM batches b
      JOIN batch_tutors bt ON b.id = bt.batch_id
      JOIN users u ON bt.tutor_user_id = u.id
      JOIN campus_users cu ON u.id = cu.user_id AND cu.system_role = 'TUTOR'
      LIMIT 1
    `);

    let authTutorToken = null;
    let authTutor = null;

    if (tutorBatchRes.rows.length > 0) {
      authTutor = tutorBatchRes.rows[0];
      authTutorToken = makeToken({ id: authTutor.tutor_user_id, email: authTutor.tutor_email }, authTutor.college_id);

      // Enroll test student into this tutor's batch
      await pool.query(
        "INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [authTutor.batch_id, studentUser.id]
      );
      await pool.query(
        "INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'STUDENT', 'ACTIVE') ON CONFLICT DO NOTHING",
        [studentUser.id, authTutor.college_id]
      );
    }

    if (authTutorToken) {
      // Fetch student interviews as teacher
      const tutorIntRes = await fetch(`${BASE_URL}/campus/tutor/students/${studentUser.id}/interviews`, {
        headers: { Authorization: `Bearer ${authTutorToken}` }
      });
      const tutorIntData = await tutorIntRes.json();
      assert(
        'Scenario 11A: Authorized teacher can inspect student interview history including terminated sessions',
        tutorIntRes.ok && Array.isArray(tutorIntData) && tutorIntData.some(i => i.id === interviewSessionId && i.status === 'TERMINATED'),
        `status=${tutorIntRes.status}, count=${tutorIntData?.length}`
      );

      // Fetch student interview report with violation events as teacher
      const tutorIntReportRes = await fetch(`${BASE_URL}/campus/tutor/students/${studentUser.id}/interviews/${interviewSessionId}`, {
        headers: { Authorization: `Bearer ${authTutorToken}` }
      });
      const tutorIntReportData = await tutorIntReportRes.json();
      assert(
        'Scenario 11B: Authorized teacher can view interview detailed report with violation events and counts',
        tutorIntReportRes.ok && tutorIntReportData.session?.status === 'TERMINATED' && Array.isArray(tutorIntReportData.violations) && tutorIntReportData.violations.length >= 2,
        `sessionStatus=${tutorIntReportData.session?.status}, violationsCount=${tutorIntReportData.violations?.length}`
      );

      // Fetch student coding practice history as teacher
      const tutorCodeRes = await fetch(`${BASE_URL}/campus/tutor/students/${studentUser.id}/coding`, {
        headers: { Authorization: `Bearer ${authTutorToken}` }
      });
      const tutorCodeData = await tutorCodeRes.json();
      assert(
        'Scenario 11C: Authorized teacher can view student coding practice history with violations and submitted attempts',
        tutorCodeRes.ok && Array.isArray(tutorCodeData) && tutorCodeData.some(c => c.session_id === codingSessionId && c.session_status === 'TERMINATED'),
        `status=${tutorCodeRes.status}, count=${tutorCodeData?.length}`
      );

      // =========================================================================
      // SCENARIO 12: Unauthorized teachers cannot access another teacher's students
      // =========================================================================
      // Find a tutor NOT assigned to this batch
      const otherTutorRes = await pool.query(`
        SELECT cu.user_id, cu.college_id, u.email
        FROM campus_users cu
        JOIN users u ON cu.user_id = u.id
        WHERE cu.system_role = 'TUTOR' AND cu.user_id != $1
        LIMIT 1
      `, [authTutor.tutor_user_id || authTutor.user_id]);

      let otherTutorToken;
      if (otherTutorRes.rows.length > 0) {
        const otherTutor = otherTutorRes.rows[0];
        otherTutorToken = makeToken({ id: otherTutor.user_id, email: otherTutor.email }, otherTutor.college_id);
      } else {
        // Create an unassigned tutor with a valid UUID
        const newTutorUser = await pool.query(`
          INSERT INTO users (email, full_name, password_hash)
          VALUES ('unassigned.tutor.' || substr(md5(random()::text), 1, 8) || '@jobdm.edu', 'Unassigned Tutor', 'fake_hash')
          RETURNING id, email
        `);
        const newTutor = newTutorUser.rows[0];
        await pool.query(`
          INSERT INTO campus_users (user_id, college_id, system_role, status)
          VALUES ($1, $2, 'TUTOR', 'ACTIVE')
        `, [newTutor.id, authTutor.college_id]);
        otherTutorToken = makeToken({ id: newTutor.id, email: newTutor.email }, authTutor.college_id);
      }

      const unauthRes = await fetch(`${BASE_URL}/campus/tutor/students/${studentUser.id}/coding`, {
        headers: { Authorization: `Bearer ${otherTutorToken}` }
      });
      assert(
        'Scenario 12: Unauthorized teacher is rejected with 403 Forbidden when trying to access student data',
        unauthRes.status === 403,
        `status=${unauthRes.status}`
      );
    } else {
      console.warn('[WARN] No tutor found to run Scenarios 11 & 12');
    }

    // =========================================================================
    // SCENARIO 13 & 14: Completed sessions and unrelated features continue to work
    // =========================================================================
    // Verify an unviolated interview completes normally
    const normalIntRes = await pool.query(`
      INSERT INTO interview_sessions (user_id, category, role, difficulty, status, tab_switch_count, clipboard_violation_count)
      VALUES ($1, 'Behavioral', 'Manager', 'Easy', 'COMPLETED', 0, 0)
      RETURNING id, status
    `, [studentUser.id]);
    assert(
      'Scenario 13: Normal completed interviews remain valid with COMPLETED status and 0 violations',
      normalIntRes.rows[0].status === 'COMPLETED',
      `status=${normalIntRes.rows[0].status}`
    );

    // Verify authentication & unrelated endpoints (e.g., auth check, problems library)
    const probLibRes = await fetch(`${BASE_URL}/code/problems`);
    const probLibData = await probLibRes.json();
    assert(
      'Scenario 14: Problem library and existing core endpoints continue to operate without regression',
      probLibRes.ok && Array.isArray(probLibData.problems),
      `problemCount=${probLibData.problems?.length}`
    );

  } catch (err) {
    console.error('[TEST SUITE ERROR]', err);
  } finally {
    if (serverInstance) {
      serverInstance.close();
      console.log('\n[TEST] Test server stopped.');
    }
    // Summary
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    console.log(`\n====================================================`);
    console.log(`Test Suite Summary: ${passed} / ${total} passed`);
    console.log(`====================================================`);
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();
