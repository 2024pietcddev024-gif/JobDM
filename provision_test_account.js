import db from './server/db.js';
import bcrypt from 'bcrypt';

const PORT = 3006;
const API = `http://localhost:${PORT}/api`;

async function provisionAccount() {
  const pass = 'superpass';
  const hash = await bcrypt.hash(pass, 10);
  
  await db.query("DELETE FROM campus_users WHERE user_id IN (SELECT id FROM users WHERE email = 'sa_test@jobdm.com')");
  await db.query("DELETE FROM users WHERE email = 'sa_test@jobdm.com'");
  const saRes = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', ['sa_test@jobdm.com', hash, 'SA Test']);
  const saId = saRes.rows[0].id;
  await db.query("INSERT INTO campus_users (user_id, system_role, status) VALUES ($1, 'SUPER_ADMIN', 'ACTIVE')", [saId]);

  let res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sa_test@jobdm.com', password: pass, panel: 'student' })
  });
  
  if (res.status !== 200) {
    console.error('SA Login failed:', res.status, await res.text());
    process.exit(1);
  }
  const saToken = (await res.json()).token;

  res = await fetch(`${API}/campus/registrar/colleges`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
    body: JSON.stringify({ name: 'PIET College', code: 'piet24cd', domain: 'piet.edu' })
  });
  let colData = await res.json();
  
  if (res.status === 409) {
    // College already exists, get the ID
    const colRes = await db.query("SELECT id FROM colleges WHERE code = 'piet24cd'");
    colData = { id: colRes.rows[0].id, code: 'piet24cd' };
  } else if (res.status !== 201) {
    console.error('Failed to create college:', res.status, colData);
    process.exit(1);
  }

  res = await fetch(`${API}/campus/registrar/colleges/${colData.id}/hr`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
    body: JSON.stringify({ full_name: 'Dev Sharma' })
  });
  
  const hrData = await res.json();
  if (res.status !== 201) {
    console.error('Failed to provision HR:', res.status, hrData);
    process.exit(1);
  }

  // Write credentials to a local JSON file that the agent can read instead of printing to console logs
  const fs = await import('fs');
  fs.writeFileSync('hr_credentials.json', JSON.stringify({
    hrId: hrData.hr_id,
    collegeCode: hrData.college_code,
    password: hrData.initial_password
  }));

  // Clean up SA
  await db.query("DELETE FROM campus_users WHERE user_id = $1", [saId]);
  await db.query("DELETE FROM users WHERE id = $1", [saId]);
  
  console.log('Provisioning successful.');
  process.exit(0);
}

provisionAccount().catch(e => {
  console.error(e);
  process.exit(1);
});
