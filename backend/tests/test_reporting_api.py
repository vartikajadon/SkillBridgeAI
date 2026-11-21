import time
import uuid
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

TEST_DB_FILE = "test_reports_api_temp.db"
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

def test_reports_platform_overview_csv_and_pdf(client: TestClient, admin_token_headers: dict):
    # CSV test
    res_csv = client.get("/api/v1/reports/platform-overview?format=csv", headers=admin_token_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Course Code,Title,Provider" in res_csv.text

    # PDF test
    res_pdf = client.get("/api/v1/reports/platform-overview?format=pdf", headers=admin_token_headers)
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]
    assert res_pdf.content.startswith(b"%PDF-")

def test_reports_department_summary(client: TestClient, admin_token_headers: dict):
    res_csv = client.get("/api/v1/reports/department-summary?format=csv", headers=admin_token_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]

    res_pdf = client.get("/api/v1/reports/department-summary?format=pdf", headers=admin_token_headers)
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF-")

def test_reports_competency_gaps(client: TestClient, admin_token_headers: dict):
    res_pdf = client.get("/api/v1/reports/competency-gaps?format=pdf", headers=admin_token_headers)
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF-")

def test_reports_learner_transcript_self_access(client: TestClient, learner_token_headers: dict):
    # Learner downloading their own transcript
    res_pdf = client.get("/api/v1/reports/learner-transcript?format=pdf", headers=learner_token_headers)
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF-")

def test_reports_learner_transcript_idor_protection(client: TestClient, learner_token_headers: dict, admin_token_headers: dict):
    # Learner cannot specify another user_id without 403 Forbidden
    fake_uuid = "00000000-0000-0000-0000-000000000001"
    res = client.get(f"/api/v1/reports/learner-transcript?user_id={fake_uuid}&format=pdf", headers=learner_token_headers)
    assert res.status_code == 403

def test_reports_assessment_performance_trainer(client: TestClient, trainer_token_headers: dict):
    res_pdf = client.get("/api/v1/reports/assessment-performance?format=pdf", headers=trainer_token_headers)
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF-")

def test_reports_unauthorized_access(client: TestClient):
    res = client.get("/api/v1/reports/platform-overview")
    assert res.status_code == 401
