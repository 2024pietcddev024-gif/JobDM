import db from './server/db.js';
async function verify() {
  const tables = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('hr_jobs', 'hr_applications', 'hr_interviews')
  `);
  console.log('Tables found:', tables.rows.map(r => r.table_name));

  const enumVals = await db.query(`
    SELECT unnest(enum_range(NULL::campus_role))::text as role;
  `);
  console.log('Roles found:', enumVals.rows.map(r => r.role));
  
  process.exit(0);
}
verify();
