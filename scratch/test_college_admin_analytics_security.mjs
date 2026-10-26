import db from '../server/db.js';
import app from '../server/server.js';
import jwt from 'jsonwebtoken';

const PORT = 3015;
const API_URL = `http://localhost:${PORT}/api/campus/admin/analytics`;
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

    users.superadmin = await createBaseUser('superadmin_ca_test@test.com', 'Superadmin');
    users.adminA = await createBaseUser('adminA_ca_test@test.com', 'Admin A');
    users.adminB = await createBaseUser('adminB_ca_test@test.com', 'Admin B');
    users.tutorA = await createBaseUser('tutorA_ca_test@test.com', 'Tutor A');
    users.tutorB = await createBaseUser('tutorB_ca_test@test.com', 'Tutor B');
    users.studentA1 = await createBaseUser('studentA1_ca_test@test.com', 'Student A1');
    users.studentA2 = await createBaseUser('studentA2_ca_test@test.com', 'Student A2');
    users.studentB1 = await createBaseUser('studentB1_ca_test@test.com', 'Student B1');
    users.standalone = await createBaseUser('standalone_ca_test@test.com', 'Standalone');

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
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'TUTOR')", [users.tutorB, colleges.B]);

    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA1, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentA2, colleges.A]);
    await client.query("INSERT INTO campus_users (user_id, college_id, system_role) VALUES ($1, $2, 'STUDENT')", [users.studentB1, colleges.B]);

    // Assignments
    await client.query("INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)", [batches.A, users.tutorA]);
    await client.query("INSERT INTO batch_tutors (batch_id, tutor_user_id) VALUES ($1, $2)", [batches.B, users.tutorB]);

    await client.query("INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2)", [batches.A, users.studentA1]);
    await client.query("INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2)", [batches.A, users.studentA2]);
    await client.query("INSERT INTO student_enrollments (batch_id, student_user_id) VALUES ($1, $2)", [batches.B, users.studentB1]);

    // Add some activity for cross-college leakage check
    await client.query("INSERT INTO interview_sessions (id, user_id, category, difficulty, overall_score, status) VALUES (gen_random_uuid(), $1, 'DSA', 'Medium', 90, 'COMPLETED')", [users.studentA1]);
    await client.query("INSERT INTO interview_sessions (id, user_id, category, difficulty, overall_score, status) VALUES (gen_random_uuid(), $1, 'Frontend', 'Hard', 80, 'COMPLETED')", [users.studentB1]);

    Object.keys(users).forEach(k => tokens[k] = getToken(users[k], `${k}@test.com`));
  } finally {
    client.release();
  }
}

async function cleanupDatabase() {
  const client = await db.pool.connect();
  try {
    console.log("Cleaning up test database state...");
    await client.query("DELETE FROM users WHERE email LIKE '%_ca_test@test.com'");
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

  // 1. Unauthenticated -> 401
  let res = await fetchApi('GET', '/overview', null);
  assert("1. Unauthenticated request -> 401", res.status === 401);

  // 2. Standalone student -> 403
  res = await fetchApi('GET', '/overview', tokens.standalone);
  assert("2. Standalone student -> 403", res.status === 403);

  // 3. Tutor -> 403
  res = await fetchApi('GET', '/overview', tokens.tutorA);
  assert("3. Tutor -> 403", res.status === 403);

  // 4. Super Admin -> 403 if analytics endpoint is College Admin-only
  res = await fetchApi('GET', '/overview', tokens.superadmin);
  assert("4. Super admin -> 403 if endpoint is College Admin-only", res.status === 403);

  // 5. College Admin own overview -> allowed
  res = await fetchApi('GET', '/overview', tokens.adminA);
  assert("5. College Admin own overview -> allowed", res.status === 200 && res.body.college.id === colleges.A);

  // 6. College Admin own departments -> allowed
  res = await fetchApi('GET', '/departments', tokens.adminA);
  assert("6. College Admin own departments -> allowed", res.status === 200 && res.body.some(d => d.departmentId === depts.A));

  // 7. College Admin own batches -> allowed
  res = await fetchApi('GET', '/batches', tokens.adminA);
  assert("7. College Admin own batches -> allowed", res.status === 200 && res.body.some(b => b.batchId === batches.A));

  // 8. College Admin own tutors -> allowed
  res = await fetchApi('GET', '/tutors', tokens.adminA);
  assert("8. College Admin own tutors -> allowed", res.status === 200 && res.body.some(t => t.tutorId === users.tutorA));

  // 9. College Admin own students -> allowed
  res = await fetchApi('GET', '/students', tokens.adminA);
  assert("9. College Admin own students -> allowed", res.status === 200 && res.body.some(s => s.studentId === users.studentA1));

  // 10. College Admin own student detail -> allowed
  res = await fetchApi('GET', `/students/${users.studentA1}`, tokens.adminA);
  assert("10. College Admin own student detail -> allowed", res.status === 200 && res.body.student.id === users.studentA1);

  // 11. College Admin own activity -> allowed
  res = await fetchApi('GET', '/activity', tokens.adminA);
  assert("11. College Admin own activity -> allowed", res.status === 200);

  // 12. College Admin own domains -> allowed
  res = await fetchApi('GET', '/domains', tokens.adminA);
  assert("12. College Admin own domains -> allowed", res.status === 200);

  // 13. Attempt to access another college's department (Implicit via global fetch)
  // Actually, department endpoint returns a list. We verify another college's department is missing.
  res = await fetchApi('GET', '/departments', tokens.adminA);
  assert("13. Attempt to access another college's department (missing in list) -> allowed", res.status === 200 && !res.body.some(d => d.departmentId === depts.B));

  // 14. Attempt to access another college's batch (missing in list)
  res = await fetchApi('GET', '/batches', tokens.adminA);
  assert("14. Attempt to access another college's batch (missing in list) -> allowed", res.status === 200 && !res.body.some(b => b.batchId === batches.B));

  // 15. Attempt to access another college's student -> 403
  res = await fetchApi('GET', `/students/${users.studentB1}`, tokens.adminA);
  assert("15. Attempt to access another college's student detail -> 403", res.status === 403);

  // 16. Attempt to manipulate collegeId query param -> ignored
  res = await fetchApi('GET', `/overview?collegeId=${colleges.B}`, tokens.adminA);
  assert("16. Attempt to manipulate collegeId -> ignored", res.status === 200 && res.body.college.id === colleges.A);

  // 17. Attempt to manipulate adminUserId query param -> ignored
  res = await fetchApi('GET', `/overview?adminUserId=${users.adminB}`, tokens.adminA);
  assert("17. Attempt to manipulate adminUserId -> ignored", res.status === 200 && res.body.college.id === colleges.A);

  // 18. Attempt to manipulate tutorUserId query param -> ignored
  res = await fetchApi('GET', `/tutors?tutorUserId=${users.tutorB}`, tokens.adminA);
  assert("18. Attempt to manipulate tutorUserId -> ignored", res.status === 200 && !res.body.some(t => t.tutorId === users.tutorB));

  // 19. Attempt to manipulate studentId query param (Tested via #15 implicitly or via array check)
  res = await fetchApi('GET', `/students/${users.studentB1}`, tokens.adminA);
  assert("19. Attempt to manipulate studentId -> denied", res.status === 403);

  // 20. Cross-college activity leakage test
  res = await fetchApi('GET', '/activity', tokens.adminA);
  assert("20. Cross-college activity leakage test -> PASS", res.status === 200 && !res.body.some(a => a.studentName === 'Student B1') && res.body.some(a => a.studentName === 'Student A1'));

  // 21. Verify department analytics contain only own college
  res = await fetchApi('GET', '/departments', tokens.adminB);
  assert("21. Verify department analytics contain only own college", res.status === 200 && res.body.length === 1 && res.body[0].departmentId === depts.B);

  // 22. Verify batch analytics contain only own college
  res = await fetchApi('GET', '/batches', tokens.adminB);
  assert("22. Verify batch analytics contain only own college", res.status === 200 && res.body.length === 1 && res.body[0].batchId === batches.B);

  // 23. Verify student analytics contain only own college
  res = await fetchApi('GET', '/students', tokens.adminB);
  assert("23. Verify student analytics contain only own college", res.status === 200 && res.body.length === 1 && res.body[0].studentId === users.studentB1);

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
