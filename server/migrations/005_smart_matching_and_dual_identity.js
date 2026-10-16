import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[MIGRATION 005] Starting Smart Matching and Dual Identity migration...');

    // 1. INTERVIEW_SESSIONS: Add status, completed_at, question count tracking
    await client.query(`
      ALTER TABLE interview_sessions 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'IN_PROGRESS',
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS answered_questions INT DEFAULT 0;
    `);

    // Normalize and backfill existing sessions:
    // Mark valid scored sessions as COMPLETED
    await client.query(`
      UPDATE interview_sessions
      SET status = 'COMPLETED',
          completed_at = COALESCE(completed_at, created_at)
      WHERE overall_score IS NOT NULL AND overall_score > 0.5 AND (status IS NULL OR status = 'IN_PROGRESS');
    `);

    // Scale 10-point scale scores to 100-point percentage scale (e.g. 8.5 -> 85.0)
    await client.query(`
      UPDATE interview_sessions
      SET overall_score = ROUND(overall_score * 10, 1)
      WHERE overall_score IS NOT NULL AND overall_score <= 10.0 AND overall_score > 0.5;
    `);

    // Mark empty/abandoned test sessions as ABANDONED so they never inflate counts or distort averages
    await client.query(`
      UPDATE interview_sessions
      SET status = 'ABANDONED'
      WHERE (overall_score IS NULL OR overall_score <= 0.5) AND (status IS NULL OR status = 'IN_PROGRESS');
    `);

    // Indexes for fast, consistent aggregations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_status ON interview_sessions(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_interview_sessions_completed ON interview_sessions(status, overall_score);
    `);

    // 2. USERS: Add Dual Email Identity & Lifecycle tracking
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS college_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS college_email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS college_email_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS personal_email_verified BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS personal_email_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS primary_contact_preference VARCHAR(50) DEFAULT 'PERSONAL',
      ADD COLUMN IF NOT EXISTS account_lifecycle_status VARCHAR(50) DEFAULT 'ACTIVE_STUDENT',
      ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(20);
    `);

    // Backfill personal_email with canonical email if not set
    await client.query(`
      UPDATE users
      SET personal_email = email,
          personal_email_verified = true,
          personal_email_verified_at = COALESCE(personal_email_verified_at, created_at)
      WHERE personal_email IS NULL;
    `);

    // Set institutional college emails for test students
    await client.query(`
      UPDATE users
      SET college_email = 'arjun.sharma@piet.edu',
          college_email_verified = true,
          college_email_verified_at = NOW(),
          account_lifecycle_status = 'ACTIVE_STUDENT',
          graduation_year = '2026'
      WHERE email = 'arjun@gmail.com';

      UPDATE users
      SET college_email = 'priya.patel@piet.edu',
          college_email_verified = true,
          college_email_verified_at = NOW(),
          account_lifecycle_status = 'ACTIVE_STUDENT',
          graduation_year = '2026'
      WHERE email = 'priya@gmail.com';

      UPDATE users
      SET college_email = 'rahul.kumar@piet.edu',
          college_email_verified = true,
          college_email_verified_at = NOW(),
          account_lifecycle_status = 'ACTIVE_STUDENT',
          graduation_year = '2027'
      WHERE email = 'rahul@gmail.com';
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_college_email ON users(college_email);
      CREATE INDEX IF NOT EXISTS idx_users_personal_email ON users(personal_email);
      CREATE INDEX IF NOT EXISTS idx_users_lifecycle ON users(account_lifecycle_status);
    `);

    // 3. COLLEGES: Add Institutional Onboarding & Verification fields
    await client.query(`
      ALTER TABLE colleges
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verification_notes TEXT,
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
    `);

    // Ensure piet24cd college is marked verified and active
    await client.query(`
      UPDATE colleges
      SET status = 'ACTIVE',
          verified_at = COALESCE(verified_at, NOW()),
          verification_notes = 'Verified founding engineering institution'
      WHERE code = 'piet24cd';
    `);

    // 4. HR_JOBS: Add Structured Requirements for Smart Matching
    await client.query(`
      ALTER TABLE hr_jobs
      ADD COLUMN IF NOT EXISTS preferred_skills TEXT,
      ADD COLUMN IF NOT EXISTS required_degree VARCHAR(100) DEFAULT 'B.Tech / B.E.',
      ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC(3,2),
      ADD COLUMN IF NOT EXISTS min_interview_score NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS min_coding_solved INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS eligibility_criteria JSONB;
    `);

    // Populate existing jobs with realistic smart matching criteria
    await client.query(`
      UPDATE hr_jobs
      SET preferred_skills = 'Docker, TypeScript, AWS, CI/CD',
          required_degree = 'B.Tech CSE/IT',
          min_interview_score = 70.0,
          min_coding_solved = 1
      WHERE title ILIKE '%Developer%' OR title ILIKE '%Software%';

      UPDATE hr_jobs
      SET preferred_skills = 'Python, SQL, Tableau, PowerBI',
          required_degree = 'Any Engineering / Science Degree',
          min_interview_score = 65.0,
          min_coding_solved = 0
      WHERE title ILIKE '%Analyst%' OR title ILIKE '%Data%';
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION 005] Migration 005 UP completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION 005] Migration 005 failed:', err);
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
    process.exit(1);
  }
};

run();
