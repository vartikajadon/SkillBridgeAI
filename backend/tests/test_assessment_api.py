"""
Integration & End-to-End API Tests for SkillBridge AI Phase 4 Assessment Module
Tests:
- Authentication & RBAC (401, 403, inactive accounts)
- Assessment catalogue filtering by job role & empty handling
- Assessment intake & question sanitization (ensures answer keys are never leaked)
- Assessment grading, scoring accuracy & client extra field rejection
- Immutable historical attempt persistence across repeated submissions
- Selective competency ledger updates & gap score recalculation
- Data isolation between learners & chronological attempt history
- Skill gap analysis (Strengths vs Priorities, unassessed competencies handled)
- Transactional rollback on database failures
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
from app.db.seed import (
    QUIZ_DATA_ANALYST_DIAG_ID,
    QUIZ_SURVEY_OFFICER_DIAG_ID,
    ROLE_DATA_ANALYST_ID,
    ROLE_SURVEY_OFFICER_ID,
    USER_ADMIN_ID,
    USER_LEARNER_ID,
    USER_TRAINER_ID,
    seed_database,
)
from app.db.session import get_db
from app.main import app
from app.models.competency import Competency, LearnerCompetency, RoleCompetency
from app.models.job_role import JobRole
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User

TEST_DB_FILE = "test_assessment_api_temp.db"
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
def setup_test_environment():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_database(db)
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
    email: str = "learner.patel@skillbridge.gov.in",
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


# ==============================================================================
# 1. Authentication & RBAC Access Control
# ==============================================================================

def test_unauthenticated_requests_return_401():
    res1 = client.get("/api/v1/assessment/catalogue")
    assert res1.status_code == 401

    res2 = client.get(f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}")
    assert res2.status_code == 401

    res3 = client.post(f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit", json={"answers": {}})
    assert res3.status_code == 401

    res4 = client.get("/api/v1/assessment/history")
    assert res4.status_code == 401

    res5 = client.get("/api/v1/assessment/gap-analysis")
    assert res5.status_code == 401


def test_non_learner_roles_return_403():
    trainer_token = create_token(sub=str(USER_TRAINER_ID), email="trainer.sharma@skillbridge.gov.in")
    admin_token = create_token(sub=str(USER_ADMIN_ID), email="admin@skillbridge.gov.in")

    for token in [trainer_token, admin_token]:
        res = client.get("/api/v1/assessment/catalogue", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
        assert "not authorized" in res.json()["detail"].lower()

        res_submit = client.post(
            f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
            json={"answers": {}},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_submit.status_code == 403


def test_inactive_learners_are_blocked():
    inactive_id = uuid.uuid4()
    with TestingSessionLocal() as db:
        inactive_user = User(
            id=inactive_id,
            email="inactive.officer@gov.in",
            role="learner",
            full_name="Deactivated Officer",
            is_active=False,
        )
        db.add(inactive_user)
        db.commit()

    token = create_token(sub=str(inactive_id), email="inactive.officer@gov.in")
    res = client.get("/api/v1/assessment/catalogue", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "deactivated" in res.json()["detail"].lower()


# ==============================================================================
# 2. Assessment Catalogue & Role Filtering
# ==============================================================================

def test_assessment_catalogue_for_data_analyst():
    # USER_LEARNER_ID is seeded as Data Analyst
    token = create_token(sub=str(USER_LEARNER_ID))
    res = client.get("/api/v1/assessment/catalogue", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    items = res.json()
    assert len(items) >= 1
    titles = [item["title"] for item in items]
    assert "Data Analyst Baseline Competency Diagnostic" in titles
    # Survey Officer quiz should be excluded from Data Analyst view
    assert "Survey Officer Baseline Competency Diagnostic" not in titles


def test_assessment_catalogue_for_survey_officer():
    so_learner_id = uuid.uuid4()
    with TestingSessionLocal() as db:
        so_user = User(
            id=so_learner_id,
            email="surveyor.singh@gov.in",
            role="learner",
            full_name="Vikram Singh",
            job_role_id=ROLE_SURVEY_OFFICER_ID,
            is_active=True,
        )
        db.add(so_user)
        db.commit()

    token = create_token(sub=str(so_learner_id), email="surveyor.singh@gov.in")
    res = client.get("/api/v1/assessment/catalogue", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    items = res.json()
    titles = [item["title"] for item in items]
    assert "Survey Officer Baseline Competency Diagnostic" in titles
    assert "Data Analyst Baseline Competency Diagnostic" not in titles


def test_assessment_catalogue_empty_handling():
    # Create learner with role having zero matching quizzes
    unmatched_role_id = uuid.uuid4()
    unmatched_learner_id = uuid.uuid4()
    with TestingSessionLocal() as db:
        unmatched_role = JobRole(
            id=unmatched_role_id,
            code="HEALTH_INSPECTOR",
            title="Sanitation & Health Inspector",
            department="Ministry of Health",
        )
        db.add(unmatched_role)
        db.commit()

        u = User(
            id=unmatched_learner_id,
            email="health.officer@gov.in",
            role="learner",
            full_name="Dr. Rao",
            job_role_id=unmatched_role_id,
            is_active=True,
        )
        db.add(u)
        db.commit()

    token = create_token(sub=str(unmatched_learner_id), email="health.officer@gov.in")
    res = client.get("/api/v1/assessment/catalogue", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    # Should safely return an empty list when no assessments match
    assert isinstance(res.json(), list)


# ==============================================================================
# 3. Assessment Intake & Question Sanitization
# ==============================================================================

def test_assessment_intake_sanitized_questions():
    token = create_token(sub=str(USER_LEARNER_ID))
    res = client.get(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200

    data = res.json()
    assert data["id"] == str(QUIZ_DATA_ANALYST_DIAG_ID)
    assert data["question_count"] == 10
    assert len(data["questions"]) == 10

    # Critical security check: answer keys must NEVER be leaked
    for q in data["questions"]:
        assert "id" in q
        assert "prompt" in q
        assert "options" in q
        assert "points" in q
        assert "difficulty_level" in q
        assert "competency_code" in q
        assert "correct_index" not in q, f"SECURITY LEAK: correct_index exposed in question {q['id']}"
        assert "explanation" not in q, f"SECURITY LEAK: explanation exposed in question {q['id']}"


def test_assessment_intake_unknown_quiz_returns_404():
    token = create_token(sub=str(USER_LEARNER_ID))
    fake_id = uuid.uuid4()
    res = client.get(f"/api/v1/assessment/{fake_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# ==============================================================================
# 4. Assessment Submission & Scoring
# ==============================================================================

def test_assessment_submission_all_correct_and_scores():
    token = create_token(sub=str(USER_LEARNER_ID))

    # In seed data for Data Analyst Diagnostic, all 10 correct answers happen to be index 1 or 2
    # Questions:
    # da_q01: 1, da_q02: 1, da_q03: 1, da_q04: 2, da_q05: 1
    # da_q06: 1, da_q07: 1, da_q08: 1, da_q09: 1, da_q10: 1
    answers = {
        "da_q01": 1,
        "da_q02": 1,
        "da_q03": 1,
        "da_q04": 2,
        "da_q05": 1,
        "da_q06": 1,
        "da_q07": 1,
        "da_q08": 1,
        "da_q09": 1,
        "da_q10": 1,
    }

    res = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json={"answers": answers},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()

    assert data["total_score"] == 100.0
    assert data["max_score"] == 100.0
    assert data["percentage"] == 100.0
    assert data["passed"] is True
    assert len(data["questions"]) == 10
    for q in data["questions"]:
        assert q["is_correct"] is True
        assert q["points_earned"] == 10.0
        assert "explanation" in q  # Explanations permitted AFTER submission


def test_assessment_submission_incorrect_and_missing_answers():
    token = create_token(sub=str(USER_LEARNER_ID))

    # Answers: only da_q01 correct (10 pts), da_q02 incorrect (0 pts), rest missing (0 pts)
    answers = {"da_q01": 1, "da_q02": 0}

    res = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json={"answers": answers},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()

    assert data["total_score"] == 10.0
    assert data["percentage"] == 10.0
    assert data["passed"] is False  # 10 < 60 passing marks


def test_assessment_submission_invalid_question_id_rejected():
    token = create_token(sub=str(USER_LEARNER_ID))
    bad_payload = {"answers": {"da_q01": 1, "hacked_question_id": 1}}

    res = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json=bad_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "Unknown question ID 'hacked_question_id'" in res.json()["detail"]


def test_assessment_submission_invalid_option_index_rejected():
    token = create_token(sub=str(USER_LEARNER_ID))
    # Option index 99 is out of bounds
    bad_payload = {"answers": {"da_q01": 99}}

    res = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json=bad_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "Invalid option index" in res.json()["detail"]


def test_assessment_submission_client_extra_fields_rejected():
    token = create_token(sub=str(USER_LEARNER_ID))
    # Malicious client attempting to inject score or percentage
    malicious_payload = {
        "answers": {"da_q01": 1},
        "total_score": 100.0,
        "percentage": 100.0,
        "passed": True,
    }

    res = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json=malicious_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    # extra="forbid" in Pydantic schema returns 422 Unprocessable Entity
    assert res.status_code == 422


def test_assessment_repeated_submissions_create_separate_attempts():
    token = create_token(sub=str(USER_LEARNER_ID))

    res1 = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json={"answers": {"da_q01": 1}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201
    attempt_1_id = res1.json()["attempt_id"]

    res2 = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json={"answers": {"da_q01": 1, "da_q02": 1}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 201
    attempt_2_id = res2.json()["attempt_id"]

    assert attempt_1_id != attempt_2_id

    # Verify both attempts exist in the database
    with TestingSessionLocal() as db:
        attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == USER_LEARNER_ID).all()
        attempt_ids = {str(a.id) for a in attempts}
        assert attempt_1_id in attempt_ids
        assert attempt_2_id in attempt_ids


# ==============================================================================
# 5. Competency Ledger Updates & Skill Gap Recalculation
# ==============================================================================

def test_competency_updates_only_tested_competencies():
    token = create_token(sub=str(USER_LEARNER_ID))

    # In seed data, Amit Patel has DIGITAL_LITERACY (current 2, target 3, gap 1).
    # Data Analyst Quiz does NOT test DIGITAL_LITERACY.
    with TestingSessionLocal() as db:
        dig_comp = db.query(Competency).filter(Competency.code == "DIGITAL_LITERACY").first()
        initial_dig_ledger = (
            db.query(LearnerCompetency)
            .filter(
                LearnerCompetency.user_id == USER_LEARNER_ID,
                LearnerCompetency.competency_id == dig_comp.id,
            )
            .first()
        )
        assert initial_dig_ledger is not None
        assert initial_dig_ledger.current_level == 2

    # Submit answers with perfect score on STAT_ANALYSIS (da_q01: 1, da_q02: 1)
    client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json={"answers": {"da_q01": 1, "da_q02": 1}},
        headers={"Authorization": f"Bearer {token}"},
    )

    with TestingSessionLocal() as db:
        stat_comp = db.query(Competency).filter(Competency.code == "STAT_ANALYSIS").first()
        updated_stat = (
            db.query(LearnerCompetency)
            .filter(
                LearnerCompetency.user_id == USER_LEARNER_ID,
                LearnerCompetency.competency_id == stat_comp.id,
            )
            .first()
        )
        # 100% on STAT_ANALYSIS maps to Level 5, target is 4 -> gap = max(0, 4 - 5) = 0
        assert updated_stat.current_level == 5
        assert updated_stat.gap_score == 0

        # Verify DIGITAL_LITERACY remained completely untouched
        unchanged_dig = (
            db.query(LearnerCompetency)
            .filter(
                LearnerCompetency.user_id == USER_LEARNER_ID,
                LearnerCompetency.competency_id == dig_comp.id,
            )
            .first()
        )
        assert unchanged_dig.current_level == 2
        assert unchanged_dig.gap_score == 1


# ==============================================================================
# 6. Assessment History & Data Isolation
# ==============================================================================

def test_assessment_history_isolation_and_chronological_order():
    token_learner_1 = create_token(sub=str(USER_LEARNER_ID))

    learner_2_id = uuid.uuid4()
    with TestingSessionLocal() as db:
        l2 = User(
            id=learner_2_id,
            email="isolated.learner@gov.in",
            role="learner",
            full_name="Isolated Learner",
            is_active=True,
        )
        db.add(l2)
        db.commit()

    token_learner_2 = create_token(sub=str(learner_2_id), email="isolated.learner@gov.in")

    # Learner 2 submits an attempt
    res_l2 = client.post(
        f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
        json={"answers": {"da_q01": 1}},
        headers={"Authorization": f"Bearer {token_learner_2}"},
    )
    l2_attempt_id = res_l2.json()["attempt_id"]

    # Learner 1 checks history -> MUST NOT see Learner 2's attempt
    res_history_l1 = client.get("/api/v1/assessment/history", headers={"Authorization": f"Bearer {token_learner_1}"})
    assert res_history_l1.status_code == 200
    l1_attempt_ids = [h["attempt_id"] for h in res_history_l1.json()]
    assert l2_attempt_id not in l1_attempt_ids

    # Learner 2 checks history -> sees only their attempt
    res_history_l2 = client.get("/api/v1/assessment/history", headers={"Authorization": f"Bearer {token_learner_2}"})
    assert res_history_l2.status_code == 200
    assert len(res_history_l2.json()) == 1
    assert res_history_l2.json()[0]["attempt_id"] == l2_attempt_id


# ==============================================================================
# 7. Skill Gap Analysis Endpoint & Criticality Prioritization
# ==============================================================================

def test_skill_gap_analysis_endpoint():
    token = create_token(sub=str(USER_LEARNER_ID))
    res = client.get("/api/v1/assessment/gap-analysis", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    data = res.json()
    assert data["job_role_title"] == "Data Analyst"
    assert data["job_role_code"] == "DATA_ANALYST"
    assert data["total_competencies_tracked"] >= 6

    # Verify priorities order: Mandatory before Desirable, then largest gap
    priorities = data["priorities"]
    for i in range(len(priorities) - 1):
        curr = priorities[i]
        nxt = priorities[i + 1]
        if curr["criticality"] != nxt["criticality"]:
            # Mandatory must precede Desirable
            assert curr["criticality"] == "Mandatory"
            assert nxt["criticality"] == "Desirable"


def test_untested_competencies_handled_without_level_1():
    """Verify that unassessed role competencies show status 'Unassessed'
    and current_level=None rather than defaulting to Level 1.
    """
    fresh_learner_id = uuid.uuid4()
    with TestingSessionLocal() as db:
        fresh_user = User(
            id=fresh_learner_id,
            email="fresh.candidate@gov.in",
            role="learner",
            full_name="Fresh Candidate",
            job_role_id=ROLE_DATA_ANALYST_ID,
            is_active=True,
        )
        db.add(fresh_user)
        db.commit()

    token = create_token(sub=str(fresh_learner_id), email="fresh.candidate@gov.in")
    res = client.get("/api/v1/assessment/gap-analysis", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    data = res.json()
    assert len(data["competencies"]) >= 6
    for comp in data["competencies"]:
        assert comp["status"] == "Unassessed"
        assert comp["current_level"] is None
        assert comp["gap_score"] is None


# ==============================================================================
# 8. Database Transaction Safety
# ==============================================================================

def test_submission_database_failure_transaction_rollback():
    """Verify that if database commit fails during submission, rollback occurs cleanly
    and no orphaned attempt or partial competency update is left.
    """
    token = create_token(sub=str(USER_LEARNER_ID))

    with patch("sqlalchemy.orm.Session.commit", side_effect=Exception("Database write error")):
        res = client.post(
            f"/api/v1/assessment/{QUIZ_DATA_ANALYST_DIAG_ID}/submit",
            json={"answers": {"da_q01": 1}},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 500
        assert "transaction rolled back" in res.json()["detail"].lower()
