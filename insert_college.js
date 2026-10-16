import db from './server/db.js';
async function run() {
  try {
    const pool = db.pool;
    
    // 1. Insert
    const insertResult = await pool.query(`
      INSERT INTO colleges (name, code, domain, status)
      VALUES ('JobDM University', 'JOBDM-UNI', 'jobdm.edu', 'ACTIVE')
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `);
    
    const wasCreated = insertResult.rows.length > 0;

    // 2. Query
    const queryResult = await pool.query(
      "SELECT id, name, code, status FROM colleges WHERE code = 'JOBDM-UNI'"
    );
    
    console.log('Was Created:', wasCreated);
    console.log('Result:', queryResult.rows[0]);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
