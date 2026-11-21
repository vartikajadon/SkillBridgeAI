import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import jwt

from app.core.config import settings
from app.db.base import Base
from app.db.seed import (
    USER_ADMIN_ID,
    seed_database,
)
from app.db.session import get_db
from app.main import app

TEST_DB_FILE = "test_security_audit_temp.db"
test_engine = create_engine(
    f"sqlite:///{TEST_DB_FILE}",
    echo=False,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=test_engine,
)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_token(sub: str, email: str = "user@skillbridge.gov.in") -> str:
    payload = {
        "sub": sub,
        "email": email,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_token_headers():
    token = create_token(str(USER_ADMIN_ID), email="admin@skillbridge.gov.in")
    return {"Authorization": f"Bearer {token}"}

def test_security_headers_present(client: TestClient):
    resp = client.get("/api/v1/openapi.json")
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in resp.headers.get("permissions-policy", "")

def test_audit_log_created_on_report_export(client: TestClient, admin_token_headers: dict):
    # Fetch report which logs an audit entry
    res = client.get("/api/v1/reports/platform-overview?format=csv", headers=admin_token_headers)
    assert res.status_code == 200

    # Fetch admin dashboard which returns recent_audit_logs
    dash_res = client.get("/api/v1/dashboard/admin", headers=admin_token_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "recent_audit_logs" in dash_data
    logs = dash_data["recent_audit_logs"]
    assert any("REPORT_EXPORT_GENERATED" in log.get("action", "") for log in logs)
