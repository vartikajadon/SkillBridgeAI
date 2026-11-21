"""
SkillBridge AI FastAPI Main Application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings, validate_rag_providers_for_environment
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)
