import db from '../db.js';

async function init() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS aptitude_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(255) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        options JSONB,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        starter_code TEXT,
        expected_output TEXT,
        test_cases JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS aptitude_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        total_questions INT NOT NULL,
        completed_questions INT DEFAULT 0,
        correct_answers INT DEFAULT 0,
        incorrect_answers INT DEFAULT 0,
        skipped_answers INT DEFAULT 0,
        score NUMERIC(5,2),
        duration_minutes INT,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE TABLE IF NOT EXISTS aptitude_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES aptitude_sessions(id) ON DELETE CASCADE,
        question_id UUID REFERENCES aptitude_questions(id) ON DELETE CASCADE,
        user_answer TEXT,
        is_correct BOOLEAN,
        time_taken_seconds INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Aptitude tables created successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

init();
