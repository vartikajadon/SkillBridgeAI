-- ==============================================================================
-- SkillBridge AI: Complete 13-Table Relational Database Schema
-- Target Engine: Supabase PostgreSQL (pgvector compatible)
-- ==============================================================================

-- Optional: Enable extensions when ready and approved
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ------------------------------------------------------------------------------
-- 1. job_roles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_job_roles_code ON job_roles (code);
CREATE INDEX IF NOT EXISTS ix_job_roles_department ON job_roles (department);

-- ------------------------------------------------------------------------------
-- 2. competencies
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_competency_category CHECK (category IN ('Technical', 'Domain', 'Behavioral'))
);

CREATE INDEX IF NOT EXISTS ix_competencies_code ON competencies (code);

-- ------------------------------------------------------------------------------
-- 3. courses
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    provider VARCHAR(255) NOT NULL DEFAULT 'iGOT Karmayogi',
    duration_hours INT NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_course_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT ck_course_duration CHECK (duration_hours > 0)
);

CREATE INDEX IF NOT EXISTS ix_courses_code ON courses (code);
CREATE INDEX IF NOT EXISTS ix_courses_provider ON courses (provider);

-- ------------------------------------------------------------------------------
-- 4. users (Application profile matching Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'learner',
    department VARCHAR(255),
    designation VARCHAR(255),
    employee_id VARCHAR(100) UNIQUE,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_user_role CHECK (role IN ('learner', 'trainer', 'admin'))
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_employee_id ON users (employee_id);
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);
CREATE INDEX IF NOT EXISTS ix_users_job_role_id ON users (job_role_id);

-- ------------------------------------------------------------------------------
-- 5. role_competencies
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    target_level INT NOT NULL,
    criticality VARCHAR(50) NOT NULL DEFAULT 'Mandatory',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_role_target_level CHECK (target_level BETWEEN 1 AND 5),
    CONSTRAINT ck_role_competency_criticality CHECK (criticality IN ('Mandatory', 'Desirable')),
    CONSTRAINT uq_role_competency UNIQUE (job_role_id, competency_id)
);

CREATE INDEX IF NOT EXISTS ix_role_competencies_job_role_id ON role_competencies (job_role_id);
CREATE INDEX IF NOT EXISTS ix_role_competencies_competency_id ON role_competencies (competency_id);

-- ------------------------------------------------------------------------------
-- 6. learner_competencies
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learner_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
    current_level INT NOT NULL DEFAULT 1,
    target_level INT NOT NULL DEFAULT 1,
    gap_score INT NOT NULL DEFAULT 0,
    last_assessed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_learner_current_level CHECK (current_level BETWEEN 1 AND 5),
    CONSTRAINT ck_learner_target_level CHECK (target_level BETWEEN 1 AND 5),
    CONSTRAINT uq_learner_competency UNIQUE (user_id, competency_id)
);

CREATE INDEX IF NOT EXISTS ix_learner_competencies_user_id ON learner_competencies (user_id);
CREATE INDEX IF NOT EXISTS ix_learner_competencies_competency_id ON learner_competencies (competency_id);

-- ------------------------------------------------------------------------------
-- 7. course_competencies
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    target_level_achieved INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_course_competency_level CHECK (target_level_achieved BETWEEN 1 AND 5),
    CONSTRAINT uq_course_competency UNIQUE (course_id, competency_id)
);

CREATE INDEX IF NOT EXISTS ix_course_competencies_course_id ON course_competencies (course_id);
CREATE INDEX IF NOT EXISTS ix_course_competencies_competency_id ON course_competencies (competency_id);

-- ------------------------------------------------------------------------------
-- 8. enrollments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'enrolled',
    progress_percentage INT NOT NULL DEFAULT 0,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_enrollment_status CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
    CONSTRAINT ck_enrollment_progress CHECK (progress_percentage BETWEEN 0 AND 100),
    CONSTRAINT uq_user_course_enrollment UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS ix_enrollments_user_id ON enrollments (user_id);
CREATE INDEX IF NOT EXISTS ix_enrollments_course_id ON enrollments (course_id);

-- ------------------------------------------------------------------------------
-- 9. training_documents
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size_bytes INT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_document_status CHECK (status IN ('pending', 'processed', 'failed')),
    CONSTRAINT ck_document_file_size CHECK (file_size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS ix_training_documents_uploaded_by ON training_documents (uploaded_by);

-- ------------------------------------------------------------------------------
-- 10. document_chunks (pgvector compatible)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES training_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    metadata_json JSONB,
    embedding TEXT, -- When pgvector extension is enabled, migrate column to: vector(1536)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_chunk_index_positive CHECK (chunk_index >= 0),
    CONSTRAINT ck_token_count_positive CHECK (token_count >= 0)
);

CREATE INDEX IF NOT EXISTS ix_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS ix_doc_chunk_order ON document_chunks (document_id, chunk_index);

-- ------------------------------------------------------------------------------
-- 11. quizzes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    competency_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    total_marks INT NOT NULL DEFAULT 100,
    passing_marks INT NOT NULL DEFAULT 60,
    questions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_quiz_total_marks CHECK (total_marks > 0),
    CONSTRAINT ck_quiz_passing_marks CHECK (passing_marks >= 0 AND passing_marks <= total_marks)
);

CREATE INDEX IF NOT EXISTS ix_quizzes_course_id ON quizzes (course_id);
CREATE INDEX IF NOT EXISTS ix_quizzes_competency_id ON quizzes (competency_id);
CREATE INDEX IF NOT EXISTS ix_quizzes_created_by ON quizzes (created_by);

-- ------------------------------------------------------------------------------
-- 12. quiz_attempts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    percentage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    answers JSONB NOT NULL,
    ai_feedback TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_attempt_score_positive CHECK (score >= 0),
    CONSTRAINT ck_attempt_percentage CHECK (percentage >= 0.0 AND percentage <= 100.0)
);

CREATE INDEX IF NOT EXISTS ix_quiz_attempts_quiz_id ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_user_id ON quiz_attempts (user_id);

-- ------------------------------------------------------------------------------
-- 13. audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);
