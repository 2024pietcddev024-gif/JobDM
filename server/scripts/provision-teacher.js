import db from '../db.js';
import bcrypt from 'bcrypt';

async function provisionTeacher() {
  const args = process.argv.slice(2);
  const email = args.find(a => a.startsWith('--email='))?.split('=')[1];
  const collegeIdArg = args.find(a => a.startsWith('--college-id='))?.split('=')[1];
  const password = process.env.PROVISION_PASSWORD;

  if (!email || !password) {
    console.error('❌ Usage: PROVISION_PASSWORD=your_secure_password node server/scripts/provision-teacher.js --email=teacher@example.com [--college-id=uuid]');
    process.exit(1);
  }

  console.log('🔄 Starting Teacher (TUTOR) provisioning...');

  // Ensure database pool is initialized
  if (!db.pool) {
    console.error('❌ Database connection not configured.');
    process.exit(1);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify/fetch college
    // The schema specifies: (system_role != 'SUPER_ADMIN' AND college_id IS NOT NULL)
    let collegeId = collegeIdArg;
    if (!collegeId) {
      const colRes = await client.query('SELECT id, name FROM colleges LIMIT 1');
      if (colRes.rows.length === 0) {
        throw new Error('No colleges exist in the database. A college is required for TUTOR roles. Please provision a college first.');
      }
      collegeId = colRes.rows[0].id;
      console.log(`ℹ️ No --college-id provided. Automatically selected existing college: ${colRes.rows[0].name} (${collegeId})`);
    } else {
      const colRes = await client.query('SELECT id, name FROM colleges WHERE id = $1', [collegeId]);
      if (colRes.rows.length === 0) {
        throw new Error(`College with ID ${collegeId} not found.`);
      }
      console.log(`ℹ️ Selected college: ${colRes.rows[0].name} (${collegeId})`);
    }

    // 2. Fetch or create user
    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      console.log(`ℹ️ User ${email} already exists. Reusing existing user_id: ${userId}`);
      console.log(`⚠️ Note: Password was NOT updated for the existing user. Providing a different PROVISION_PASSWORD does nothing for existing users.`);
    } else {
      console.log(`ℹ️ Creating new user account: ${email}`);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const newU = await client.query(
        'INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [email, email.split('@')[0], hash]
      );
      userId = newU.rows[0].id;
    }

    // 3. Provision campus_users role
    const campRes = await client.query('SELECT system_role FROM campus_users WHERE user_id = $1 AND college_id = $2', [userId, collegeId]);
    
    if (campRes.rows.length > 0) {
      const role = campRes.rows[0].system_role;
      if (role === 'TUTOR') {
        console.log(`✅ User is already provisioned as a TUTOR for college ${collegeId}. No changes needed.`);
      } else {
        throw new Error(`User is already provisioned with a conflicting role (${role}). Silent role modification is unsafe and forbidden.`);
      }
    } else {
      await client.query(
        "INSERT INTO campus_users (user_id, college_id, system_role, status) VALUES ($1, $2, 'TUTOR', 'ACTIVE')",
        [userId, collegeId]
      );
      console.log(`✅ Successfully provisioned TUTOR role for user ${userId} at college ${collegeId}`);
    }

    await client.query('COMMIT');
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('❌ Provisioning failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

provisionTeacher();
