import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Role Enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE campus_role AS ENUM ('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TUTOR', 'STUDENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Colleges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS colleges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        domain VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Departments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_college_dept_code UNIQUE (college_id, code),
        CONSTRAINT unique_dept_college UNIQUE (id, college_id)
      )
    `);

    // 4. Batches Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
        department_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT fk_batch_department 
          FOREIGN KEY (department_id, college_id) 
          REFERENCES departments(id, college_id) ON DELETE CASCADE
      )
    `);

    // 5. Campus Users (Identity Layer)
    await client.query(`
      CREATE TABLE IF NOT EXISTS campus_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
        system_role campus_role NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_college UNIQUE (user_id, college_id),
        CONSTRAINT chk_college_role CHECK (
            (system_role = 'SUPER_ADMIN' AND college_id IS NULL) OR
            (system_role != 'SUPER_ADMIN' AND college_id IS NOT NULL)
        )
      )
    `);

    // 6. Batch Tutors (M:N)
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_tutors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        tutor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_batch_tutor UNIQUE (batch_id, tutor_user_id)
      )
    `);

    // 7. Student Enrollments
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_student_batch UNIQUE (student_user_id, batch_id)
      )
    `);

    // 8. Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_campus_users_user_id ON campus_users(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_campus_users_college_id ON campus_users(college_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_tutors_tutor ON batch_tutors(tutor_user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_tutors_batch ON batch_tutors(batch_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_enrollments(student_user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_student_enrollments_batch ON student_enrollments(batch_id)');
    
    // Partial Unique Index for SUPER_ADMIN
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_super_admin_identity
      ON campus_users(user_id)
      WHERE system_role = 'SUPER_ADMIN'
    `);

    await client.query('COMMIT');
    console.log("Migration UP completed successfully.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration UP failed:", err);
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS student_enrollments CASCADE');
    await client.query('DROP TABLE IF EXISTS batch_tutors CASCADE');
    await client.query('DROP TABLE IF EXISTS campus_users CASCADE');
    await client.query('DROP TABLE IF EXISTS batches CASCADE');
    await client.query('DROP TABLE IF EXISTS departments CASCADE');
    await client.query('DROP TABLE IF EXISTS colleges CASCADE');
    await client.query('DROP TYPE IF EXISTS campus_role CASCADE');
    await client.query('COMMIT');
    console.log("Migration DOWN completed successfully.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration DOWN failed:", err);
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
