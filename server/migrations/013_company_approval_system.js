import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 013] Adding company approval system and verification columns...');

    // 1. Add is_approved and approval_notes to college_partner_companies
    await client.query(`
      ALTER TABLE college_partner_companies
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'APPROVED';
    `);

    // 2. Ensure all existing partner companies are marked as approved
    await client.query(`
      UPDATE college_partner_companies
      SET is_approved = TRUE, approval_status = 'APPROVED'
      WHERE is_approved IS NULL;
    `);

    // 3. Index on college and approval status
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_companies_approved 
      ON college_partner_companies(college_id, is_approved);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 013] Migration 013 UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 013] Migration 013 UP failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP INDEX IF EXISTS idx_partner_companies_approved');
    await client.query(`
      ALTER TABLE college_partner_companies
      DROP COLUMN IF EXISTS is_approved,
      DROP COLUMN IF EXISTS approved_at,
      DROP COLUMN IF EXISTS approval_status;
    `);
    await client.query('COMMIT');
    console.log('[MIGRATION 013] Migration 013 DOWN completed.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export { up, down };

if (process.argv[1]?.endsWith('013_company_approval_system.js')) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
