import db from './db.js';

async function inspect() {
  try {
    const cCols = await db.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'colleges' ORDER BY ordinal_position");
    console.log('--- COLLEGES COLUMNS ---');
    console.table(cCols.rows);

    const cuCols = await db.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'campus_users' ORDER BY ordinal_position");
    console.log('--- CAMPUS_USERS COLUMNS ---');
    console.table(cuCols.rows);

    const uCols = await db.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND (column_name ILIKE '%email%' OR column_name ILIKE '%college%' OR column_name ILIKE '%verif%' OR column_name ILIKE '%status%' OR column_name ILIKE '%role%') ORDER BY ordinal_position");
    console.log('--- USERS RELEVANT COLUMNS ---');
    console.table(uCols.rows);

    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('--- ALL PUBLIC TABLES ---');
    console.table(tables.rows);

    const cConstraints = await db.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid IN ('colleges'::regclass, 'campus_users'::regclass)
    `);
    console.log('--- CONSTRAINTS ---');
    console.table(cConstraints.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error inspecting:', err);
    process.exit(1);
  }
}

inspect();
