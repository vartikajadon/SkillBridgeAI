"""
SkillBridge AI FastAPI Main Application
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings, validate_rag_providers_for_environment
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)


# Rate Limiting Configuration (SlowAPI)
# In production, can use storage_uri=settings.REDIS_URL; defaults to memory in dev/testing
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"]
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware applying OWASP recommended security headers to all responses.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is up-to-date (including custom course_modules)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Database schema auto-creation notice: {e}")

    # Validate provider configuration on startup without exposing secrets
    validate_rag_providers_for_environment(settings)
    logger.info(
        f"SkillBridge AI startup: environment={settings.ENVIRONMENT}, "
        f"embedding_provider={settings.EMBEDDING_PROVIDER}, rag_provider={settings.RAG_LLM_PROVIDER}"
    )
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Attach Limiter state and rate limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware: allow_origin_regex allows any vercel.app frontend preview or production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Storage for uploaded video modules & materials
storage_dir = os.path.join(os.getcwd(), "storage")
os.makedirs(os.path.join(storage_dir, "videos"), exist_ok=True)
os.makedirs(os.path.join(storage_dir, "documents"), exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")

# Include API v1 Router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
@app.get("/api", tags=["Health"])
@app.get("/api/v1", tags=["Health"])
async def root():
    """Root health check and metadata endpoint."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

