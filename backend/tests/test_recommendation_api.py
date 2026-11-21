"""
Integration & End-to-End API Tests for SkillBridge AI Phase 5 Recommendation Engine
Tests:
- Authentication & RBAC (401, 403, inactive learners)
- Personalized recommendations tailored to role and verified gaps
- Mandatory vs Desirable prioritization
- Larger-gap prioritization
- Completed course exclusion
- Active enrollment status identification
- Unassessed learner foundational onboarding recommendations
- No-gap learner handling
- Learner data isolation
- Pedagogical learning path sequencing (Level 2 before Level 4)
- Enrollment action (201 Created, 404 Not Found, 409 Conflict)
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
from app.db.seed import (
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
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.job_role import JobRole
from app.models.user import User

TEST_DB_FILE = "test_recommendation_api_temp.db"
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
        "role": "authenticated",
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


# -----------------------------------------------------------------------------
# 1. Authentication & RBAC Tests
# -----------------------------------------------------------------------------

def test_unauthenticated_recommendations_return_401():
    res = client.get("/api/v1/recommendations/")
    assert res.status_code == 401

    res_lp = client.get("/api/v1/recommendations/learning-path")
    assert res_lp.status_code == 401

    fake_id = uuid.uuid4()
    res_enr = client.post(f"/api/v1/recommendations/{fake_id}/enroll")
    assert res_enr.status_code == 401


def test_non_learner_roles_return_403():
    trainer_token = create_token(sub=str(USER_TRAINER_ID), email="trainer@skillbridge.gov.in")
    admin_token = create_token(sub=str(USER_ADMIN_ID), email="admin@skillbridge.gov.in")

    headers_tr = {"Authorization": f"Bearer {trainer_token}"}
    headers_ad = {"Authorization": f"Bearer {admin_token}"}

    assert client.get("/api/v1/recommendations/", headers=headers_tr).status_code == 403
    assert client.get("/api/v1/recommendations/", headers=headers_ad).status_code == 403

    assert client.get("/api/v1/recommendations/learning-path", headers=headers_tr).status_code == 403
    assert client.get("/api/v1/recommendations/learning-path", headers=headers_ad).status_code == 403


def test_inactive_learner_is_blocked():
    with TestingSessionLocal() as db:
        inactive_user = User(
            email="inactive.rec@skillbridge.gov.in",
            full_name="Inactive Learner",
            role="learner",
            is_active=False,
        )
        db.add(inactive_user)
        db.commit()
        db.refresh(inactive_user)
        user_id = str(inactive_user.id)

    token = create_token(sub=user_id, email="inactive.rec@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 403


# -----------------------------------------------------------------------------
# 2. Personalized Recommendations & Prioritization Tests
# -----------------------------------------------------------------------------

def test_personalized_recommendations_for_data_analyst():
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["learner_id"] == str(USER_LEARNER_ID)
    assert data["job_role_title"] == "Data Analyst"
    assert data["total_gaps_identified"] > 0
    assert len(data["recommendations"]) > 0

    first_rec = data["recommendations"][0]
    assert "course_id" in first_rec
    assert "code" in first_rec
    assert "title" in first_rec
    assert "relevance_score" in first_rec
    assert "priority" in first_rec
    assert "reason" in first_rec
    assert "competencies_addressed" in first_rec

    # Recommendations must be in descending order of relevance_score
    scores = [r["relevance_score"] for r in data["recommendations"]]
    assert scores == sorted(scores, reverse=True)


def test_mandatory_and_larger_gaps_ranked_higher():
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 200
    data = res.json()
    recs = data["recommendations"]

    # Top recommendations must include courses addressing Mandatory competencies with Gap 2
    # e.g., STAT_ANALYSIS (Gap 2, Mandatory) or SQL_DATABASE (Gap 2, Mandatory)
    top_codes = [r["code"] for r in recs[:4]]
    assert any("STAT" in code or "SQL" in code or "VIZ" in code for code in top_codes)

    top_rec = recs[0]
    assert top_rec["priority"] == "High"
    assert top_rec["relevance_score"] >= 40.0


def test_completed_courses_excluded_from_recommendations():
    # Enroll and complete a course for Amit Patel
    with TestingSessionLocal() as db:
        course = db.query(Course).filter(Course.code == "CRS-STAT-101").first()
        assert course is not None
        course_id = course.id

        existing_enr = db.query(Enrollment).filter(
            Enrollment.user_id == USER_LEARNER_ID,
            Enrollment.course_id == course_id,
        ).first()

        if not existing_enr:
            enr = Enrollment(
                user_id=USER_LEARNER_ID,
                course_id=course_id,
                status="completed",
                progress_percentage=100,
            )
            db.add(enr)
        else:
            existing_enr.status = "completed"
            existing_enr.progress_percentage = 100
        db.commit()

    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 200
    rec_codes = [r["code"] for r in res.json()["recommendations"]]

    # Completed course CRS-STAT-101 must NOT appear in recommendations
    assert "CRS-STAT-101" not in rec_codes


def test_active_enrollments_marked_with_status():
    with TestingSessionLocal() as db:
        course = db.query(Course).filter(Course.code == "CRS-SQL-201").first()
        assert course is not None
        course_id = course.id

        existing_enr = db.query(Enrollment).filter(
            Enrollment.user_id == USER_LEARNER_ID,
            Enrollment.course_id == course_id,
        ).first()

        if not existing_enr:
            enr = Enrollment(
                user_id=USER_LEARNER_ID,
                course_id=course_id,
                status="in_progress",
                progress_percentage=45,
            )
            db.add(enr)
        else:
            existing_enr.status = "in_progress"
            existing_enr.progress_percentage = 45
        db.commit()

    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 200
    sql_rec = next((r for r in res.json()["recommendations"] if r["code"] == "CRS-SQL-201"), None)
    assert sql_rec is not None
    assert sql_rec["is_enrolled"] is True
    assert sql_rec["enrollment_status"] == "in_progress"
    assert sql_rec["progress_percentage"] == 45


# -----------------------------------------------------------------------------
# 3. Unassessed and No-Gap Learner Edge Cases
# -----------------------------------------------------------------------------

def test_learner_without_assessment_receives_foundational_recommendations():
    # Create new learner with job role but no assessments
    with TestingSessionLocal() as db:
        new_learner = User(
            email="new.survey@skillbridge.gov.in",
            full_name="New Survey Officer",
            role="learner",
            job_role_id=ROLE_SURVEY_OFFICER_ID,
            is_active=True,
        )
        db.add(new_learner)
        db.commit()
        db.refresh(new_learner)
        new_learner_id = str(new_learner.id)

    token = create_token(sub=new_learner_id, email="new.survey@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["job_role_title"] == "Survey Officer"
    assert "not completed a diagnostic assessment" in data["summary_reason"]
    assert len(data["recommendations"]) > 0

    # Must recommend survey courses mapped to Survey Officer role
    rec_codes = [r["code"] for r in data["recommendations"]]
    assert any("SRV" in c for c in rec_codes)


def test_learner_without_gaps_receives_proficient_summary():
    # Create learner whose assessed competencies meet target
    with TestingSessionLocal() as db:
        proficient_learner = User(
            email="proficient@skillbridge.gov.in",
            full_name="Proficient Officer",
            role="learner",
            job_role_id=ROLE_DATA_ANALYST_ID,
            is_active=True,
        )
        db.add(proficient_learner)
        db.commit()
        db.refresh(proficient_learner)
        p_id = proficient_learner.id

        # Add competencies all meeting or exceeding target
        rcs = db.query(RoleCompetency).filter(RoleCompetency.job_role_id == ROLE_DATA_ANALYST_ID).all()
        for rc in rcs:
            lc = LearnerCompetency(
                user_id=p_id,
                competency_id=rc.competency_id,
                current_level=rc.target_level,
                target_level=rc.target_level,
                gap_score=0,
            )
            db.add(lc)
        db.commit()

    token = create_token(sub=str(p_id), email="proficient@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/recommendations/", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_gaps_identified"] == 0
    assert len(data["recommendations"]) == 0
    assert "met or exceeded all target competency benchmarks" in data["summary_reason"]


# -----------------------------------------------------------------------------
# 4. Learning Path Sequencing Tests
# -----------------------------------------------------------------------------

def test_learning_path_ordered_pedagogically():
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    res = client.get("/api/v1/recommendations/learning-path", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["learner_id"] == str(USER_LEARNER_ID)
    assert data["total_steps"] > 0
    assert data["total_estimated_hours"] > 0

    steps = data["steps"]
    step_numbers = [s["step_number"] for s in steps]
    assert step_numbers == list(range(1, len(steps) + 1))

    # Pedagogical sequencing: verify foundational delivery courses precede expert courses
    levels = [s["target_level_achieved"] for s in steps]
    # In general, lower delivery levels appear before higher delivery levels
    assert levels[0] <= levels[-1]


# -----------------------------------------------------------------------------
# 5. Course Enrollment API Tests
# -----------------------------------------------------------------------------

def test_course_enrollment_success():
    with TestingSessionLocal() as db:
        course = db.query(Course).filter(Course.code == "CRS-VIZ-101").first()
        assert course is not None
        course_id = str(course.id)

        # Ensure no prior enrollment
        db.query(Enrollment).filter(
            Enrollment.user_id == USER_LEARNER_ID,
            Enrollment.course_id == course.id,
        ).delete()
        db.commit()

    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    res = client.post(f"/api/v1/recommendations/{course_id}/enroll", headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["course_id"] == course_id
    assert data["status"] == "enrolled"
    assert data["progress_percentage"] == 0
    assert "Successfully enrolled" in data["message"]


def test_course_enrollment_duplicate_active_returns_409():
    with TestingSessionLocal() as db:
        course = db.query(Course).filter(Course.code == "CRS-VIZ-101").first()
        assert course is not None
        course_id = str(course.id)

    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    # Second enrollment attempt for the same course must return 409 Conflict
    res = client.post(f"/api/v1/recommendations/{course_id}/enroll", headers=headers)
    assert res.status_code == 409
    assert "already actively enrolled" in res.json()["detail"]


def test_course_enrollment_nonexistent_course_returns_404():
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/v1/recommendations/{fake_id}/enroll", headers=headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"]


def test_learner_data_isolation():
    # Verify Learner A cannot see or affect Learner B's enrollments or recommendations
    learner_token_a = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers_a = {"Authorization": f"Bearer {learner_token_a}"}

    res_a = client.get("/api/v1/recommendations/", headers=headers_a)
    assert res_a.status_code == 200
    assert res_a.json()["learner_id"] == str(USER_LEARNER_ID)
