import db from '../db.js';

const provisionHR = async () => {
  const args = process.argv.slice(2);
  const userEmail = args[0];
  const collegeCode = args[1];

  if (!userEmail || !collegeCode) {
    console.error("Usage: node provisionHR.js <user_email> <college_code>");
    process.exit(1);
  }

  try {
    // Get user ID
    const userRes = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userRes.rows.length === 0) {
      console.error(`User with email ${userEmail} not found.`);
      process.exit(1);
    }
    const userId = userRes.rows[0].id;

    // Get college ID
    const collegeRes = await db.query('SELECT id FROM colleges WHERE code = $1', [collegeCode]);
    if (collegeRes.rows.length === 0) {
      console.error(`College with code ${collegeCode} not found.`);
      process.exit(1);
    }
    const collegeId = collegeRes.rows[0].id;

    // Insert or update HR role
    await db.query(`
      INSERT INTO campus_users (user_id, college_id, system_role)
      VALUES ($1, $2, 'HR')
      ON CONFLICT (user_id, college_id) 
      DO UPDATE SET system_role = 'HR', status = 'ACTIVE'
    `, [userId, collegeId]);

    console.log(`Successfully provisioned HR role for ${userEmail} at college ${collegeCode}.`);
  } catch (err) {
    console.error("Failed to provision HR user:", err);
  } finally {
    process.exit(0);
  }
};

provisionHR();
