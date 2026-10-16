import db from './server/db.js';
async function run() {
  try {
    const pool = db.pool;
    const result = await pool.query("SELECT id, name, code, status FROM colleges WHERE code = 'JOBDM-UNI'");
    console.log('Result:', result.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
