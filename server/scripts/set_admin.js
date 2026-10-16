import db from '../db.js';
import bcrypt from 'bcrypt';

async function setAdminPassword() {
  const hash = await bcrypt.hash('password123', 10);
  await db.query("UPDATE users SET password_hash = $1 WHERE email = 'chiya123@gmil.com'", [hash]);
  console.log('Super Admin chiya123@gmil.com password set successfully');
  process.exit(0);
}

setAdminPassword();
