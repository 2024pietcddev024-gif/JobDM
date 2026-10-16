import db from '../db.js';

const up = async () => {
  const client = await db.pool.connect(); // Assuming db.js exports pool, or just use db.query
  try {
    await client.query('BEGIN');

    // 1. Create coding_problems table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_problems (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        topic VARCHAR(100) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        input_format TEXT,
        output_format TEXT,
        constraints JSONB,
        hints JSONB,
        starter_code JSONB,
        wrapper_metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. Create coding_test_cases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_test_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id VARCHAR(50) NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
        input TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        explanation TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Create coding_solved tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_solved (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id VARCHAR(50) NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
        language VARCHAR(50),
        solved_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_problem UNIQUE (user_id, problem_id)
      )
    `);

    // 4. Create indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_coding_problems_topic ON coding_problems(topic)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON coding_problems(difficulty)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_coding_test_cases_problem_id ON coding_test_cases(problem_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_coding_solved_user_id ON coding_solved(user_id)');

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
    await client.query('DROP TABLE IF EXISTS coding_solved CASCADE');
    await client.query('DROP TABLE IF EXISTS coding_test_cases CASCADE');
    await client.query('DROP TABLE IF EXISTS coding_problems CASCADE');
    await client.query('COMMIT');
    console.log("Migration DOWN (rollback) completed successfully.");
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
