import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 007] Starting RBAC organization boundaries and Interview Appeals migration...');

    // 1. Add college_id to interview_sessions to enforce organization boundaries natively
    await client.query(`
      ALTER TABLE interview_sessions 
      ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;
    `);

    // Backfill college_id for existing interview sessions from campus_users
    await client.query(`
      UPDATE interview_sessions iss
      SET college_id = cu.college_id
      FROM campus_users cu
      WHERE iss.user_id = cu.user_id 
        AND cu.status = 'ACTIVE' 
        AND cu.college_id IS NOT NULL 
        AND iss.college_id IS NULL;
    `);

    // 2. Create interview_appeals table for candidate correction / appeal channel
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_appeals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
        category VARCHAR(100) DEFAULT 'TECHNICAL_ACCURACY',
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewer_notes TEXT,
        adjusted_score NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Performance & boundary indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_sessions_college ON interview_sessions(college_id);
      CREATE INDEX IF NOT EXISTS idx_interview_appeals_session ON interview_appeals(session_id);
      CREATE INDEX IF NOT EXISTS idx_interview_appeals_user ON interview_appeals(user_id);
      CREATE INDEX IF NOT EXISTS idx_interview_appeals_status ON interview_appeals(status);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 007] UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 007] UP failed:', err);
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
