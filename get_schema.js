import db from './server/db.js';
async function run() {
  try {
    let res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.log('USERS SCHEMA:', res.rows.map(r => r.column_name).join(', '));
    res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'colleges'");
    console.log('COLLEGES SCHEMA:', res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
