import db from '../server/db.js';
import app from '../server/server.js';
import jwt from 'jsonwebtoken';

const PORT = 3012;
const API_URL = `http://localhost:${PORT}/api/campus`;
const SECRET = process.env.JWT_SECRET || 'fallback_secret';

let server;

const getToken = (id, email) => jwt.sign({ id, email }, SECRET, { expiresIn: '1h' });

let users = {};
let tokens = {};
let colleges = {};
let depts = {};
let batches = {};

async function setupDatabase() {
  const client = await db.pool.connect();
  try {
    console.log("Setting up test database state...");

    const createBaseUser = async (email, name) => {
      const u = await client.query("INSERT INTO users (email, password_hash, full_name) VALUES ($1, 'fake', $2) RETURNING id", [email, name]);
      return u.rows[0].id;
    };

    users.adminA = await createBaseUser('adminA_t@test.com', 'Admin A');
    users.tutorA1 = await createBaseUser('tutorA1_t@test.com', 'Tutor A1');
    users.tutorA2 = await createBaseUser('tutorA2_t@test.com', 'Tutor A2');
    users.studentA1 = await createBaseUser('studentA1_t@test.com', 'Student A1');
    users.studentA2 = await createBaseUser('studentA2_t@test.com', 'Student A2');
    users.studentA3 = await createBaseUser('studentA3_t@test.com', 'Student A3');

    users.tutorB1 = await createBaseUser('tutorB1_t@test.com', 'Tutor B1');
    users.studentB1 = await createBaseUser('studentB1_t@test.com', 'Student B1');

    users.standalone = await createBaseUser('standalone_t@test.com', 'Standalone');

    // Create Colleges
    const c1 = await client.query("INSERT INTO colleges (name, code) VALUES ('Col A', 'TA_A') RETURNING id");
    colleges.A = c1.rows[0].id;
    const c2 = await client.query("INSERT INTO colleges (name, code) VALUES ('Col B', 'TA_B') RETURNING id");
    colleges.B = c2.rows[0].id;

    // Create Departments
    const dA = await client.query("INSERT INTO departments (college_id, name, code) VALUES ($1, 'Dept A', 'DTA_A') RETURNING id", [colleges.A]);
    depts.A = dA.rows[0].id;
    const dB = await client.query("INSERT INTO departments (college_id, name, code) VALUES ($1, 'Dept B', 'DTA_B') RETURNING id", [colleges.B]);
    depts.B = dB.rows[0].id;

    // Create Batches
    const bA1 = await client.query("INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, 'Batch A1', '2025') RETURNING id", [colleges.A, depts.A]);
    batches.A1 = bA1.rows[0].id;
    const bA2 = await client.query("INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, 'Batch A2', '2025') RETURNING id", [colleges.A, depts.A]);
    batches.A2 = bA2.rows[0].id;
    const bB1 = await client.query("INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, 'Batch B1', '2025') RETURNING id", [colleges.B, depts.B]);
    batches.B1 = bB1.rows[0].id;

    // Assign Campus Roles
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'COLLEGE_ADMIN')", [users.adminA, colleges.A]);
    
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR')", [users.tutorA1, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR')", [users.tutorA2, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR')", [users.tutorB1, colleges.B]);

    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA1, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA2, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA3, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentB1, colleges.B]);

    // Assignments
    await client.query("INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)", [batches.A1, users.tutorA1]);
    await client.query("INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)", [batches.A2, users.tutorA2]);
    await client.query("INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)", [batches.B1, users.tutorB1]);

    await client.query("INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2)", [batches.A1, users.studentA1]);
    await client.query("INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2)", [batches.A2, users.studentA2]);
    await client.query("INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2)", [batches.B1, users.studentB1]);
    // Student A3 is not in any batch

    Object.keys(users).forEach(k => tokens[k] = getToken(users[k], `${k}@test.com`));
  } finally {
    client.release();
  }
}

async function cleanupDatabase() {
  const client = await db.pool.connect();
  try {
    console.log("Cleaning up test database state...");
    await client.query("DELETE FROM users WHERE email LIKE '%_t@test.com'");
    await client.query("DELETE FROM colleges WHERE code LIKE 'TA_%'");
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
  let res = await fetchApi('GET', '/tutor/me', null);
  assert("TEST 1: Unauthenticated Tutor endpoint", res.status === 401);

  // TEST 2
  res = await fetchApi('GET', '/tutor/me', tokens.standalone);
  assert("TEST 2: Standalone user accessing Tutor endpoint", res.status === 403);

  // TEST 3
  res = await fetchApi('GET', '/tutor/me', tokens.studentA1);
  assert("TEST 3: STUDENT accessing Tutor endpoint", res.status === 403);

  // TEST 4
  res = await fetchApi('GET', '/tutor/me', tokens.adminA);
  assert("TEST 4: COLLEGE_ADMIN accessing Tutor endpoint", res.status === 403);

  // TEST 5
  res = await fetchApi('GET', '/tutor/me', tokens.tutorA1);
  assert("TEST 5: TUTOR accessing /me", res.status === 200 && res.body.assigned_batch_count === 1);

  // TEST 6
  res = await fetchApi('GET', `/tutor/batches/${batches.A1}`, tokens.tutorA1);
  assert("TEST 6: Tutor accessing their assigned batch", res.status === 200 && res.body.id === batches.A1);

  // TEST 7
  res = await fetchApi('GET', `/tutor/batches/${batches.A2}`, tokens.tutorA1);
  assert("TEST 7: Tutor accessing another Tutor's batch", res.status === 403);

  // TEST 8
  res = await fetchApi('GET', `/tutor/batches/${batches.B1}`, tokens.tutorA1);
  assert("TEST 8: Tutor accessing another college's batch", res.status === 403);

  // TEST 9
  res = await fetchApi('GET', `/tutor/batches/${batches.A1}/students`, tokens.tutorA1);
  assert("TEST 9: Tutor accessing students in assigned batch", res.status === 200 && res.body.some(s => s.user_id === users.studentA1));

  // TEST 10
  res = await fetchApi('GET', `/tutor/batches/${batches.A2}/students`, tokens.tutorA1);
  assert("TEST 10: Tutor accessing students in another Tutor's batch", res.status === 403);

  // TEST 11
  res = await fetchApi('GET', `/tutor/students/${users.studentA2}`, tokens.tutorA1);
  assert("TEST 11: Tutor accessing student outside their assigned batches", res.status === 403);

  // TEST 12
  res = await fetchApi('GET', `/tutor/students/${users.studentA1}`, tokens.tutorA1);
  assert("TEST 12: Tutor accessing their assigned student's profile", res.status === 200 && res.body.user_id === users.studentA1);

  // TEST 13
  res = await fetchApi('GET', `/tutor/batches/${batches.A2}`, tokens.tutorA1);
  assert("TEST 13: Tutor changing batchId in URL", res.status === 403);

  // TEST 14
  res = await fetchApi('GET', `/tutor/students/${users.studentA2}`, tokens.tutorA1);
  assert("TEST 14: Tutor changing studentId in URL", res.status === 403);

  // TEST 15
  res = await fetchApi('GET', `/tutor/batches?collegeId=${colleges.B}`, tokens.tutorA1);
  assert("TEST 15: Tutor supplying forged collegeId", res.status === 200 && res.body.every(b => b.id === batches.A1)); // Returns their own batches instead

  // TEST 16
  res = await fetchApi('GET', `/tutor/batches?tutorUserId=${users.tutorA2}`, tokens.tutorA1);
  assert("TEST 16: Tutor supplying forged tutorUserId", res.status === 200 && res.body.every(b => b.id === batches.A1)); // Returns their own batches instead

  // TEST 17
  res = await fetchApi('PATCH', `/tutor/me`, tokens.tutorA1, { system_role: 'COLLEGE_ADMIN' });
  assert("TEST 17: Tutor attempting role escalation", res.status === 404); // Endpoint doesn't exist

  // TEST 18
  res = await fetchApi('POST', `/tutor/batches/${batches.A2}/tutors`, tokens.tutorA1, { tutorUserId: users.tutorA1 });
  assert("TEST 18: Tutor attempting to assign themselves to another batch", res.status === 404); // Endpoint doesn't exist

  // TEST 19
  res = await fetchApi('GET', `/registrar/colleges`, tokens.tutorA1);
  assert("TEST 19: Tutor attempting to access Registrar API", res.status === 403);

  // TEST 20
  res = await fetchApi('GET', `/admin/college`, tokens.tutorA1);
  assert("TEST 20: Tutor attempting to access College Admin API", res.status === 403);

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
