import db from '../server/db.js';

async function verify() {
  const client = await db.pool.connect();
  try {
    console.log("=== Verification Script ===");
    
    // 1. Verify Tables Exist
    const tables = ['colleges', 'departments', 'batches', 'campus_users', 'batch_tutors', 'student_enrollments', 'users'];
    for (const table of tables) {
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `, [table]);
      console.log(`Table '${table}' exists: ${res.rows[0].exists}`);
    }

    // 2. Verify Enum Type
    const enumRes = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'campus_role'
      );
    `);
    console.log(`Enum 'campus_role' exists: ${enumRes.rows[0].exists}`);

    // 3. Verify Users table columns to ensure it was untouched
    const usersRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    const userColumns = usersRes.rows.map(r => r.column_name);
    console.log(`Users table columns: ${userColumns.join(', ')}`);
    if (!userColumns.includes('system_role') && !userColumns.includes('college_id')) {
      console.log("Users table verified: UNTOUCHED.");
    } else {
      console.log("Users table modified!");
    }

    // 4. Verify Constraints and Indexes
    const idxRes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('campus_users', 'batch_tutors', 'student_enrollments');
    `);
    const indexes = idxRes.rows.map(r => r.indexname);
    console.log(`Indexes found: ${indexes.join(', ')}`);

    const chkRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'chk_college_role';
    `);
    console.log(`Check constraint 'chk_college_role' exists: ${chkRes.rows.length > 0}`);

    const fkeyRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'fk_batch_department';
    `);
    console.log(`Foreign key 'fk_batch_department' exists: ${fkeyRes.rows.length > 0}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

verify();
