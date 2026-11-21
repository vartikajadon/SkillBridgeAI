"""
Sanity tests for health check endpoint: GET /api/v1/health
"""
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION


def test_only_v1_health_endpoint_available():
    # Verify root /health does not exist (enforcing only GET /api/v1/health)
    root_health = client.get("/health")
    assert root_health.status_code == 404
