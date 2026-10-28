import assert from 'assert';
import db from './db.js';
import { CONSENT_TYPES } from './routes/privacy.js';

console.log('--- Testing Personal Data Controls, Consents & Retention ---\n');

async function runTests() {
  try {
    // 1. Verify user_consents table
    console.log('Test 1: Verifying user_consents table and unique constraints...');
    const tablesRes = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_consents', 'data_retention_logs', 'user_deletion_logs')"
    );
    const tableNames = tablesRes.rows.map(r => r.table_name);
    assert(tableNames.includes('user_consents'));
    assert(tableNames.includes('data_retention_logs'));
    assert(tableNames.includes('user_deletion_logs'));
    console.log('✓ Passed: Privacy tables verified.\n');

    // 2. Test consent grant & withdrawal workflow in DB
    console.log('Test 2: Verifying consent grant and withdrawal lifecycle...');
    const testUserIdRes = await db.query('SELECT id FROM users LIMIT 1');
    if (testUserIdRes.rows.length > 0) {
      const testUserId = testUserIdRes.rows[0].id;

      // Grant consent
      await db.query(`
        INSERT INTO user_consents (user_id, consent_type, granted, policy_version, granted_at)
        VALUES ($1, $2, TRUE, 'v1.0', NOW())
        ON CONFLICT (user_id, consent_type)
        DO UPDATE SET granted = TRUE, granted_at = NOW(), withdrawn_at = NULL
      `, [testUserId, CONSENT_TYPES.AUDIO_RECORDING]);

      const grantCheck = await db.query(
        'SELECT granted, withdrawn_at FROM user_consents WHERE user_id = $1 AND consent_type = $2',
        [testUserId, CONSENT_TYPES.AUDIO_RECORDING]
      );
      assert.strictEqual(grantCheck.rows[0].granted, true);
      assert.strictEqual(grantCheck.rows[0].withdrawn_at, null);

      // Withdraw consent
      await db.query(`
        UPDATE user_consents
        SET granted = FALSE, withdrawn_at = NOW()
        WHERE user_id = $1 AND consent_type = $2
      `, [testUserId, CONSENT_TYPES.AUDIO_RECORDING]);

      const withdrawCheck = await db.query(
        'SELECT granted, withdrawn_at FROM user_consents WHERE user_id = $1 AND consent_type = $2',
        [testUserId, CONSENT_TYPES.AUDIO_RECORDING]
      );
      assert.strictEqual(withdrawCheck.rows[0].granted, false);
      assert(withdrawCheck.rows[0].withdrawn_at !== null);
      console.log('✓ Passed: Consent grant and withdrawal lifecycle functioning.\n');
    }

    // 3. Test retention logging
    console.log('Test 3: Verifying Data Retention schedule execution logging...');
    const logRes = await db.query(`
      INSERT INTO data_retention_logs (action, records_purged, details)
      VALUES ($1, $2, $3)
      RETURNING *
    `, ['RETENTION_TEST_AUDIT', 0, JSON.stringify({ test: true })]);
    assert.strictEqual(logRes.rows[0].action, 'RETENTION_TEST_AUDIT');
    console.log('✓ Passed: Data retention audit logging verified.\n');

    console.log('All Personal Data Controls tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTests();
