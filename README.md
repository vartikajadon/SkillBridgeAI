# SkillBridge AI

SkillBridge AI is an AI-powered skill acceleration platform bridging the gap between learning and industry-ready capabilities through adaptive pathways and skill verification.

---

## Project Structure (Phase 0)

```
skillbridge-ai/
├── .gitignore               # Excludes secrets, .env files, node_modules, Python caches
├── README.md                # Project architecture & setup documentation
├── backend/                 # Modular FastAPI Application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application instantiation & CORS setup
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py    # Environment settings & Phase 0 credential placeholders
│   │   └── api/
│   │       ├── __init__.py
│   │       └── v1/
│   │           ├── __init__.py
│   │           ├── router.py # API v1 router mounting
│   │           └── endpoints/
│   │               ├── __init__.py
│   │               └── health.py # GET /api/v1/health endpoint
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_health.py   # Sanity tests verifying health check behavior
│   ├── .env.example         # Template with Supabase, pgvector & LLM placeholders
│   └── requirements.txt     # Python backend dependencies
└── frontend/                # React + TypeScript + Vite + Tailwind CSS + Recharts
    ├── public/
    ├── src/
    │   ├── App.tsx          # Minimal SkillBridge AI landing page with Recharts preview
    │   ├── main.tsx         # React application entry point
    │   ├── index.css        # Tailwind CSS imports & base styles
    │   └── vite-env.d.ts
    ├── index.html           # HTML template
    ├── package.json         # NPM package definitions
    ├── vite.config.ts       # Vite bundler configuration & API proxy
    ├── tailwind.config.js   # Tailwind design tokens
    ├── postcss.config.js    # PostCSS plugins
    ├── tsconfig.json        # TypeScript configuration root
    ├── tsconfig.app.json    # Application TypeScript configuration
    ├── tsconfig.node.json   # Node / Vite configuration
    └── .env.example         # Frontend environment template
```

---

## Phase 0 Notes & Boundaries

- **Backend Health Check**: Strictly `GET /api/v1/health` (no duplicate root `/health`).
- **Credentials & Services**: Supabase, pgvector, and LLM credentials (OpenAI, Gemini, Anthropic) are retained strictly as placeholders in configuration and `.env.example`. No external services or database migrations are initialized in Phase 0.
- **Frontend Scope**: Minimal landing page introducing SkillBridge AI with a live backend health checker and a Recharts visualization component. Authentication, dashboards, and application modules are deferred to future phases.
