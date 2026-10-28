import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 009] Starting Multi-Tenant Governance and HR College Permissions migration...');

    // 1. Create hr_college_permissions table for explicit Super-Admin permission control
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_college_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hr_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_hr_college_perm UNIQUE (hr_user_id, college_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_college_permissions_user ON hr_college_permissions(hr_user_id);
      CREATE INDEX IF NOT EXISTS idx_hr_college_permissions_college ON hr_college_permissions(college_id);
    `);

    // 2. Backfill existing HR users into hr_college_permissions from campus_users
    await client.query(`
      INSERT INTO hr_college_permissions (hr_user_id, college_id, status, notes)
      SELECT user_id, college_id, 'ACTIVE', 'Migrated from campus_users'
      FROM campus_users
      WHERE system_role = 'HR' AND college_id IS NOT NULL
      ON CONFLICT (hr_user_id, college_id) DO NOTHING;
    `);

    // 3. Add target_domain to hr_jobs
    await client.query(`
      ALTER TABLE hr_jobs
      ADD COLUMN IF NOT EXISTS target_domain VARCHAR(100),
      ADD COLUMN IF NOT EXISTS verified_by_admin BOOLEAN DEFAULT TRUE;
    `);

    // Populate target_domain based on existing job titles and skills
    await client.query(`
      UPDATE hr_jobs
      SET target_domain = 'frontend'
      WHERE (title ILIKE '%Frontend%' OR title ILIKE '%React%' OR title ILIKE '%UI%')
      AND target_domain IS NULL;

      UPDATE hr_jobs
      SET target_domain = 'backend'
      WHERE (title ILIKE '%Backend%' OR title ILIKE '%Node%' OR title ILIKE '%Java%' OR title ILIKE '%API%')
      AND target_domain IS NULL;

      UPDATE hr_jobs
      SET target_domain = 'data_science'
      WHERE (title ILIKE '%Data%' OR title ILIKE '%Analyst%' OR title ILIKE '%Machine Learning%' OR title ILIKE '%AI%')
      AND target_domain IS NULL;

      UPDATE hr_jobs
      SET target_domain = 'fullstack'
      WHERE (title ILIKE '%Full Stack%' OR title ILIKE '%Software Engineer%' OR title ILIKE '%Developer%')
      AND target_domain IS NULL;
    `);

    // 4. Ensure colleges table has status checks and indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_colleges_status_code ON colleges(status, code);
      CREATE INDEX IF NOT EXISTS idx_colleges_domain ON colleges(domain);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 009] Migration 009 UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 009] Migration 009 UP failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS hr_college_permissions CASCADE');
    await client.query('ALTER TABLE hr_jobs DROP COLUMN IF EXISTS target_domain');
    await client.query('COMMIT');
    console.log('[MIGRATION 009] Migration 009 DOWN completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 009] Migration 009 DOWN failed:', err);
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
