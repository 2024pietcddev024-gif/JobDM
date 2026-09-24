import db from './server/db.js';
async function test() {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log(res.rows.map(r => r.column_name));
    
    // Also let's try a dummy insert to see the exact error
    try {
      await db.query(
        'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, target_role, target_level, streak_days',
        ['Test', 'test@test.com', 'hash']
      );
    } catch (e) {
      console.log('INSERT ERROR:', e.message);
    }
    
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
test();
