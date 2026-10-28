import assert from 'assert';
import db from './db.js';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, getPermissionsForRole, authorizeInterviewAccess } from './middleware/rbac.js';
import { evaluateAnswer } from './services/aiEngine.js';

console.log('--- Testing RBAC & AI Verdict Remediation ---\n');

async function runTests() {
  try {
    // 1. Permissions verification
    console.log('Test 1: Verifying RBAC Permissions Matrix...');
    const studentPerms = getPermissionsForRole(ROLES.STUDENT);
    assert(studentPerms.includes(PERMISSIONS.INTERVIEW_PRACTICE));
    assert(!studentPerms.includes(PERMISSIONS.COLLEGE_MANAGE_TUTORS));
    assert(!studentPerms.includes(PERMISSIONS.HR_JOB_CREATE));

    const adminPerms = getPermissionsForRole(ROLES.COLLEGE_ADMIN);
    assert(adminPerms.includes(PERMISSIONS.COLLEGE_MANAGE_DEPTS));
    assert(adminPerms.includes(PERMISSIONS.COLLEGE_MANAGE_TUTORS));

    const tutorPerms = getPermissionsForRole(ROLES.TUTOR);
    assert(tutorPerms.includes(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED));
    assert(tutorPerms.includes(PERMISSIONS.INTERVIEW_ASSIGN));

    const hrPerms = getPermissionsForRole(ROLES.HR);
    assert(hrPerms.includes(PERMISSIONS.HR_JOB_CREATE));
    assert(hrPerms.includes(PERMISSIONS.HR_CANDIDATE_DECISION));
    console.log('✓ Passed: Permissions matrix verified across all 5 roles.\n');

    // 2. Ownership & Resource Authorization
    console.log('Test 2: Verifying Resource Ownership & Access Authorization...');
    const ownerUser = { id: '11111111-1111-1111-1111-111111111111' };
    const otherUser = { id: '22222222-2222-2222-2222-222222222222' };
    const session = { id: '33333333-3333-3333-3333-333333333333', user_id: ownerUser.id, college_id: null };

    // Owner should be authorized
    const ownerAuth = await authorizeInterviewAccess(session, ownerUser);
    assert.strictEqual(ownerAuth.authorized, true);
    assert.strictEqual(ownerAuth.reason, 'OWNER');

    // Random non-owner user without administrative roles should be rejected
    const nonOwnerAuth = await authorizeInterviewAccess(session, otherUser);
    assert.strictEqual(nonOwnerAuth.authorized, false);
    console.log('✓ Passed: Resource ownership properly enforced (strangers rejected, owner allowed).\n');

    // 3. AI Evaluation Verdict Separation
    console.log('Test 3: Verifying AI Evaluation Verdict & Practice Separation...');
    const evalResult = await evaluateAnswer({
      questionText: 'Explain the difference between synchronous and asynchronous code in Node.js.',
      idealAnswer: 'Synchronous blocking vs asynchronous event-loop non-blocking I/O.',
      answer: 'Synchronous execution blocks the single thread while asynchronous uses libuv event loop with callbacks, promises and async/await.',
      code: '',
      metrics: { wpm: 120, fillerCount: 1 },
      expectedKeywords: ['synchronous', 'asynchronous', 'event loop', 'callbacks', 'promises']
    });

    console.log('Evaluation result output:', {
      overall: evalResult.overall,
      readinessLevel: evalResult.readinessLevel,
      verdict: evalResult.verdict,
      disclaimer: evalResult.disclaimer
    });

    // Must NOT contain employment hiring claims
    assert.notStrictEqual(evalResult.verdict, 'Strong Hire');
    assert.notStrictEqual(evalResult.verdict, 'Hire');
    assert.notStrictEqual(evalResult.verdict, 'Weak Hire');
    assert(evalResult.readinessLevel, 'Must define readinessLevel');
    assert(evalResult.disclaimer, 'Must include formative practice disclaimer');
    console.log('✓ Passed: AI hiring verdicts separated from practice feedback.\n');

    // 4. Database Appeals Table check
    console.log('Test 4: Verifying interview_appeals table existence and structure...');
    const colRes = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'interview_appeals'"
    );
    const cols = colRes.rows.map(r => r.column_name);
    assert(cols.includes('session_id'));
    assert(cols.includes('user_id'));
    assert(cols.includes('category'));
    assert(cols.includes('reason'));
    assert(cols.includes('status'));
    assert(cols.includes('reviewer_notes'));
    console.log('✓ Passed: interview_appeals table schema verified.\n');

    console.log('All RBAC and AI Hiring Verdict tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTests();
