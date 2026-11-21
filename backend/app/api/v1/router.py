"""
API v1 Router Aggregator
"""
from fastapi import APIRouter
from app.api.v1.endpoints import assessment, auth, dashboard, health, recommendations, trainer

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(assessment.router, prefix="/assessment", tags=["assessment"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(trainer.router, prefix="/trainer", tags=["trainer"])
