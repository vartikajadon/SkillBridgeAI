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
    USER_LEARNER_ID,
    USER_TRAINER_ID,
    seed_database,
)
from app.db.session import get_db
from app.main import app

TEST_DB_FILE = "test_admin_analytics_temp.db"
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

@pytest.fixture
def trainer_token_headers():
    token = create_token(str(USER_TRAINER_ID), email="trainer@skillbridge.gov.in")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def learner_token_headers():
    token = create_token(str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    return {"Authorization": f"Bearer {token}"}

def test_admin_analytics_endpoints(client: TestClient, admin_token_headers: dict):
    # 1. Executive Analytics
    resp = client.get("/api/v1/dashboard/admin/analytics", headers=admin_token_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "total_learners" in data
    assert "active_learner_accounts" in data
    assert "total_courses" in data
    assert "published_courses" in data
    assert "average_assessment_score" in data
    assert "quiz_pass_rate" in data
    assert "course_completion_rate" in data
    assert "document_publication_ratio" in data

    # 2. Time-series Trends
    resp = client.get("/api/v1/dashboard/admin/trends/time-series?months=6", headers=admin_token_headers)
    assert resp.status_code == 200, resp.text
    trends = resp.json()
    assert isinstance(trends, list)
    assert len(trends) == 6
    assert "month" in trends[0]
    assert "monthly_active_learners" in trends[0]
    assert "course_completions" in trends[0]
    assert "quiz_attempts" in trends[0]

    # 3. Department Competency Trends
    resp = client.get("/api/v1/dashboard/admin/trends/departments", headers=admin_token_headers)
    assert resp.status_code == 200, resp.text
    depts = resp.json()
    assert isinstance(depts, list)
    if len(depts) > 0:
        assert "department" in depts[0]
        assert "total_learners" in depts[0]
        assert "average_gap_score" in depts[0]

def test_admin_analytics_forbidden_for_learner(client: TestClient, learner_token_headers: dict):
    resp = client.get("/api/v1/dashboard/admin/analytics", headers=learner_token_headers)
    assert resp.status_code == 403

def test_admin_analytics_forbidden_for_trainer(client: TestClient, trainer_token_headers: dict):
    resp = client.get("/api/v1/dashboard/admin/analytics", headers=trainer_token_headers)
    assert resp.status_code == 403
