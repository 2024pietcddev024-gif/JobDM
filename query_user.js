import db from './server/db.js';
async function run() {
  try {
    const u = await db.query('SELECT * FROM users WHERE email = $1', ['chiya123@gmil.com']);
    console.log('User:', u.rows);
    if (u.rows.length > 0) {
      const c = await db.query('SELECT * FROM campus_users WHERE user_id = $1', [u.rows[0].id]);
      console.log('Campus User:', c.rows);
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
