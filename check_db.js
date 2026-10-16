import db from './server/db.js';
async function run() {
  try {
    const colRes = await db.query('SELECT * FROM colleges WHERE code = $1', ['piet24cd']);
    console.log('College piet24cd:', colRes.rows.length > 0 ? colRes.rows[0] : 'Not Found');
    
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', ['devsharma@jobdm.com']);
    if (userRes.rows.length > 0) {
      console.log('User devsharma@jobdm.com:', userRes.rows[0].id);
      const campusRes = await db.query('SELECT * FROM campus_users WHERE user_id = $1', [userRes.rows[0].id]);
      console.log('Campus User Record:', campusRes.rows);
    } else {
      console.log('User devsharma@jobdm.com: Not Found');
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
