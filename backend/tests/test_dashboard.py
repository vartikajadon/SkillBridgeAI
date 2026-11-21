"""
Unit & Integration Tests for SkillBridge AI Phase 3 Role-Based Dashboards
Tests Learner, Trainer, and Admin dashboard endpoints for data accuracy,
strict RBAC, trainer/learner data isolation, dynamic calculations, and empty states.
"""
import os
import time
import uuid
from unittest.mock import patch
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.audit import AuditLog
from app.models.competency import Competency, LearnerCompetency
from app.models.course import Course, Enrollment
from app.models.document import TrainingDocument
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User

# Test Database Engine (file-based SQLite for reliable cross-thread isolation)
TEST_DB_FILE = "test_dashboard_temp.db"
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


@pytest.fixture(scope="module", autouse=True)
def setup_dashboard_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    app.dependency_overrides.pop(get_db, None)
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
    """Generates a valid signed JWT recognized by jwt_verifier."""
    payload = {
        "sub": sub,
        "email": email,
        "aud": aud,
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def create_test_user(
    db,
    email: str,
    role: str,
    full_name: str,
    department: str = "Ministry of Personnel",
    is_active: bool = True,
) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        role=role,
        full_name=full_name,
        department=department,
        designation="Officer",
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    return user


# ==============================================================================
# 1. Learner Dashboard Tests
# ==============================================================================

def test_unauthenticated_learner_dashboard_returns_401():
    response = client.get("/api/v1/dashboard/learner")
    assert response.status_code == 401


def test_non_learner_cannot_access_learner_dashboard():
    with TestingSessionLocal() as db:
        trainer = create_test_user(db, "trainer1@gov.in", "trainer", "Trainer User")
        admin = create_test_user(db, "admin1@gov.in", "admin", "Admin User")

    trainer_token = create_token(sub=str(trainer.id), email=trainer.email)
    res_trainer = client.get("/api/v1/dashboard/learner", headers={"Authorization": f"Bearer {trainer_token}"})
    assert res_trainer.status_code == 403
    assert "not authorized" in res_trainer.json()["detail"].lower()

    admin_token = create_token(sub=str(admin.id), email=admin.email)
    res_admin = client.get("/api/v1/dashboard/learner", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 403
    assert "not authorized" in res_admin.json()["detail"].lower()


def test_learner_empty_dashboard_returns_valid_structure():
    with TestingSessionLocal() as db:
        learner = create_test_user(db, "learner.empty@gov.in", "learner", "New Learner")

    token = create_token(sub=str(learner.id), email=learner.email)
    response = client.get("/api/v1/dashboard/learner", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    data = response.json()
    assert data["enrolled_courses"] == []
    assert data["competencies"] == []
    assert data["recent_quiz_attempts"] == []

    summary = data["summary"]
    assert summary["enrolled_courses_count"] == 0
    assert summary["completed_courses_count"] == 0
    assert summary["in_progress_courses_count"] == 0
    assert summary["average_progress"] == 0.0
    assert summary["total_quizzes_taken"] == 0
    assert summary["average_quiz_score"] == 0.0
    assert summary["competencies_assessed_count"] == 0
    assert summary["average_gap_score"] == 0.0


def test_learner_dashboard_data_and_gap_calculation():
    with TestingSessionLocal() as db:
        learner = create_test_user(db, "learner.active@gov.in", "learner", "Active Learner")

        # 1. Courses & Enrollments
        c1 = Course(
            id=uuid.uuid4(),
            code="CRS-DATA-101",
            title="Data Governance in Public Administration",
            provider="iGOT Karmayogi",
            duration_hours=10,
            status="published",
        )
        c2 = Course(
            id=uuid.uuid4(),
            code="CRS-CYBER-201",
            title="Cybersecurity for Civil Servants",
            provider="NIC",
            duration_hours=6,
            status="published",
        )
        db.add_all([c1, c2])
        db.commit()

        e1 = Enrollment(
            id=uuid.uuid4(),
            user_id=learner.id,
            course_id=c1.id,
            status="in_progress",
            progress_percentage=40,
        )
        e2 = Enrollment(
            id=uuid.uuid4(),
            user_id=learner.id,
            course_id=c2.id,
            status="completed",
            progress_percentage=100,
        )
        db.add_all([e1, e2])

        # 2. Competencies (Test dynamic gap calculation: max(0, target - current))
        comp1 = Competency(
            id=uuid.uuid4(),
            code="COMP-PUB-POLICY",
            name="Public Policy Analysis",
            category="Domain",
        )
        comp2 = Competency(
            id=uuid.uuid4(),
            code="COMP-BUDGET-MGMT",
            name="Budgetary Management",
            category="Technical",
        )
        db.add_all([comp1, comp2])
        db.commit()

        # Case A: target 4, current 2 -> gap = 2
        lc1 = LearnerCompetency(
            id=uuid.uuid4(),
            user_id=learner.id,
            competency_id=comp1.id,
            current_level=2,
            target_level=4,
            gap_score=0,  # Dynamically computed by endpoint
        )
        # Case B: current exceeds target (current 4, target 3) -> gap = max(0, 3 - 4) = 0
        lc2 = LearnerCompetency(
            id=uuid.uuid4(),
            user_id=learner.id,
            competency_id=comp2.id,
            current_level=4,
            target_level=3,
            gap_score=0,
        )
        db.add_all([lc1, lc2])

        # 3. Quizzes & Attempts
        quiz = Quiz(
            id=uuid.uuid4(),
            title="Public Finance Diagnostic",
            course_id=c1.id,
            total_marks=100,
            passing_marks=60,
            questions=[{"q": 1}, {"q": 2}],
        )
        db.add(quiz)
        db.commit()

        att1 = QuizAttempt(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            user_id=learner.id,
            score=85,
            percentage=85.0,
            passed=True,
            answers={"q1": "a"},
        )
        att2 = QuizAttempt(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            user_id=learner.id,
            score=55,
            percentage=55.0,
            passed=False,
            answers={"q1": "b"},
        )
        db.add_all([att1, att2])
        db.commit()

    token = create_token(sub=str(learner.id), email=learner.email)
    response = client.get("/api/v1/dashboard/learner", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    # Summary checks
    summary = data["summary"]
    assert summary["enrolled_courses_count"] == 2
    assert summary["completed_courses_count"] == 1
    assert summary["in_progress_courses_count"] == 1
    assert summary["average_progress"] == 70.0  # (40 + 100) / 2
    assert summary["total_quizzes_taken"] == 2
    assert summary["average_quiz_score"] == 70.0  # (85.0 + 55.0) / 2
    assert summary["competencies_assessed_count"] == 2
    assert summary["average_gap_score"] == 1.0  # (2 + 0) / 2

    # Verify dynamic gap score per competency
    comp_map = {c["code"]: c for c in data["competencies"]}
    assert comp_map["COMP-PUB-POLICY"]["gap_score"] == 2
    assert comp_map["COMP-PUB-POLICY"]["current_level"] == 2
    assert comp_map["COMP-PUB-POLICY"]["target_level"] == 4
    assert comp_map["COMP-BUDGET-MGMT"]["gap_score"] == 0  # clamped to 0


def test_learner_data_isolation():
    with TestingSessionLocal() as db:
        learner_a = create_test_user(db, "learner.a@gov.in", "learner", "Learner Alpha")
        learner_b = create_test_user(db, "learner.b@gov.in", "learner", "Learner Beta")

        c = Course(id=uuid.uuid4(), code="CRS-ISO-1", title="Secret Course A", provider="ISTM", duration_hours=5, status="published")
        db.add(c)
        db.commit()

        # Learner B is enrolled in course C
        e_b = Enrollment(id=uuid.uuid4(), user_id=learner_b.id, course_id=c.id, status="in_progress", progress_percentage=50)
        db.add(e_b)
        db.commit()

    # Learner A fetches dashboard -> must NOT see Learner B's enrollment
    token_a = create_token(sub=str(learner_a.id), email=learner_a.email)
    res_a = client.get("/api/v1/dashboard/learner", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    assert len(res_a.json()["enrolled_courses"]) == 0
    assert res_a.json()["summary"]["enrolled_courses_count"] == 0


# ==============================================================================
# 2. Trainer Dashboard Tests
# ==============================================================================

def test_unauthenticated_trainer_dashboard_returns_401():
    response = client.get("/api/v1/dashboard/trainer")
    assert response.status_code == 401


def test_non_trainer_cannot_access_trainer_dashboard():
    with TestingSessionLocal() as db:
        learner = create_test_user(db, "learner.blocked@gov.in", "learner", "Blocked Learner")
        admin = create_test_user(db, "admin.blocked@gov.in", "admin", "Blocked Admin")

    token_learner = create_token(sub=str(learner.id), email=learner.email)
    res_l = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token_learner}"})
    assert res_l.status_code == 403

    token_admin = create_token(sub=str(admin.id), email=admin.email)
    res_a = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token_admin}"})
    assert res_a.status_code == 403


def test_trainer_empty_dashboard_returns_zero_metrics():
    with TestingSessionLocal() as db:
        trainer = create_test_user(db, "trainer.empty@gov.in", "trainer", "Empty Trainer")

    token = create_token(sub=str(trainer.id), email=trainer.email)
    response = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    assert data["documents"] == []
    assert data["quizzes"] == []
    assert data["recent_attempts"] == []

    summary = data["summary"]
    assert summary["total_documents_uploaded"] == 0
    assert summary["processed_documents_count"] == 0
    assert summary["total_quizzes_created"] == 0
    assert summary["total_attempts_received"] == 0
    assert summary["average_pass_rate"] == 0.0


def test_trainer_dashboard_data_and_metrics_calculation():
    with TestingSessionLocal() as db:
        trainer = create_test_user(db, "trainer.active@gov.in", "trainer", "Active Trainer")
        learner1 = create_test_user(db, "student1@gov.in", "learner", "Student One")
        learner2 = create_test_user(db, "student2@gov.in", "learner", "Student Two")

        # 1. Documents
        doc1 = TrainingDocument(
            id=uuid.uuid4(),
            title="Procurement Guidelines 2026",
            file_name="procurement_manual.pdf",
            file_path="/docs/procurement.pdf",
            file_size_bytes=1048576,
            mime_type="application/pdf",
            status="processed",
            uploaded_by=trainer.id,
        )
        doc2 = TrainingDocument(
            id=uuid.uuid4(),
            title="Draft E-Governance SOP",
            file_name="draft_sop.pdf",
            file_path="/docs/draft.pdf",
            file_size_bytes=524288,
            mime_type="application/pdf",
            status="pending",
            uploaded_by=trainer.id,
        )
        db.add_all([doc1, doc2])

        # 2. Quiz authored by trainer
        quiz = Quiz(
            id=uuid.uuid4(),
            title="General Financial Rules Mastery",
            created_by=trainer.id,
            total_marks=100,
            passing_marks=60,
            questions=[{"q": 1}, {"q": 2}, {"q": 3}],
        )
        db.add(quiz)
        db.commit()

        # 3. Two attempts on this quiz: 1 passed (80%), 1 failed (40%)
        att1 = QuizAttempt(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            user_id=learner1.id,
            score=80,
            percentage=80.0,
            passed=True,
            answers={},
        )
        att2 = QuizAttempt(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            user_id=learner2.id,
            score=40,
            percentage=40.0,
            passed=False,
            answers={},
        )
        db.add_all([att1, att2])
        db.commit()

    token = create_token(sub=str(trainer.id), email=trainer.email)
    response = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    summary = data["summary"]
    assert summary["total_documents_uploaded"] == 2
    assert summary["processed_documents_count"] == 1
    assert summary["total_quizzes_created"] == 1
    assert summary["total_attempts_received"] == 2
    assert summary["average_pass_rate"] == 50.0  # 1 passed out of 2 = 50.0%

    assert len(data["documents"]) == 2
    assert len(data["quizzes"]) == 1
    quiz_item = data["quizzes"][0]
    assert quiz_item["question_count"] == 3
    assert quiz_item["attempts_count"] == 2
    assert quiz_item["pass_rate"] == 50.0
    assert quiz_item["average_score"] == 60.0  # (80 + 40) / 2

    assert len(data["recent_attempts"]) == 2
    learner_names = {a["learner_name"] for a in data["recent_attempts"]}
    assert "Student One" in learner_names
    assert "Student Two" in learner_names


def test_trainer_data_isolation():
    with TestingSessionLocal() as db:
        trainer_a = create_test_user(db, "trainer.a@gov.in", "trainer", "Trainer Alpha")
        trainer_b = create_test_user(db, "trainer.b@gov.in", "trainer", "Trainer Beta")
        student = create_test_user(db, "student.isolated@gov.in", "learner", "Isolation Student")

        # Trainer B's document and quiz
        doc_b = TrainingDocument(
            id=uuid.uuid4(),
            title="Trainer B Confidential Manual",
            file_name="confidential_b.pdf",
            file_path="/docs/b.pdf",
            file_size_bytes=2048,
            mime_type="application/pdf",
            status="processed",
            uploaded_by=trainer_b.id,
        )
        quiz_b = Quiz(
            id=uuid.uuid4(),
            title="Trainer B Quiz",
            created_by=trainer_b.id,
            total_marks=50,
            passing_marks=25,
            questions=[],
        )
        db.add_all([doc_b, quiz_b])
        db.commit()

        attempt_b = QuizAttempt(
            id=uuid.uuid4(),
            quiz_id=quiz_b.id,
            user_id=student.id,
            score=50,
            percentage=100.0,
            passed=True,
            answers={},
        )
        db.add(attempt_b)
        db.commit()

    # Trainer A fetches dashboard -> must NOT see Trainer B's document, quiz, or attempts
    token_a = create_token(sub=str(trainer_a.id), email=trainer_a.email)
    response_a = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token_a}"})
    assert response_a.status_code == 200
    data_a = response_a.json()

    assert data_a["documents"] == []
    assert data_a["quizzes"] == []
    assert data_a["recent_attempts"] == []
    assert data_a["summary"]["total_documents_uploaded"] == 0
    assert data_a["summary"]["total_quizzes_created"] == 0
    assert data_a["summary"]["total_attempts_received"] == 0


# ==============================================================================
# 3. Admin Dashboard Tests
# ==============================================================================

def test_unauthenticated_admin_dashboard_returns_401():
    response = client.get("/api/v1/dashboard/admin")
    assert response.status_code == 401


def test_non_admin_cannot_access_admin_dashboard():
    with TestingSessionLocal() as db:
        learner = create_test_user(db, "learner.noadmin@gov.in", "learner", "Learner NoAdmin")
        trainer = create_test_user(db, "trainer.noadmin@gov.in", "trainer", "Trainer NoAdmin")

    token_l = create_token(sub=str(learner.id), email=learner.email)
    res_l = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token_l}"})
    assert res_l.status_code == 403

    token_t = create_token(sub=str(trainer.id), email=trainer.email)
    res_t = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token_t}"})
    assert res_t.status_code == 403


def test_admin_dashboard_metrics_and_department_breakdown():
    with TestingSessionLocal() as db:
        admin = create_test_user(db, "admin.lead@gov.in", "admin", "Lead Administrator", department="Cabinet Secretariat")
        create_test_user(db, "finance.user1@gov.in", "learner", "Fin User 1", department="Ministry of Finance")
        create_test_user(db, "finance.user2@gov.in", "learner", "Fin User 2", department="Ministry of Finance")

    token = create_token(sub=str(admin.id), email=admin.email)
    response = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()

    summary = data["summary"]
    assert summary["total_users"] >= 3
    assert summary["admins_count"] >= 1
    assert summary["learners_count"] >= 2
    assert summary["active_users_count"] >= 3

    # Department breakdown
    dept_map = {d["department"]: d["user_count"] for d in data["departments"]}
    assert "Ministry of Finance" in dept_map
    assert dept_map["Ministry of Finance"] >= 2


def test_admin_dashboard_recent_audit_logs():
    with TestingSessionLocal() as db:
        admin = create_test_user(db, "admin.auditor@gov.in", "admin", "Auditor Admin")

        log1 = AuditLog(
            id=uuid.uuid4(),
            actor_id=admin.id,
            action="ROLE_ELEVATION",
            entity_type="user",
            entity_id=str(uuid.uuid4()),
            ip_address="10.0.0.1",
        )
        log2 = AuditLog(
            id=uuid.uuid4(),
            actor_id=None,  # System event
            action="SYSTEM_INITIALIZATION",
            entity_type="system",
            entity_id=None,
            ip_address="127.0.0.1",
        )
        db.add_all([log1, log2])
        db.commit()

    token = create_token(sub=str(admin.id), email=admin.email)
    response = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    logs = response.json()["recent_audit_logs"]

    assert len(logs) >= 2
    actions = {l["action"] for l in logs}
    assert "ROLE_ELEVATION" in actions
    assert "SYSTEM_INITIALIZATION" in actions

    # Verify actor resolution
    for l in logs:
        if l["action"] == "ROLE_ELEVATION":
            assert l["actor_name"] == "Auditor Admin"
        elif l["action"] == "SYSTEM_INITIALIZATION":
            assert l["actor_name"] == "System"


def test_admin_dashboard_db_health_connected():
    with TestingSessionLocal() as db:
        admin = create_test_user(db, "admin.health@gov.in", "admin", "Health Admin")

    token = create_token(sub=str(admin.id), email=admin.email)
    response = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["health"]["database_status"] == "connected"


def test_admin_dashboard_db_health_disconnected():
    with TestingSessionLocal() as db:
        admin = create_test_user(db, "admin.dbdown@gov.in", "admin", "DB Down Admin")

    token = create_token(sub=str(admin.id), email=admin.email)

    # Selective execute patch: only raise on SELECT 1 ping, let other queries succeed
    from sqlalchemy.orm import Session
    real_exec = Session.execute

    def mock_exec(self, stmt, *args, **kwargs):
        if "SELECT 1" in str(stmt):
            raise Exception("DB connection timeout")
        return real_exec(self, stmt, *args, **kwargs)

    with patch.object(Session, "execute", mock_exec):
        response = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["health"]["database_status"] == "disconnected"


# ==============================================================================
# 4. Security & Edge-Case Integrity Tests
# ==============================================================================

def test_dashboard_null_optional_fields_no_500():
    """Verify that records with NULL optional relationships or metadata don't crash serialization."""
    with TestingSessionLocal() as db:
        trainer = create_test_user(db, "trainer.nulls@gov.in", "trainer", "Null Safe Trainer")

        # Quiz without course_id or competency_id, empty questions
        quiz = Quiz(
            id=uuid.uuid4(),
            title="Orphan Quiz",
            course_id=None,
            competency_id=None,
            created_by=trainer.id,
            total_marks=50,
            passing_marks=25,
            questions=[],
        )
        db.add(quiz)
        db.commit()

    token = create_token(sub=str(trainer.id), email=trainer.email)
    response = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    quiz_item = response.json()["quizzes"][0]
    assert quiz_item["course_title"] is None
    assert quiz_item["competency_name"] is None
    assert quiz_item["question_count"] == 0


def test_dashboard_inactive_user_access_blocked():
    """Verify that deactivated users cannot access any dashboard endpoint."""
    with TestingSessionLocal() as db:
        inactive_learner = create_test_user(db, "inactive.l@gov.in", "learner", "Inactive Learner", is_active=False)
        inactive_trainer = create_test_user(db, "inactive.t@gov.in", "trainer", "Inactive Trainer", is_active=False)
        inactive_admin = create_test_user(db, "inactive.a@gov.in", "admin", "Inactive Admin", is_active=False)

    token_l = create_token(sub=str(inactive_learner.id), email=inactive_learner.email)
    res_l = client.get("/api/v1/dashboard/learner", headers={"Authorization": f"Bearer {token_l}"})
    assert res_l.status_code == 403
    assert "deactivated" in res_l.json()["detail"].lower()

    token_t = create_token(sub=str(inactive_trainer.id), email=inactive_trainer.email)
    res_t = client.get("/api/v1/dashboard/trainer", headers={"Authorization": f"Bearer {token_t}"})
    assert res_t.status_code == 403
    assert "deactivated" in res_t.json()["detail"].lower()

    token_a = create_token(sub=str(inactive_admin.id), email=inactive_admin.email)
    res_a = client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 403
    assert "deactivated" in res_a.json()["detail"].lower()
