import db from './server/db.js';
import bcrypt from 'bcrypt';

const PORT = 3006;
const API = `http://localhost:${PORT}/api`;

async function runProvisioningTest() {
  const pass = 'superpass';
  const hash = await bcrypt.hash(pass, 10);
  
  await db.query("DELETE FROM campus_users WHERE user_id IN (SELECT id FROM users WHERE email = 'sa@example.com')");
  await db.query("DELETE FROM users WHERE email = 'sa@example.com'");
  const saRes = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', ['sa@example.com', hash, 'Super Admin']);
  const saId = saRes.rows[0].id;
  await db.query("INSERT INTO campus_users (user_id, system_role, status) VALUES ($1, 'SUPER_ADMIN', 'ACTIVE')", [saId]);

  console.log('--- LOGIN AS SUPER ADMIN ---');
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sa@example.com', password: pass, panel: 'hr' }) // wait, panel hr requires college_code. Super admin doesn't need a panel, they might just login through normal auth.
  });
  
  // Login as normal user, then access super admin routes
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sa@example.com', password: pass, panel: 'student' })
  });
  
  if (res.status !== 200) {
    const errorText = await res.text();
    console.error('Super Admin Login failed:', res.status, errorText);
    process.exit(1);
  }
  const saToken = (await res.json()).token;

  console.log('--- CREATE COLLEGE ---');
  res = await fetch(`${API}/campus/registrar/colleges`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
    body: JSON.stringify({ name: 'Tech Solutions Inc', domain: 'techsolutions.local' })
  });
  const colResData = await res.json();
  console.log('Create College (no code provided):', res.status === 201 ? 'PASS' : 'FAIL', res.status, colResData);
  const colId = colResData.id;
  const colCode = colResData.code;

  console.log('--- PROVISION HR ACCOUNT ---');
  res = await fetch(`${API}/campus/registrar/colleges/${colId}/hr`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
    body: JSON.stringify({ full_name: 'Alice HR' })
  });
  const hrResData = await res.json();
  console.log('Provision HR Account:', res.status === 201 ? 'PASS' : 'FAIL', res.status, hrResData);
  
  const hrId = hrResData.hr_id;
  const initialPassword = hrResData.initial_password;
  const expectedColCode = hrResData.college_code;

  console.log('--- TEST HR LOGIN WITH HR ID ---');
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: hrId, password: initialPassword, college_code: expectedColCode, panel: 'hr' })
  });
  const hrLoginData = await res.json();
  console.log('HR Login with HR ID:', res.status === 200 ? 'PASS' : 'FAIL', res.status);
  const hrToken = hrLoginData.token;

  console.log('--- TEST HR LOGIN WITH WRONG COLLEGE CODE ---');
  res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: hrId, password: initialPassword, college_code: 'WRONG-CODE', panel: 'hr' })
  });
  console.log('HR Login with Wrong Code:', res.status === 400 ? 'PASS' : 'FAIL', res.status);

  console.log('--- VERIFY HR ENDPOINT AUTHORIZATION ---');
  res = await fetch(`${API}/campus/hr/profile`, { headers: { 'Authorization': `Bearer ${hrToken}` } });
  console.log('HR Access Profile Endpoint:', res.status === 200 ? 'PASS' : 'FAIL', res.status);

  console.log('\n--- CLEANUP ---');
  await db.query("DELETE FROM campus_users WHERE system_role = 'SUPER_ADMIN' AND user_id = $1", [saId]);
  await db.query("DELETE FROM campus_users WHERE college_id = $1", [colId]);
  await db.query("DELETE FROM users WHERE email = 'sa@example.com' OR email = $1", [`${hrId}@hr.jobdm.com`.toLowerCase()]);
  await db.query("DELETE FROM colleges WHERE id = $1", [colId]);
  console.log('Cleanup successful.');
  process.exit(0);
}

runProvisioningTest().catch(e => {
  console.error(e);
  process.exit(1);
});
