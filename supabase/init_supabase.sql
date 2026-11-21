-- ============================================================================
-- SkillBridge AI — Supabase PostgreSQL Initialization & Security Architecture
-- ============================================================================
-- Architecture Notes:
-- 1. Database Connection Model:
--    - The FastAPI backend connects to PostgreSQL/Supabase using `DATABASE_URL` as the `postgres` role.
--    - In Supabase, the `postgres` superuser/admin role possesses `BYPASSRLS`.
--    - Therefore, the FastAPI backend acts as the authoritative application gateway enforcing RBAC,
--      input validation, ownership isolation, and audit telemetry.
-- 2. Defense-in-Depth RLS Architecture:
--    - Row-Level Security (RLS) is enabled on ALL 13 application tables.
--    - These policies govern direct client access (via Supabase client SDKs, PostgREST, or anon/authenticated JWTs).
--    - DIRECT CLIENT WRITES ARE BLOCKED across business-critical tables (users, courses, enrollments,
--      quizzes, attempts, competencies, documents, chunks, audit_logs).
--    - All mutations MUST route through the FastAPI backend API.
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Enable RLS Across All 13 Tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_role_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS learner_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Row Level Security Policies (13-Table Matrix)
-- ============================================================================

-- Table 1: users
-- Direct reads: Authenticated user can read their own profile.
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid()::uuid);
-- Direct writes: BLOCKED (Managed exclusively by backend auth registration/admin API).

-- Table 2: competencies (Catalogue)
-- Direct reads: Public/authenticated users can view the standard competency directory.
DROP POLICY IF EXISTS "Public read competencies" ON competencies;
CREATE POLICY "Public read competencies" ON competencies
    FOR SELECT TO authenticated, anon
    USING (true);
-- Direct writes: BLOCKED.

-- Table 3: job_roles (Catalogue)
-- Direct reads: Public/authenticated users can view public sector job roles.
DROP POLICY IF EXISTS "Public read job_roles" ON job_roles;
CREATE POLICY "Public read job_roles" ON job_roles
    FOR SELECT TO authenticated, anon
    USING (true);
-- Direct writes: BLOCKED.

-- Table 4: job_role_competencies (Catalogue Mapping)
-- Direct reads: Public/authenticated users can view role competency benchmarks.
DROP POLICY IF EXISTS "Public read job_role_competencies" ON job_role_competencies;
CREATE POLICY "Public read job_role_competencies" ON job_role_competencies
    FOR SELECT TO authenticated, anon
    USING (true);
-- Direct writes: BLOCKED.

-- Table 5: courses (Catalogue)
-- Direct reads: Authenticated users can view active published courses.
DROP POLICY IF EXISTS "Users read active courses" ON courses;
CREATE POLICY "Users read active courses" ON courses
    FOR SELECT TO authenticated
    USING (is_active = true);
-- Direct writes: BLOCKED.

-- Table 6: enrollments
-- Direct reads: Learners read only their own enrollments.
DROP POLICY IF EXISTS "Learners read own enrollments" ON enrollments;
CREATE POLICY "Learners read own enrollments" ON enrollments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::uuid);
-- Direct writes: BLOCKED (Enrollment validation & prerequisites enforced by backend).

-- Table 7: learner_competencies
-- Direct reads: Learners read only their own competency evaluations.
DROP POLICY IF EXISTS "Learners read own competencies" ON learner_competencies;
CREATE POLICY "Learners read own competencies" ON learner_competencies
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::uuid);
-- Direct writes: BLOCKED (Competency levels calculated exclusively by backend scoring engine).

-- Table 8: quizzes
-- Direct reads: Authenticated users can read published quizzes; authors can read their own drafts.
DROP POLICY IF EXISTS "Read published or authored quizzes" ON quizzes;
CREATE POLICY "Read published or authored quizzes" ON quizzes
    FOR SELECT TO authenticated
    USING (is_published = true OR created_by = auth.uid()::uuid);
-- Direct writes: BLOCKED (Authoring, publication, and AI generation route through backend).

-- Table 9: quiz_questions
-- Direct reads: Authenticated users can view questions for accessible quizzes.
DROP POLICY IF EXISTS "Read questions for accessible quizzes" ON quiz_questions;
CREATE POLICY "Read questions for accessible quizzes" ON quiz_questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quizzes q 
            WHERE q.id = quiz_questions.quiz_id 
            AND (q.is_published = true OR q.created_by = auth.uid()::uuid)
        )
    );
-- Direct writes: BLOCKED.

-- Table 10: quiz_attempts
-- Direct reads: Learners can view their own attempts.
DROP POLICY IF EXISTS "Learners read own attempts" ON quiz_attempts;
CREATE POLICY "Learners read own attempts" ON quiz_attempts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::uuid);
-- Direct writes: BLOCKED (Quiz submission grading and timing handled by backend).

-- Table 11: training_documents
-- Direct reads: Learners view published documents; trainers view their uploaded documents.
DROP POLICY IF EXISTS "Read published or owned documents" ON training_documents;
CREATE POLICY "Read published or owned documents" ON training_documents
    FOR SELECT TO authenticated
    USING (status = 'published' OR uploaded_by = auth.uid()::uuid);
-- Direct writes: BLOCKED (Document ingestion & chunking managed by backend).

-- Table 12: document_chunks
-- Direct reads: Available only for published parent documents or owned documents.
DROP POLICY IF EXISTS "Read authorized document chunks" ON document_chunks;
CREATE POLICY "Read authorized document chunks" ON document_chunks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM training_documents d
            WHERE d.id = document_chunks.document_id
            AND (d.status = 'published' OR d.uploaded_by = auth.uid()::uuid)
        )
    );
-- Direct writes: BLOCKED.

-- Table 13: audit_logs
-- Direct reads: BLOCKED (Accessible only by System Administrators via backend).
-- Direct writes: BLOCKED (Backend-only tamper-resistant logging).
DROP POLICY IF EXISTS "No direct client access to audit_logs" ON audit_logs;
CREATE POLICY "No direct client access to audit_logs" ON audit_logs
    FOR ALL TO authenticated, anon
    USING (false);

-- ============================================================================
-- 4. HNSW Vector Indexing for RAG Semantic Retrieval (Production Optimization)
-- ============================================================================
-- Adds Hierarchical Navigable Small World (HNSW) indexing using cosine distance ops.
-- Speeds up similarity search over high-dimensional vector embeddings.
CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
