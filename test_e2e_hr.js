import db from './server/db.js';
import bcrypt from 'bcrypt';

const PORT = 3006;
const API = `http://localhost:${PORT}/api`;

async function runE2E() {
  const pass = 'password123';
  const hash = await bcrypt.hash(pass, 10);
  
  // Setup data
  const colResA = await db.query('INSERT INTO colleges (code, name) VALUES ($1, $2) RETURNING id', ['TEST_COL_A', 'College A']);
  const colA = colResA.rows[0].id;
  const colResB = await db.query('INSERT INTO colleges (code, name) VALUES ($1, $2) RETURNING id', ['TEST_COL_B', 'College B']);
  const colB = colResB.rows[0].id;

  const hrA = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', ['hr_a@example.com', hash, 'HR A']);
  const hrAId = hrA.rows[0].id;
  const hrB = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', ['hr_b@example.com', hash, 'HR B']);
  const hrBId = hrB.rows[0].id;
  
  const student = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', ['student_s@example.com', hash, 'Student S']);
  const stuId = student.rows[0].id;

  await db.query("INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'HR', 'ACTIVE')", [hrAId, colA]);
  await db.query("INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'HR', 'ACTIVE')", [hrBId, colB]);
  // Provide basic student role just for login testing
  await db.query("INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'STUDENT', 'ACTIVE')", [stuId, colA]);

  console.log('--- LOGIN TESTS ---');
  
  // 1. HR A -> Col A -> OK
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr_a@example.com', password: pass, college_code: 'TEST_COL_A', panel: 'hr' })
  });
  const tokenA = (await res.json()).token;
  console.log('HR A Login Col A:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // 2. HR B -> Col B -> OK
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr_b@example.com', password: pass, college_code: 'TEST_COL_B', panel: 'hr' })
  });
  const tokenB = (await res.json()).token;
  console.log('HR B Login Col B:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // 3. HR A -> Col B code -> FAIL 403
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr_a@example.com', password: pass, college_code: 'TEST_COL_B', panel: 'hr' })
  });
  console.log('HR A Login Col B code:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

  // 4. Student login -> OK
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student_s@example.com', password: pass, panel: 'student' })
  });
  const stuToken = (await res.json()).token;
  console.log('Student Login:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  console.log('\n--- CROSS-COLLEGE ISOLATION TESTS ---');

  // Create Job in Col A
  res = await fetch(`${API}/campus/hr/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ title: 'Software Engineer', location: 'Remote' })
  });
  const jobA = await res.json();
  const jobAId = jobA.id;
  console.log('HR A Create Job:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // HR B reads Job A -> 404
  res = await fetch(`${API}/campus/hr/jobs/${jobAId}`, { headers: { 'Authorization': `Bearer ${tokenB}` } });
  console.log('HR B Read Job A:', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // HR B patches Job A -> 404
  res = await fetch(`${API}/campus/hr/jobs/${jobAId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ status: 'CLOSED' })
  });
  console.log('HR B Patch Job A:', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // Create Application for Job A using direct DB insert (mocking student applying)
  const appRes = await db.query("INSERT INTO hr_applications (job_id, candidate_id) VALUES ($1, $2) RETURNING id", [jobAId, stuId]);
  const appAId = appRes.rows[0].id;

  // HR B patches App A -> 404
  res = await fetch(`${API}/campus/hr/applications/${appAId}/status`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ status: 'REJECTED' })
  });
  console.log('HR B Patch App A:', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // Create Interview for App A using HR A
  res = await fetch(`${API}/campus/hr/interviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ application_id: appAId, schedule_time: new Date().toISOString() })
  });
  const intA = await res.json();
  const intAId = intA.id;
  console.log('HR A Create Interview A:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // HR B patches Interview A -> 404
  res = await fetch(`${API}/campus/hr/interviews/${intAId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ score: 100 })
  });
  console.log('HR B Patch Interview A:', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  console.log('\n--- SESSION REVOCATION TEST ---');
  // Revoke HR A's active status
  await db.query("UPDATE campus_users SET status = 'INACTIVE' WHERE user_id = $1", [hrAId]);

  // Try to use existing token
  res = await fetch(`${API}/campus/hr/jobs`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  console.log('HR A (Inactive) Read Jobs:', res.status === 403 ? 'PASS' : 'FAIL', res.status);


  console.log('\n--- CLEANUP ---');
  await db.query('DELETE FROM campus_users WHERE user_id IN ($1, $2, $3)', [hrAId, hrBId, stuId]);
  await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [hrAId, hrBId, stuId]);
  await db.query('DELETE FROM colleges WHERE id IN ($1, $2)', [colA, colB]);
  console.log('Cleanup successful.');
  process.exit(0);
}

runE2E().catch(e => {
  console.error(e);
  process.exit(1);
});
