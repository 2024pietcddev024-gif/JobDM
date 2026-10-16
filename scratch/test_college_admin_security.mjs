import db from '../server/db.js';
import app from '../server/server.js';
import jwt from 'jsonwebtoken';

const PORT = 3011;
const API_URL = `http://localhost:${PORT}/api/campus/admin`;
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

    users.superadmin = await createBaseUser('super_ca@test.com', 'Super');
    users.adminA = await createBaseUser('adminA_ca@test.com', 'Admin A');
    users.adminB = await createBaseUser('adminB_ca@test.com', 'Admin B');
    users.tutorA = await createBaseUser('tutorA_ca@test.com', 'Tutor A');
    users.studentA1 = await createBaseUser('studentA1_ca@test.com', 'Student A1');
    users.standalone = await createBaseUser('standalone_ca@test.com', 'Standalone');
    users.newTutor = await createBaseUser('newtutor_ca@test.com', 'New Tutor');
    users.newStudent = await createBaseUser('newstudent_ca@test.com', 'New Student');
    users.newStudent2 = await createBaseUser('newstudent2_ca@test.com', 'New Student 2');

    // Create Colleges
    const c1 = await client.query("INSERT INTO colleges (name, code) VALUES ('Col A', 'CA_A') RETURNING id");
    colleges.A = c1.rows[0].id;
    const c2 = await client.query("INSERT INTO colleges (name, code) VALUES ('Col B', 'CA_B') RETURNING id");
    colleges.B = c2.rows[0].id;

    // Create Departments
    const dA = await client.query("INSERT INTO departments (college_id, name, code) VALUES ($1, 'Dept A', 'DCA_A') RETURNING id", [colleges.A]);
    depts.A = dA.rows[0].id;
    const dB = await client.query("INSERT INTO departments (college_id, name, code) VALUES ($1, 'Dept B', 'DCA_B') RETURNING id", [colleges.B]);
    depts.B = dB.rows[0].id;

    // Create Batches
    const bA = await client.query("INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, 'Batch A', '2025') RETURNING id", [colleges.A, depts.A]);
    batches.A = bA.rows[0].id;
    const bB = await client.query("INSERT INTO batches (college_id, department_id, name, academic_year) VALUES ($1, $2, 'Batch B', '2025') RETURNING id", [colleges.B, depts.B]);
    batches.B = bB.rows[0].id;

    // Assign Campus Roles
    await client.query("INSERT INTO campus_users (user_id, system_role) VALUES ($1, 'SUPER_ADMIN')", [users.superadmin]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'COLLEGE_ADMIN')", [users.adminA, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'COLLEGE_ADMIN')", [users.adminB, colleges.B]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR')", [users.tutorA, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA1, colleges.A]);

    Object.keys(users).forEach(k => tokens[k] = getToken(users[k], `${k}@test.com`));
  } finally {
    client.release();
  }
}

async function cleanupDatabase() {
  const client = await db.pool.connect();
  try {
    console.log("Cleaning up test database state...");
    await client.query("DELETE FROM users WHERE email LIKE '%_ca@test.com'");
    await client.query("DELETE FROM colleges WHERE code LIKE 'CA_%'");
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
  let res = await fetchApi('GET', '/me', null);
  assert("TEST 1: Unauthenticated College Admin endpoint", res.status === 401);

  // TEST 2
  res = await fetchApi('GET', '/me', tokens.standalone);
  assert("TEST 2: Standalone student accessing College Admin endpoint", res.status === 403);

  // TEST 3
  res = await fetchApi('GET', '/me', tokens.studentA1);
  assert("TEST 3: STUDENT accessing College Admin endpoint", res.status === 403);

  // TEST 4
  res = await fetchApi('GET', '/me', tokens.tutorA);
  assert("TEST 4: TUTOR accessing College Admin endpoint", res.status === 403);

  // TEST 5
  res = await fetchApi('GET', '/college', tokens.adminA);
  assert("TEST 5: COLLEGE_ADMIN accessing own college", res.status === 200 && res.body.id === colleges.A);

  // TEST 6
  res = await fetchApi('GET', `/college?collegeId=${colleges.B}`, tokens.adminA);
  // It should ignore the query param and return their own college
  assert("TEST 6: COLLEGE_ADMIN accessing another college (by query string manipulation)", res.status === 200 && res.body.id === colleges.A);

  // TEST 7
  // Provide collegeId in body, the API must ignore it and use context
  res = await fetchApi('POST', '/departments', tokens.adminA, { name: 'Dept A2', code: 'DCA_A2', collegeId: colleges.B });
  assert("TEST 7: COLLEGE_ADMIN attempting to create department using another collegeId", res.status === 201);
  // Let's verify it created it in College A, not B
  const client = await db.pool.connect();
  const depCheck = await client.query("SELECT college_id FROM departments WHERE id = $1", [res.body.id]);
  client.release();
  if (depCheck.rows[0].college_id !== colleges.A) {
    console.error("Failed to enforce own college on department creation");
  }

  // TEST 8
  res = await fetchApi('PATCH', `/departments/${depts.B}`, tokens.adminA, { name: 'Hacked' });
  assert("TEST 8: COLLEGE_ADMIN attempting to modify another college's department", res.status === 403);

  // TEST 9
  res = await fetchApi('PATCH', `/batches/${batches.B}`, tokens.adminA, { name: 'Hacked Batch' });
  assert("TEST 9: COLLEGE_ADMIN attempting to access another college's batch", res.status === 403);

  // TEST 10
  res = await fetchApi('POST', `/batches/${batches.B}/tutors`, tokens.adminA, { tutorUserId: users.tutorA });
  assert("TEST 10: COLLEGE_ADMIN attempting to assign another college's tutor / batch", res.status === 403);

  // TEST 11
  res = await fetchApi('POST', '/tutors', tokens.adminA, { userId: users.newTutor });
  assert("TEST 11: COLLEGE_ADMIN assigning valid tutor from own college", res.status === 201);

  // TEST 12
  res = await fetchApi('POST', '/tutors', tokens.adminA, { userId: users.newTutor });
  assert("TEST 12: Duplicate tutor assignment", res.status === 409);

  // TEST 13
  // Send a forged system_role
  res = await fetchApi('POST', '/tutors', tokens.adminA, { userId: users.standalone, system_role: 'SUPER_ADMIN' });
  assert("TEST 13: COLLEGE_ADMIN assigning tutor with forged role", res.status === 201 && res.body.system_role === 'TUTOR');

  // TEST 14
  res = await fetchApi('POST', `/batches/${batches.A}/students`, tokens.adminA, { studentUserId: users.newStudent });
  assert("TEST 14: COLLEGE_ADMIN assigning student to own batch", res.status === 201);

  // TEST 15
  res = await fetchApi('POST', `/batches/${batches.A}/students`, tokens.adminA, { studentUserId: users.newStudent });
  assert("TEST 15: Duplicate student enrollment", res.status === 409);

  // TEST 16
  res = await fetchApi('POST', `/batches/${batches.B}/students`, tokens.adminA, { studentUserId: users.newStudent2 });
  assert("TEST 16: COLLEGE_ADMIN enrolling student into another college's batch", res.status === 403);

  // TEST 17
  res = await fetchApi('DELETE', `/batches/${batches.A}/students/${users.newStudent}`, tokens.adminA);
  assert("TEST 17: COLLEGE_ADMIN removing student from own batch", res.status === 200);

  // TEST 18
  // Student A1 is enrolled in Batch B manually? No, we didn't enroll Student A1 in Batch B yet.
  // We'll just try to delete an enrollment from Batch B.
  res = await fetchApi('DELETE', `/batches/${batches.B}/students/${users.newStudent2}`, tokens.adminA);
  assert("TEST 18: COLLEGE_ADMIN removing student from another college's batch", res.status === 403);

  // TEST 19
  // Modify batch using manipulated department_id (from college B)
  res = await fetchApi('PATCH', `/batches/${batches.A}`, tokens.adminA, { department_id: depts.B });
  assert("TEST 19: Frontend/query collegeId manipulation (dept cross-college)", res.status === 403);

  // TEST 20
  res = await fetchApi('POST', `/batches/${batches.A}/tutors`, tokens.adminA, { tutorUserId: users.superadmin });
  // superadmin doesn't have a TUTOR role in college A
  assert("TEST 20: Role escalation attempt (assigning non-tutor as tutor)", res.status === 403);

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
