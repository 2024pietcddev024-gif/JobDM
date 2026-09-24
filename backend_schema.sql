-- PostgreSQL Database Schema for InterviewIQ Platform

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    target_role VARCHAR(50) DEFAULT 'Backend Developer',
    target_level VARCHAR(20) DEFAULT 'Intermediate',
    streak_days INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    extracted_skills JSONB,
    extracted_projects JSONB,
    raw_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    role VARCHAR(50),
    difficulty VARCHAR(20) NOT NULL,
    mode VARCHAR(20) DEFAULT 'voice',
    overall_score DECIMAL(3, 1),
    duration_minutes INT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'conceptual',
    topics JSONB,
    expected_keywords JSONB,
    coding_starter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    transcript TEXT,
    code_content TEXT,
    audio_recording_url TEXT,
    wpm INT,
    filler_words_count INT,
    eye_contact_score INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID REFERENCES answers(id) ON DELETE CASCADE,
    accuracy_score DECIMAL(3, 1),
    communication_score DECIMAL(3, 1),
    confidence_score DECIMAL(3, 1),
    depth_score DECIMAL(3, 1),
    examples_score DECIMAL(3, 1),
    overall_score DECIMAL(3, 1),
    strengths JSONB,
    improvements JSONB,
    detailed_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast analytics queries
CREATE INDEX idx_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_questions_session ON questions(session_id);
CREATE INDEX idx_answers_question ON answers(question_id);
