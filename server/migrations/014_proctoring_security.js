import db from '../db.js';

export async function up() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    console.log('[MIGRATION 014] Adding proctoring & anti-cheating security columns...');

    await client.query(`
      ALTER TABLE interview_sessions
      ADD COLUMN IF NOT EXISTS proctoring_violations_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS face_violation_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS voice_violation_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS proctoring_flags JSONB DEFAULT '[]'::jsonb;
    `);

    // Ensure session_violations violation_type is indexed
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_violations_type 
      ON session_violations(violation_type);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 014] Proctoring & Anti-cheating migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 014] Failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('014_proctoring_security.js')) {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
}
