import db from '../server/db.js';
import app from '../server/server.js';
import jwt from 'jsonwebtoken';

const PORT = 3010;
const API_URL = `http://localhost:${PORT}/api/campus/registrar`;
const SECRET = process.env.JWT_SECRET || 'fallback_secret';

let server;

// Helper to generate token
const getToken = (id, email) => jwt.sign({ id, email }, SECRET, { expiresIn: '1h' });

// Global state for tests
let users = {};
let tokens = {};

async function setupDatabase() {
  const client = await db.pool.connect();
  try {
    console.log("Setting up test database state...");

    // Create Users
    const createBaseUser = async (email, name) => {
      const u = await client.query("INSERT INTO users (email, password_hash, full_name) VALUES ($1, 'fake', $2) RETURNING id", [email, name]);
      return u.rows[0].id;
    };

    users.superadmin = await createBaseUser('super_reg@test.com', 'Super');
    users.adminA = await createBaseUser('adminA_reg@test.com', 'Admin A');
    users.tutorA = await createBaseUser('tutorA_reg@test.com', 'Tutor A');
    users.studentA1 = await createBaseUser('studentA1_reg@test.com', 'Student A1'); 
    users.standalone = await createBaseUser('standalone_reg@test.com', 'Standalone');
    users.newAdmin = await createBaseUser('newadmin_reg@test.com', 'New Admin');

    // Create a dummy college to attach non-super admins to
    const c1 = await client.query("INSERT INTO colleges (name, code) VALUES ('Dummy Col', 'DUMC') RETURNING id");
    const dummyCollegeId = c1.rows[0].id;

    // Assign Campus Roles
    await client.query("INSERT INTO campus_users (user_id, system_role) VALUES ($1, 'SUPER_ADMIN')", [users.superadmin]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'COLLEGE_ADMIN')", [users.adminA, dummyCollegeId]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR')", [users.tutorA, dummyCollegeId]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA1, dummyCollegeId]);

    Object.keys(users).forEach(k => tokens[k] = getToken(users[k], `${k}@test.com`));
  } finally {
    client.release();
  }
}

async function cleanupDatabase() {
  const client = await db.pool.connect();
  try {
    console.log("Cleaning up test database state...");
    await client.query("DELETE FROM users WHERE email LIKE '%_reg@test.com'");
    await client.query("DELETE FROM colleges WHERE code LIKE 'REG_%' OR code = 'DUMC'");
  } finally {
    client.release();
  }
}

async function fetchApi(method, path, token, body) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_URL}${path}`, { 
    method, 
    headers, 
    body: body ? JSON.stringify(body) : undefined 
  });
  return { status: res.status, ok: res.ok, body: await res.json().catch(() => null) };
}

async function runTests() {
  let passed = 0;
  let total = 0;

  const assert = (name, condition) => {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
    }
  };

  // TEST 1
  let res = await fetchApi('GET', '/colleges', null);
  assert("TEST 1: Unauthenticated Registrar request → 401", res.status === 401);

  // TEST 2
  res = await fetchApi('GET', '/colleges', tokens.standalone);
  assert("TEST 2: Standalone student → 403", res.status === 403);

  // TEST 3
  res = await fetchApi('POST', '/colleges', tokens.studentA1, { name: 'S Col', code: 'REG_S' });
  assert("TEST 3: STUDENT attempting college creation → 403", res.status === 403);

  // TEST 4
  res = await fetchApi('POST', '/colleges', tokens.tutorA, { name: 'T Col', code: 'REG_T' });
  assert("TEST 4: TUTOR attempting college creation → 403", res.status === 403);

  // TEST 5
  res = await fetchApi('POST', '/colleges', tokens.adminA, { name: 'A Col', code: 'REG_A' });
  assert("TEST 5: COLLEGE_ADMIN attempting college creation → 403", res.status === 403);

  // TEST 6
  res = await fetchApi('POST', '/colleges', tokens.superadmin, { name: 'Reg Col 1', code: 'REG_1' });
  assert("TEST 6: SUPER_ADMIN creating college → allowed", res.status === 201 && res.body.code === 'REG_1');
  const collegeId = res.body.id;

  // TEST 7
  res = await fetchApi('POST', '/colleges', tokens.superadmin, { name: 'Reg Col 2', code: 'REG_1' });
  assert("TEST 7: Duplicate college code → 409", res.status === 409);

  // TEST 8
  res = await fetchApi('POST', `/colleges/${collegeId}/departments`, tokens.superadmin, { name: 'Dept 1', code: 'REG_D1' });
  assert("TEST 8: SUPER_ADMIN creating department in valid college → allowed", res.status === 201);
  const deptId = res.body.id;

  // TEST 9
  const fakeCollegeId = '00000000-0000-0000-0000-000000000000';
  res = await fetchApi('POST', `/colleges/${fakeCollegeId}/departments`, tokens.superadmin, { name: 'Dept X', code: 'REG_DX' });
  assert("TEST 9: Invalid college/department relationship (nonexistent college) → rejected", res.status === 404);

  // Create a second college
  let resC2 = await fetchApi('POST', '/colleges', tokens.superadmin, { name: 'Reg Col 2', code: 'REG_2' });
  const collegeId2 = resC2.body.id;

  // TEST 10
  res = await fetchApi('POST', `/colleges/${collegeId}/batches`, tokens.superadmin, { department_id: deptId, name: 'Batch 1', academic_year: '2025' });
  assert("TEST 10: SUPER_ADMIN creating valid batch → allowed", res.status === 201);

  // TEST 11
  res = await fetchApi('POST', `/colleges/${collegeId2}/batches`, tokens.superadmin, { department_id: deptId, name: 'Batch X', academic_year: '2025' });
  assert("TEST 11: Invalid batch department/college relationship → rejected", res.status === 400);

  // TEST 12
  res = await fetchApi('POST', `/colleges/${collegeId}/admins`, tokens.superadmin, { userId: fakeCollegeId });
  assert("TEST 12: Nonexistent user assigned as College Admin → rejected", res.status === 404);

  // TEST 13
  res = await fetchApi('POST', `/colleges/${collegeId}/admins`, tokens.superadmin, { userId: users.newAdmin });
  assert("TEST 13: SUPER_ADMIN assigning valid College Admin → allowed", res.status === 201 && res.body.system_role === 'COLLEGE_ADMIN');

  // TEST 14
  res = await fetchApi('POST', `/colleges/${collegeId}/admins`, tokens.adminA, { userId: users.standalone });
  assert("TEST 14: Non-SUPER_ADMIN attempting College Admin assignment → 403", res.status === 403);

  console.log(`\nResults: ${passed}/${total} passed.`);
}

async function main() {
  try {
    server = app.listen(PORT, async () => {
      console.log(`Test server running on port ${PORT}`);
      await cleanupDatabase();
      await setupDatabase();
      await runTests();
      await cleanupDatabase();
      server.close();
      process.exit(0);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
