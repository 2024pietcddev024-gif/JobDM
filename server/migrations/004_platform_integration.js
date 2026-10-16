import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add columns to hr_jobs
    await client.query(`
      ALTER TABLE hr_jobs 
      ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'Full Time',
      ADD COLUMN IF NOT EXISTS workplace_type VARCHAR(50) DEFAULT 'Remote',
      ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
    `);

    // 2. Add columns to hr_applications
    await client.query(`
      ALTER TABLE hr_applications 
      ADD COLUMN IF NOT EXISTS resume_url TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    // 3. Add assigned_by column to interview_sessions if not exists
    await client.query(`
      ALTER TABLE interview_sessions 
      ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 4. Ensure department table has unique code per college
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hr_jobs_status ON hr_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_hr_applications_status ON hr_applications(status);
    `);

    await client.query('COMMIT');
    console.log("Migration 004 UP completed successfully.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration 004 UP failed:", err);
  } finally {
    client.release();
  }
};

const run = async () => {
  await up();
  process.exit(0);
};

run();
