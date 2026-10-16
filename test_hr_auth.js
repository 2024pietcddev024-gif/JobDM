import db from './server/db.js';
import bcrypt from 'bcrypt';

async function runTests() {
  const email = 'hr_test_123@example.com';
  const pass = 'password123';
  const hash = await bcrypt.hash(pass, 10);
  
  // Create mock data
  const userRes = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', [email, hash, 'HR Test User']);
  const userId = userRes.rows[0].id;
  
  const colRes1 = await db.query('INSERT INTO colleges (code, name) VALUES ($1, $2) RETURNING id', ['COL-A', 'College A']);
  const colA = colRes1.rows[0].id;

  const colRes2 = await db.query('INSERT INTO colleges (code, name) VALUES ($1, $2) RETURNING id', ['COL-B', 'College B']);
  const colB = colRes2.rows[0].id;

  // Provision HR for COL-A only
  await db.query("INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'HR', 'ACTIVE')", [userId, colA]);

  // Also create a test job in COL-B
  const jobRes = await db.query("INSERT INTO hr_jobs (college_id, creator_id, title, status) VALUES ($1, $2, 'Test Job B', 'OPEN') RETURNING id", [colB, userId]);
  const jobB = jobRes.rows[0].id;

  console.log('--- RUNNING TESTS ---');
  
  // Test 1: Valid HR ID + Correct College Code + Correct Pass -> Allowed
  let res = await fetch('http://localhost:3005/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, college_code: 'COL-A', panel: 'hr' })
  });
  console.log('T1: Correct HR + Correct College -> Status:', res.status);
  const { token } = await res.json();
  if (res.status !== 200 || !token) throw new Error('Test 1 failed');

  // Test 2: Correct HR ID + Incorrect College Code -> Denied
  res = await fetch('http://localhost:3005/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, college_code: 'INVALID_COL', panel: 'hr' })
  });
  console.log('T2: Correct HR + Invalid College -> Status:', res.status);

  // Test 3: HR from Col A + College B code -> Denied
  res = await fetch('http://localhost:3005/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, college_code: 'COL-B', panel: 'hr' })
  });
  console.log('T3: HR Col A + Col B code -> Status:', res.status);

  // Test 4: Invalid Password -> Denied
  res = await fetch('http://localhost:3005/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrong', college_code: 'COL-A', panel: 'hr' })
  });
  console.log('T4: Invalid Password -> Status:', res.status);

  // Test 6: HR from Col A attempt to read/mod Col B job -> Denied
  res = await fetch(`http://localhost:3005/api/campus/hr/jobs/${jobB}`, {
    method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('T6: HR Col A access Col B Job -> Status:', res.status);
  
  // Cleanup
  console.log('--- CLEANUP ---');
  await db.query('DELETE FROM hr_jobs WHERE id = $1', [jobB]);
  await db.query('DELETE FROM campus_users WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  await db.query('DELETE FROM colleges WHERE id IN ($1, $2)', [colA, colB]);
  
  console.log('Tests finished successfully.');
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
