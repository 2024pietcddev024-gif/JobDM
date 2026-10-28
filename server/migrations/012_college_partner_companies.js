import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 012] Starting College Partner Companies & Hiring Networks migration...');

    // 1. Create college_partner_companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS college_partner_companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        industry VARCHAR(100) DEFAULT 'Information Technology',
        recruiter_name VARCHAR(255),
        recruiter_email VARCHAR(255),
        partnership_status VARCHAR(50) DEFAULT 'ACTIVE',
        tier VARCHAR(50) DEFAULT 'TIER_1',
        website VARCHAR(255),
        logo_url TEXT,
        notes TEXT,
        mou_signed BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Add columns to hr_jobs to link with company name and partner company
    await client.query(`
      ALTER TABLE hr_jobs
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS partner_company_id UUID REFERENCES college_partner_companies(id) ON DELETE SET NULL;
    `);

    // 3. Add indexing
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_companies_college ON college_partner_companies(college_id);
      CREATE INDEX IF NOT EXISTS idx_partner_companies_status ON college_partner_companies(college_id, partnership_status);
      CREATE INDEX IF NOT EXISTS idx_hr_jobs_partner_comp ON hr_jobs(partner_company_id);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 012] Migration 012 UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 012] Migration 012 UP failed:', err);
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
      DROP INDEX IF EXISTS idx_partner_companies_college;
      DROP INDEX IF EXISTS idx_partner_companies_status;
      DROP INDEX IF EXISTS idx_hr_jobs_partner_comp;
      ALTER TABLE hr_jobs
      DROP COLUMN IF EXISTS partner_company_id,
      DROP COLUMN IF EXISTS company_name;
      DROP TABLE IF EXISTS college_partner_companies CASCADE;
    `);
    await client.query('COMMIT');
    console.log('[MIGRATION 012] Migration 012 DOWN completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 012] Migration 012 DOWN failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (process.argv[1]?.endsWith('012_college_partner_companies.js')) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { up, down };
