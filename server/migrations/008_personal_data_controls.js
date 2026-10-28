import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 008] Starting Personal Data Controls & Consent migration...');

    // 1. User Consents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        consent_type VARCHAR(100) NOT NULL,
        granted BOOLEAN NOT NULL DEFAULT TRUE,
        policy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        granted_at TIMESTAMPTZ DEFAULT NOW(),
        withdrawn_at TIMESTAMPTZ,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_consent_type UNIQUE (user_id, consent_type)
      );
    `);

    // 2. Data Retention Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_retention_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(100) NOT NULL,
        records_purged INT NOT NULL DEFAULT 0,
        details JSONB DEFAULT '{}'::jsonb,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. User Deletion Audit Table (Records anonymized timestamp of deletion requests)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_deletion_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deleted_user_id UUID NOT NULL,
        reason TEXT,
        deleted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
      CREATE INDEX IF NOT EXISTS idx_data_retention_action ON data_retention_logs(action);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 008] UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 008] UP failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const run = async () => {
  try {
    await up();
    process.exit(0);
  } catch {
    process.exit(1);
  }
};

run();
