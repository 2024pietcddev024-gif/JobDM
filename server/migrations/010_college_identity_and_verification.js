import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 010] Starting College Identity, Student/Teacher Verification & Institutional Login migration...');

    // 1. Add verification columns to campus_users
    await client.query(`
      ALTER TABLE campus_users
      ADD COLUMN IF NOT EXISTS institutional_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'MANUAL';
    `);

    // 2. Add safe indexes on campus_users
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campus_users_inst_email ON campus_users(LOWER(institutional_email));
      CREATE INDEX IF NOT EXISTS idx_campus_users_college_status ON campus_users(college_id, status);
    `);

    // Unique constraint: No two users can share the same institutional email at the same college
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_college_inst_email 
      ON campus_users (college_id, LOWER(institutional_email)) 
      WHERE institutional_email IS NOT NULL AND status != 'INACTIVE';
    `);

    // 3. Backfill institutional_email in campus_users from users.college_email where available
    await client.query(`
      UPDATE campus_users cu
      SET institutional_email = u.college_email,
          verified_at = COALESCE(u.college_email_verified_at, cu.created_at),
          verification_method = 'HISTORICAL_BACKFILL'
      FROM users u
      WHERE cu.user_id = u.id 
        AND u.college_email IS NOT NULL 
        AND cu.institutional_email IS NULL;
    `);

    // 4. Create college_approved_roster table for pre-approved institutional enrollments
    await client.query(`
      CREATE TABLE IF NOT EXISTS college_approved_roster (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        institutional_email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'STUDENT',
        department_code VARCHAR(50),
        academic_year VARCHAR(20),
        batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'PRE_APPROVED',
        added_by UUID REFERENCES users(id) ON DELETE SET NULL,
        enrolled_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        enrolled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_college_roster_email UNIQUE (college_id, institutional_email)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_roster_lookup ON college_approved_roster(college_id, LOWER(institutional_email));
    `);

    // 5. Create college_verification_tokens table for single-use time-limited email tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS college_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        institutional_email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        token_type VARCHAR(50) DEFAULT 'INSTITUTIONAL_EMAIL_VERIFICATION',
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_token ON college_verification_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_verification_user ON college_verification_tokens(user_id, college_id);
    `);

    // 6. Ensure colleges table has status values normalized and indexed
    await client.query(`
      UPDATE colleges 
      SET status = 'ACTIVE' 
      WHERE status IS NULL OR status = '';

      CREATE INDEX IF NOT EXISTS idx_colleges_lower_code ON colleges(LOWER(code));
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 010] Migration 010 UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 010] Migration 010 UP failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS college_verification_tokens CASCADE');
    await client.query('DROP TABLE IF EXISTS college_approved_roster CASCADE');
    await client.query(`
      DROP INDEX IF EXISTS unique_college_inst_email;
      DROP INDEX IF EXISTS idx_campus_users_inst_email;
      DROP INDEX IF EXISTS idx_campus_users_college_status;
      DROP INDEX IF EXISTS idx_colleges_lower_code;
      ALTER TABLE campus_users 
      DROP COLUMN IF EXISTS institutional_email,
      DROP COLUMN IF EXISTS verified_at,
      DROP COLUMN IF EXISTS verified_by,
      DROP COLUMN IF EXISTS verification_method;
    `);
    await client.query('COMMIT');
    console.log('[MIGRATION 010] Migration 010 DOWN completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 010] Migration 010 DOWN failed:', err);
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
