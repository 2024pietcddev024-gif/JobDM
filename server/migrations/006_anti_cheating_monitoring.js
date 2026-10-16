import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 006] Starting Anti-Cheating Monitoring migration...');

    // 1. INTERVIEW_SESSIONS: Add violation tracking and termination columns
    await client.query(`
      ALTER TABLE interview_sessions 
      ADD COLUMN IF NOT EXISTS tab_switch_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS clipboard_violation_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS termination_reason TEXT,
      ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;
    `);

    // 2. CODING_SESSIONS: Create session table for coding practice
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id VARCHAR(100) NOT NULL,
        language VARCHAR(50) DEFAULT 'Python',
        status VARCHAR(50) DEFAULT 'IN_PROGRESS',
        tab_switch_count INT DEFAULT 0,
        clipboard_violation_count INT DEFAULT 0,
        termination_reason TEXT,
        terminated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. CODING_ATTEMPTS: Link attempts to coding session if available
    await client.query(`
      ALTER TABLE coding_attempts
      ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES coding_sessions(id) ON DELETE SET NULL;
    `);

    // 4. SESSION_VIOLATIONS: Granular audit trail for violation events
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_violations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(100) NOT NULL,
        session_type VARCHAR(50) NOT NULL,
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        violation_type VARCHAR(50) NOT NULL,
        violation_count INT NOT NULL DEFAULT 1,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Performance and Lookup Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_coding_sessions_user ON coding_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_coding_sessions_user_status ON coding_sessions(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_coding_attempts_session ON coding_attempts(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_violations_session ON session_violations(session_id, session_type);
      CREATE INDEX IF NOT EXISTS idx_session_violations_student ON session_violations(student_id);
      CREATE INDEX IF NOT EXISTS idx_session_violations_created_at ON session_violations(created_at);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 006] Anti-Cheating Monitoring migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 006] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

const run = async () => {
  try {
    await up();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
