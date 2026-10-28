import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 011] Starting Institutional Bulk Provisioning & First-Time Password Reset migration...');

    // 1. Add must_change_password and student_id_number to users table
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS student_id_number VARCHAR(100);
    `);

    // 2. Add department_id and roll_number to campus_users table
    await client.query(`
      ALTER TABLE campus_users
      ADD COLUMN IF NOT EXISTS roll_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    `);

    // 3. Add indexing
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campus_users_roll ON campus_users(college_id, roll_number);
      CREATE INDEX IF NOT EXISTS idx_users_must_change_pwd ON users(must_change_password) WHERE must_change_password = TRUE;
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 011] Migration 011 UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 011] Migration 011 UP failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      DROP INDEX IF EXISTS idx_campus_users_roll;
      DROP INDEX IF EXISTS idx_users_must_change_pwd;
      ALTER TABLE campus_users
      DROP COLUMN IF EXISTS roll_number,
      DROP COLUMN IF EXISTS department_id;
      ALTER TABLE users
      DROP COLUMN IF EXISTS must_change_password,
      DROP COLUMN IF EXISTS student_id_number;
    `);
    await client.query('COMMIT');
    console.log('[MIGRATION 011] Migration 011 DOWN completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 011] Migration 011 DOWN failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  try {
    if (args[0] === 'down') {
      await down();
    } else {
      await up();
    }
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
};

run();
