import assert from 'assert';

const API_BASE = 'http://localhost:3001/api';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   JobDM Authentication & Role-Based Login Tests    ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  };

  // 1. Common Login API - Invalid Credentials
  await test('Invalid credentials return 400 with "Invalid credentials"', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com', password: 'badpassword' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid credentials');
  });

  await test('Missing email or password returns 400', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' })
    });
    assert.strictEqual(res.status, 400);
  });

  // 2. Student Authentication & Role Resolution
  let studentToken = null;
  await test('Student login resolves role "STUDENT" without client specifying role', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arjun@gmail.com', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token, 'Token must be present');
    assert.strictEqual(data.user.campus?.role, 'STUDENT');
    studentToken = data.token;
  });

  // 3. Teacher Authentication & Role Resolution
  let teacherToken = null;
  await test('Teacher login resolves role "TUTOR" (Teacher) without client specifying role', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher.test1@jobdm.edu', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token, 'Token must be present');
    assert.strictEqual(data.user.campus?.role, 'TUTOR');
    teacherToken = data.token;
  });

  // 4. HR Authentication & Role Resolution
  let hrToken = null;
  await test('HR login with email resolves role "HR" without client specifying role', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr-piet24cd-nuen0k@hr.jobdm.com', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token, 'Token must be present');
    assert.strictEqual(data.user.campus?.role, 'HR');
    hrToken = data.token;
  });

  await test('HR login with HR ID (without @domain) resolves role "HR"', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'HR-piet24cd-nuen0k', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token, 'Token must be present');
    assert.strictEqual(data.user.campus?.role, 'HR');
  });

  // 5. Super Admin Authentication & Security
  let superAdminToken = null;
  await test('Super Admin login resolves role "SUPER_ADMIN" securely', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'chiya123@gmil.com', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token, 'Token must be present');
    assert.strictEqual(data.user.campus?.role, 'SUPER_ADMIN');
    superAdminToken = data.token;
  });

  // 6. Direct URL / Role-Based Authorization Bypass Prevention
  await test('Student cannot access Teacher backend endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/tutor/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Student cannot access HR backend endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/hr/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Student cannot access Super Admin endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/registrar/colleges`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Teacher cannot access HR backend endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/hr/overview`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Teacher cannot access Super Admin endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/registrar/colleges`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('HR cannot access Teacher backend endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/tutor/me`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('HR cannot access Super Admin endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/campus/registrar/colleges`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Super Admin can access Super Admin endpoints (200 OK)', async () => {
    const res = await fetch(`${API_BASE}/campus/registrar/colleges`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Should return list of colleges');
  });

  // 7. Session Hydration & Persistence
  await test('Session persistence: /api/auth/me retains verified campus role', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.campus?.role, 'TUTOR');
  });

  await test('Campus persistence: /api/campus/me retains verified campus role', async () => {
    const res = await fetch(`${API_BASE}/campus/me`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.campus?.role, 'HR');
  });

  // 8. Server-side security: Client cannot forge role
  await test('Frontend cannot override server role by sending { panel: "SUPER_ADMIN" }', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arjun@gmail.com', password: 'password123', panel: 'SUPER_ADMIN' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    // Server must STILL identify Arjun as STUDENT, ignoring the forged panel parameter
    assert.strictEqual(data.user.campus?.role, 'STUDENT');
  });

  console.log(`\n----------------------------------------------------`);
  console.log(`Test Results: ${passed} / ${total} passed`);
  console.log(`----------------------------------------------------\n`);

  if (passed === total) {
    console.log('ALL AUTHENTICATION & ROLE-BASED LOGIN TESTS PASSED!');
    process.exit(0);
  } else {
    console.error(`FAILED: ${total - passed} tests failed.`);
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
