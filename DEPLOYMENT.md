# SkillBridge AI — Production Deployment Guide

## 1. System Architecture Overview

SkillBridge AI is a specialized AI-powered personalized learning and competency development platform designed for Indian government departments and civil servants.

### Platform Components
1. **Frontend**: React 18, TypeScript, Tailwind CSS, Vite (Port 5173).
2. **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic v2, SlowAPI, ReportLab (Port 8000).
3. **Database**: PostgreSQL 15+ with the `pgvector` extension (Supabase-compatible).
4. **AI Services**:
   - OpenAI `text-embedding-3-small` (1538-dim embeddings).
   - OpenAI `gpt-4o-mini` (RAG synthesis & MCQs generation).
   - Local fallback/mock modes for testing and development.

---

## 2. Environment Configuration

Copy the template from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

### Mandatory Production Variables

| Variable | Description | Example / Notes |
|---|---|---|
| `ENVIRONMENT` | Deployment stage | `production` (Enforces real AI providers and strict HSTS) |
| `DATABASE_URL` | PostgreSQL with pgvector | `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres` |
| `SUPABASE_JWT_SECRET` | Secret key for Supabase JWT verification | Minimum 32-character secret |
| `EMBEDDING_PROVIDER` | Embedding model provider | `openai` (Mock prohibited in production) |
| `RAG_LLM_PROVIDER` | LLM text synthesis provider | `openai` (Mock prohibited in production) |
| `OPENAI_API_KEY` | OpenAI API access key | `sk-proj-...` |
| `BACKEND_CORS_ORIGINS` | Allowed client origins | `["https://skillbridge.gov.in"]` |
| `RATELIMIT_STORAGE_URL` | Redis storage for SlowAPI rate limiting | `redis://localhost:6379/0` |

---

## 3. Database Setup & Migrations

SkillBridge AI uses Alembic to manage relational schema changes and PostgreSQL `pgvector` for similarity search.

1. Ensure the PostgreSQL instance has `pgvector` enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```
2. Execute Alembic migrations:
   ```bash
   cd backend
   python -m alembic upgrade head
   ```
3. Initialize Supabase Row Level Security (RLS) policies:
   ```bash
   psql -d "$DATABASE_URL" -f supabase/init_supabase.sql
   ```
4. Seed the deterministic 12-competency catalogue, job roles, and baseline assessments:
   ```bash
   python -m app.db.seed
   ```

---

## 4. Production Service Deployment

### FastAPI Backend via Gunicorn / Uvicorn

Run the FastAPI application behind Gunicorn workers:

```bash
cd backend
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  --timeout 120
```

### Frontend Production Build

Compile the React frontend:

```bash
cd frontend
npm install
npm run build
```

Serve the resulting static assets in `dist/` using Nginx or Caddy.

### Example Nginx Reverse Proxy Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name skillbridge.gov.in;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/skillbridge.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skillbridge.gov.in/privkey.pem;

    # Static Frontend
    location / {
        root /var/www/skillbridge-ai/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
