import assert from 'assert';
import db from './db.js';
import app from './server.js';

const BASE_URL = 'http://localhost:3001';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRegistrationTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STUDENT REGISTRATION ROBUSTNESS & DATABASE TESTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function report(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // Wait for express to bind
  await wait(1000);

  const timestamp = Date.now();
  const testEmail = `student_valid_${timestamp}@example.com`;
  const testPassword = 'SecurePassword123!';

  try {
    // -------------------------------------------------------------------------
    // 1. Valid Student Registration Test
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Valid Student Registration ---');
    const res1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dev Sharma',
        email: testEmail,
        password: testPassword
      })
    });
    const data1 = await res1.json();
    report(
      res1.status === 201 && data1.user && data1.token && data1.user.email === testEmail,
      'Valid student registration succeeds with HTTP 201 and JWT token',
      `Status: ${res1.status}, Email: ${data1.user?.email}`
    );

    // -------------------------------------------------------------------------
    // 2. Duplicate Email Registration Test
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Duplicate Email Registration ---');
    const res2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dev Sharma Duplicate',
        email: testEmail,
        password: 'AnotherPassword456!'
      })
    });
    const data2 = await res2.json();
    report(
      res2.status === 400 && data2.error === 'Email already exists',
      'Duplicate email registration rejected with HTTP 400 and clear error message',
      `Status: ${res2.status}, Error: ${data2.error}`
    );

    // -------------------------------------------------------------------------
    // 3. Invalid College Code Registration Test
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Invalid College Code Registration ---');
    const res3 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'College Student',
        email: `student_college_${timestamp}@example.com`,
        password: testPassword,
        college_code: 'INVALID_NONEXISTENT_CODE_9999'
      })
    });
    const data3 = await res3.json();
    report(
      res3.status === 400 && data3.error?.includes('Invalid College Code'),
      'Invalid college code rejected with HTTP 400 without crashing',
      `Status: ${res3.status}, Error: ${data3.error}`
    );

    // -------------------------------------------------------------------------
    // 4. Unavailable Database Error Handling Test
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Database Unavailability / Connection Error Graceful Handling ---');
    // Save real pool temporarily
    const originalPool = db.pool;
    
    // Temporarily set db.pool to null or disconnected pool to test 503 response
    Object.defineProperty(db, 'pool', {
      value: null,
      configurable: true
    });

    const res4 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Offline Test User',
        email: `offline_${timestamp}@example.com`,
        password: testPassword
      })
    });
    const data4 = await res4.json();

    // Restore real pool
    Object.defineProperty(db, 'pool', {
      value: originalPool,
      configurable: true
    });

    report(
      res4.status === 503 && data4.error?.toLowerCase().includes('database service'),
      'Unavailable database handled safely: returns HTTP 503 JSON without crashing server',
      `Status: ${res4.status}, Error: ${data4.error}`
    );

    // -------------------------------------------------------------------------
    // 5. Verify Server Remains Fully Operational After Database Outage
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Verify Server Recovery After Outage ---');
    const res5 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recovered User',
        email: `recovered_${timestamp}@example.com`,
        password: testPassword
      })
    });
    const data5 = await res5.json();
    report(
      res5.status === 201 && Boolean(data5.token),
      'Server resumes normal operation immediately once database is available (HTTP 201)',
      `Status: ${res5.status}, User ID: ${data5.user?.id}`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runRegistrationTests();
