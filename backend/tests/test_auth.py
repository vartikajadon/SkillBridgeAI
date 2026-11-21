"""
Unit & Integration Tests for SkillBridge AI Phase 2 Auth & RBAC
Verifies JWT verification, profile provisioning, allowlist security, and role boundaries.
"""
import os
import time
import uuid
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User

# Test Database Engine (file-based SQLite for reliable cross-thread test isolation)
TEST_DB_FILE = "test_auth_temp.db"
test_engine = create_engine(
    f"sqlite:///{TEST_DB_FILE}",
    echo=False,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass


client = TestClient(app)


def create_token(
    sub: str,
    email: str = "user@skillbridge.gov.in",
    aud: str = "authenticated",
    exp_offset: int = 3600,
    secret: str = settings.SUPABASE_JWT_SECRET,
    algorithm: str = "HS256",
) -> str:
    payload = {
        "sub": sub,
        "email": email,
        "aud": aud,
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


# ------------------------------------------------------------------------------
# 1. JWT Signature & Token Verification Tests
# ------------------------------------------------------------------------------
def test_missing_authorization_header():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.text or "detail" in response.json()


def test_invalid_jwt_signature():
    token = create_token(sub=str(uuid.uuid4()), secret="wrong-secret-key-that-does-not-match")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "signature" in response.json()["detail"].lower()


def test_expired_jwt():
    token = create_token(sub=str(uuid.uuid4()), exp_offset=-3600)
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_invalid_audience_jwt():
    token = create_token(sub=str(uuid.uuid4()), aud="wrong_audience")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "audience" in response.json()["detail"].lower()


# ------------------------------------------------------------------------------
# 2. Profile Creation & Idempotency Tests (POST /api/v1/auth/profile)
# ------------------------------------------------------------------------------
def test_profile_creation_success():
    auth_sub = str(uuid.uuid4())
    token = create_token(sub=auth_sub, email="learner.test@gov.in")

    payload = {
        "full_name": "Pooja Verma",
        "department": "Ministry of Rural Development",
        "designation": "Assistant Section Officer",
        "employee_id": "MRD-ASO-101",
    }
    response = client.post(
        "/api/v1/auth/profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == auth_sub
    assert data["email"] == "learner.test@gov.in"
    assert data["role"] == "learner"  # Strictly learner
    assert data["full_name"] == "Pooja Verma"


def test_profile_creation_is_idempotent():
    auth_sub = str(uuid.uuid4())
    token = create_token(sub=auth_sub, email="learner.retry@gov.in")

    payload = {
        "full_name": "Rohan Das",
        "department": "Ministry of Finance",
    }
    # First call
    res1 = client.post("/api/v1/auth/profile", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 201

    # Second call with same token
    res2 = client.post("/api/v1/auth/profile", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code in [200, 201]
    assert res2.json()["id"] == auth_sub


def test_duplicate_employee_id_conflict():
    token1 = create_token(sub=str(uuid.uuid4()), email="emp1@gov.in")
    token2 = create_token(sub=str(uuid.uuid4()), email="emp2@gov.in")

    client.post(
        "/api/v1/auth/profile",
        json={"full_name": "Officer A", "employee_id": "SAME-EMP-001"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    # Attempting to reuse same employee_id
    res = client.post(
        "/api/v1/auth/profile",
        json={"full_name": "Officer B", "employee_id": "SAME-EMP-001"},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# 3. Profile Whitelist Update Tests (PATCH /api/v1/auth/me)
# ------------------------------------------------------------------------------
def test_profile_update_allowlist():
    auth_sub = str(uuid.uuid4())
    token = create_token(sub=auth_sub, email="allowlist@gov.in")

    client.post(
        "/api/v1/auth/profile",
        json={"full_name": "Original Name", "department": "Dept A"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Valid update
    update_res = client.patch(
        "/api/v1/auth/me",
        json={"full_name": "Updated Name", "department": "Dept B"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Updated Name"
    assert update_res.json()["department"] == "Dept B"

    # Attempting to modify forbidden fields (role, is_active, id) -> 422 Unprocessable Entity
    forbidden_res = client.patch(
        "/api/v1/auth/me",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert forbidden_res.status_code == 422


# ------------------------------------------------------------------------------
# 4. Role-Based Access Control (RBAC) Tests
# ------------------------------------------------------------------------------
def test_rbac_learner_cannot_access_admin_endpoints():
    auth_sub = str(uuid.uuid4())
    token = create_token(sub=auth_sub, email="learner.rbac@gov.in")

    client.post(
        "/api/v1/auth/profile",
        json={"full_name": "Standard Learner"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Learner accessing admin user list
    res = client.get("/api/v1/auth/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"].lower()


def test_rbac_admin_can_access_and_elevate_user():
    # Create an admin directly in the database
    admin_id = uuid.uuid4()
    admin_token = create_token(sub=str(admin_id), email="admin.super@gov.in")

    with TestingSessionLocal() as db:
        admin_user = User(
            id=admin_id,
            email="admin.super@gov.in",
            full_name="Super Admin",
            role="admin",
            is_active=True,
        )
        db.add(admin_user)

        # Create a target learner to promote
        learner_id = uuid.uuid4()
        learner_user = User(
            id=learner_id,
            email="promoteme@gov.in",
            full_name="Candidate Trainer",
            role="learner",
            is_active=True,
        )
        db.add(learner_user)
        db.commit()

    # Admin lists users -> 200 OK
    list_res = client.get("/api/v1/auth/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 2

    # Admin promotes learner to trainer -> 200 OK
    promote_res = client.patch(
        f"/api/v1/auth/admin/users/{learner_id}",
        json={"role": "trainer"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert promote_res.status_code == 200
    assert promote_res.json()["role"] == "trainer"


def test_cannot_deactivate_or_demote_last_active_admin():
    sole_admin_id = uuid.uuid4()
    sole_admin_token = create_token(sub=str(sole_admin_id), email="sole.admin@gov.in")

    with TestingSessionLocal() as db:
        # Clear any previously created test admins to ensure sole_admin is genuinely the last active admin
        db.query(User).filter(User.role == "admin").delete()
        sole_admin = User(
            id=sole_admin_id,
            email="sole.admin@gov.in",
            full_name="Sole Active Admin",
            role="admin",
            is_active=True,
        )
        db.add(sole_admin)
        db.commit()

    # Attempt to deactivate the only active admin -> 400 Bad Request
    deact_res = client.patch(
        f"/api/v1/auth/admin/users/{sole_admin_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {sole_admin_token}"},
    )
    assert deact_res.status_code == 400
    assert "last remaining active administrator" in deact_res.json()["detail"].lower()

    # Attempt to demote the only active admin -> 400 Bad Request
    demote_res = client.patch(
        f"/api/v1/auth/admin/users/{sole_admin_id}",
        json={"role": "learner"},
        headers={"Authorization": f"Bearer {sole_admin_token}"},
    )
    assert demote_res.status_code == 400
    assert "last remaining active administrator" in demote_res.json()["detail"].lower()

    # Create a second active admin -> now updating one admin succeeds
    second_admin_id = uuid.uuid4()
    with TestingSessionLocal() as db:
        second_admin = User(
            id=second_admin_id,
            email="second.admin@gov.in",
            full_name="Second Active Admin",
            role="admin",
            is_active=True,
        )
        db.add(second_admin)
        db.commit()

    # Now deactivating sole_admin succeeds because second_admin remains active
    allowed_res = client.patch(
        f"/api/v1/auth/admin/users/{sole_admin_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {sole_admin_token}"},
    )
    assert allowed_res.status_code == 200
    assert allowed_res.json()["is_active"] is False

