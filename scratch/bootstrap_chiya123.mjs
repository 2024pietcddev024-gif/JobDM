import db from '../server/db.js';

async function main() {
  const email = 'chiya123@gmail.com';
  let userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
  
  if (userRes.rows.length === 0) {
    console.log(`User with email ${email} not found. Trying chiya123@gmil.com...`);
    userRes = await db.query('SELECT id, email FROM users WHERE email = $1', ['chiya123@gmil.com']);
  }
  
  if (userRes.rows.length === 0) {
    console.log('User not found.');
    process.exit(1);
  }

  const user = userRes.rows[0];
  console.log(`Found user: ${user.id} (${user.email})`);

  const campusRes = await db.query('SELECT * FROM campus_users WHERE user_id = $1', [user.id]);
  if (campusRes.rows.length > 0) {
    console.log(`User already has a campus identity: ${campusRes.rows[0].system_role}`);
    process.exit(0);
  }

  try {
    await db.query('BEGIN');
    await db.query(`
      INSERT INTO campus_users (user_id, college_id, system_role, status)
      VALUES ($1, NULL, 'SUPER_ADMIN', 'ACTIVE')
    `, [user.id]);
    await db.query('COMMIT');
    console.log('Successfully inserted SUPER_ADMIN identity.');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error inserting identity:', err);
    process.exit(1);
  }

  const verifyRes = await db.query('SELECT user_id, college_id, system_role, status FROM campus_users WHERE user_id = $1', [user.id]);
  console.log('Verification:', verifyRes.rows[0]);
  
  const countRes = await db.query("SELECT COUNT(*) FROM campus_users WHERE system_role = 'SUPER_ADMIN'");
  console.log('Total SUPER_ADMIN count:', countRes.rows[0].count);

  process.exit(0);
}
main();
