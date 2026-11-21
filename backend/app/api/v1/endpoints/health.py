"""
Health Check Endpoint
Exposes GET /api/v1/health as the designated health verification route.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter()


class HealthCheckResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Backend Health Check",
    description="Returns the current operational status of the SkillBridge AI backend service.",
)
async def check_health() -> HealthCheckResponse:
    return HealthCheckResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
    )
