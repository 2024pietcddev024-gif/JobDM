import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  
  // 1. Add HR to campus_role enum
  // ALTER TYPE cannot run inside a transaction block in Postgres
  try {
    await client.query(`ALTER TYPE campus_role ADD VALUE IF NOT EXISTS 'HR'`);
    console.log("Added 'HR' to campus_role ENUM.");
  } catch (err) {
    console.log("Note: ALTER TYPE might have failed or type already exists", err.message);
  }

  try {
    await client.query('BEGIN');

    // 2. Create hr_jobs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        skills TEXT,
        experience_level VARCHAR(100),
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'OPEN',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Create hr_applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES hr_jobs(id) ON DELETE CASCADE,
        candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'APPLIED',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_candidate_job UNIQUE (job_id, candidate_id)
      )
    `);

    // 4. Create hr_interviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_interviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES hr_applications(id) ON DELETE CASCADE,
        interviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        schedule_time TIMESTAMPTZ NOT NULL,
        stage VARCHAR(100) DEFAULT 'INITIAL',
        status VARCHAR(50) DEFAULT 'SCHEDULED',
        feedback TEXT,
        score INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_hr_jobs_college ON hr_jobs(college_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_hr_applications_job ON hr_applications(job_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_hr_applications_candidate ON hr_applications(candidate_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_hr_interviews_app ON hr_interviews(application_id)');

    await client.query('COMMIT');
    console.log("Migration 003 UP completed successfully.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration 003 UP failed:", err);
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS hr_interviews CASCADE');
    await client.query('DROP TABLE IF EXISTS hr_applications CASCADE');
    await client.query('DROP TABLE IF EXISTS hr_jobs CASCADE');
    // Note: Cannot easily remove a value from a Postgres ENUM, so we leave 'HR' in campus_role
    await client.query('COMMIT');
    console.log("Migration 003 DOWN completed successfully.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration 003 DOWN failed:", err);
  } finally {
    client.release();
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  if (args[0] === 'down') {
    await down();
  } else {
    await up();
  }
  process.exit(0);
};

run();
