import db from '../server/db.js';

async function test() {
  try {
    const res = await db.query("SELECT * FROM users WHERE email = 'test_1234567@example.com'");
    console.log('User in DB:', res.rows.length > 0 ? 'YES' : 'NO');
    console.log('Password is hashed:', res.rows[0].password_hash.startsWith('$2b$'));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
test();
