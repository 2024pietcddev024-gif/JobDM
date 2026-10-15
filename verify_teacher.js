import db from './server/db.js';
async function run() {
  try {
    const pool = db.pool;
    
    const queryResult = await pool.query(`
      SELECT 
        u.email, 
        u.id AS user_id, 
        c.name AS college_name, 
        cu.system_role, 
        cu.status
      FROM users u
      JOIN campus_users cu ON u.id = cu.user_id
      JOIN colleges c ON cu.college_id = c.id
      WHERE u.email = 'teacher.test1@jobdm.edu'
    `);
    
    console.log('Verification Result:', queryResult.rows[0]);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
