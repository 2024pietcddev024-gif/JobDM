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
  await db.query("INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'STUDENT', 'ACTIVE')", [stuId, colA]);

  console.log('--- LOGIN SETUP ---');
  
  // 1. HR A
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr_a@example.com', password: pass, college_code: 'TEST_COL_A', panel: 'hr' })
  });
  const tokenA = (await res.json()).token;

  // 2. HR B
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr_b@example.com', password: pass, college_code: 'TEST_COL_B', panel: 'hr' })
  });
  const tokenB = (await res.json()).token;
  
  // 3. Student
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student_s@example.com', password: pass, panel: 'student' })
  });
  const stuToken = (await res.json()).token;

  console.log('\n--- CROSS-COLLEGE ISOLATION TESTS ---');

  // POST /jobs -> HR A
  res = await fetch(`${API}/campus/hr/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ title: 'Software Engineer A', location: 'Remote' })
  });
  const jobA = await res.json();
  const jobAId = jobA.id;
  console.log('HR A Create Job A (POST /jobs):', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // HR B POST /jobs
  res = await fetch(`${API}/campus/hr/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ title: 'Software Engineer B', location: 'Remote' })
  });
  const jobB = await res.json();
  const jobBId = jobB.id;

  // GET /overview -> HR A
  res = await fetch(`${API}/campus/hr/overview`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  let data = await res.json();
  console.log('HR A Overview (GET /overview):', res.status === 200 && data.openPositions === 1 ? 'PASS' : 'FAIL', res.status, data.openPositions);

  // GET /jobs -> HR A
  res = await fetch(`${API}/campus/hr/jobs`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  data = await res.json();
  console.log('HR A List Jobs (GET /jobs):', res.status === 200 && data.length === 1 && data[0].id === jobAId ? 'PASS' : 'FAIL', res.status);

  // GET /jobs/:id -> HR B trying to read Job A -> 404
  res = await fetch(`${API}/campus/hr/jobs/${jobAId}`, { headers: { 'Authorization': `Bearer ${tokenB}` } });
  console.log('HR B Read Job A (GET /jobs/:id):', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // PATCH /jobs/:id -> HR B patching Job A -> 404
  res = await fetch(`${API}/campus/hr/jobs/${jobAId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ status: 'CLOSED' })
  });
  console.log('HR B Patch Job A (PATCH /jobs/:id):', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // Create Application for Job A directly in DB
  const appRes = await db.query("INSERT INTO hr_applications (job_id, candidate_id) VALUES ($1, $2) RETURNING id", [jobAId, stuId]);
  const appAId = appRes.rows[0].id;

  // GET /applications -> HR A
  res = await fetch(`${API}/campus/hr/applications`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  data = await res.json();
  console.log('HR A List Applications (GET /applications):', res.status === 200 && data.length === 1 && data[0].id === appAId ? 'PASS' : 'FAIL', res.status);

  // GET /applications -> HR B -> Should be empty
  res = await fetch(`${API}/campus/hr/applications`, { headers: { 'Authorization': `Bearer ${tokenB}` } });
  data = await res.json();
  console.log('HR B List Applications (GET /applications):', res.status === 200 && data.length === 0 ? 'PASS' : 'FAIL', res.status, data.length);

  // PATCH /applications/:id/status -> HR B patching App A -> 404
  res = await fetch(`${API}/campus/hr/applications/${appAId}/status`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ status: 'REJECTED' })
  });
  console.log('HR B Patch App A Status (PATCH /applications/:id/status):', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // GET /candidates -> HR A
  res = await fetch(`${API}/campus/hr/candidates`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  data = await res.json();
  console.log('HR A List Candidates (GET /candidates):', res.status === 200 && data.length === 1 && data[0].id === stuId ? 'PASS' : 'FAIL', res.status);

  // GET /candidates -> HR B
  res = await fetch(`${API}/campus/hr/candidates`, { headers: { 'Authorization': `Bearer ${tokenB}` } });
  data = await res.json();
  console.log('HR B List Candidates (GET /candidates):', res.status === 200 && data.length === 0 ? 'PASS' : 'FAIL', res.status, data.length);

  // POST /interviews -> HR A
  res = await fetch(`${API}/campus/hr/interviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ application_id: appAId, schedule_time: new Date().toISOString() })
  });
  const intA = await res.json();
  const intAId = intA.id;
  console.log('HR A Create Interview (POST /interviews):', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // POST /interviews -> HR B attempting to create interview for App A -> 404
  res = await fetch(`${API}/campus/hr/interviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ application_id: appAId, schedule_time: new Date().toISOString() })
  });
  console.log('HR B Create Interview for App A (POST /interviews):', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // GET /interviews -> HR A
  res = await fetch(`${API}/campus/hr/interviews`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  data = await res.json();
  console.log('HR A List Interviews (GET /interviews):', res.status === 200 && data.length === 1 && data[0].id === intAId ? 'PASS' : 'FAIL', res.status);

  // GET /interviews -> HR B
  res = await fetch(`${API}/campus/hr/interviews`, { headers: { 'Authorization': `Bearer ${tokenB}` } });
  data = await res.json();
  console.log('HR B List Interviews (GET /interviews):', res.status === 200 && data.length === 0 ? 'PASS' : 'FAIL', res.status, data.length);

  // PATCH /interviews/:id -> HR B patching Interview A -> 404
  res = await fetch(`${API}/campus/hr/interviews/${intAId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
    body: JSON.stringify({ score: 100 })
  });
  console.log('HR B Patch Interview A (PATCH /interviews/:id):', res.status === 404 ? 'PASS' : 'FAIL', res.status);

  // GET /profile -> HR A
  res = await fetch(`${API}/campus/hr/profile`, { headers: { 'Authorization': `Bearer ${tokenA}` } });
  console.log('HR A Profile (GET /profile):', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  // STUDENT accessing HR endpoint -> 403
  res = await fetch(`${API}/campus/hr/overview`, { headers: { 'Authorization': `Bearer ${stuToken}` } });
  console.log('Student Access HR Overview:', res.status === 403 ? 'PASS' : 'FAIL', res.status);

  // UNAUTHENTICATED access -> 401
  res = await fetch(`${API}/campus/hr/overview`);
  console.log('Unauthenticated Access:', res.status === 401 ? 'PASS' : 'FAIL', res.status);

  // INVALID TOKEN -> 401
  res = await fetch(`${API}/campus/hr/overview`, { headers: { 'Authorization': `Bearer bad_token` } });
  console.log('Invalid Token Access:', res.status === 401 ? 'PASS' : 'FAIL', res.status);

  console.log('\n--- CLEANUP ---');
  await db.query('DELETE FROM hr_interviews WHERE application_id IN (SELECT id FROM hr_applications WHERE candidate_id = $1)', [stuId]);
  await db.query('DELETE FROM hr_applications WHERE candidate_id = $1', [stuId]);
  await db.query('DELETE FROM hr_jobs WHERE creator_id IN ($1, $2)', [hrAId, hrBId]);
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
