# SkillBridge AI — Database Setup & Architecture Guide

## 1. Relational & Vector Schema

SkillBridge AI operates on a 13-table relational schema with an integrated vector extension:

```
users (id, email, full_name, role, department, designation, employee_id, is_active)
├── job_roles (id, code, name, department, description)
├── competencies (id, code, name, description, category)
├── job_role_competencies (job_role_id, competency_id, target_level, criticality)
├── courses (id, code, title, description, provider, duration_hours, competency_id, status)
├── enrollments (id, user_id, course_id, status, progress_percentage, enrolled_at, completed_at)
├── learner_competencies (id, user_id, competency_id, current_level, target_level, gap_score, last_assessed_at)
├── quizzes (id, title, description, competency_id, total_questions, passing_score, status, is_published, created_by)
├── quiz_questions (id, quiz_id, question_text, options, correct_option_index, explanation, competency_id)
├── quiz_attempts (id, user_id, quiz_id, score, percentage, passed, started_at, completed_at, answers)
├── training_documents (id, title, file_name, file_path, status, is_published, uploaded_by, competency_id)
├── document_chunks (id, document_id, chunk_index, chunk_text, token_count, embedding)
└── audit_logs (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
```

---

## 2. PostgreSQL & pgvector Setup

### Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Vector Column & Indexing
The `document_chunks.embedding` column stores 1536-dimensional vectors for semantic search.

In production PostgreSQL, an HNSW index accelerates cosine-similarity queries:

```sql
CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 3. Row-Level Security (RLS) Policy Architecture

All 13 tables are secured under Row-Level Security (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).

### Direct Client Write Isolation
Direct client writes (via PostgREST or Supabase SDK) are **BLOCKED** on all core business tables:
- `users`: Blocked (managed via auth endpoints).
- `enrollments`: Blocked (enrollment prerequisites checked in backend).
- `learner_competencies`: Blocked (levels computed by assessment engine).
- `quizzes`, `quiz_questions`: Blocked (authoring & AI studio workflows managed in backend).
- `quiz_attempts`: Blocked (grading and timing handled in backend).
- `training_documents`, `document_chunks`: Blocked (document processor & embedding pipeline managed in backend).
- `audit_logs`: Blocked (read & write completely blocked to direct client JWTs).

### Supabase Connection Roles
- The FastAPI backend connects as the database owner (`postgres`), which possesses `BYPASSRLS`.
- The FastAPI application serves as the authoritative security gateway enforcing RBAC, input sanitization, and audit logging.

To apply all RLS policies, execute:
```bash
psql "$DATABASE_URL" -f supabase/init_supabase.sql
```
