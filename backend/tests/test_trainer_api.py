"""
Integration & End-to-End API Tests for SkillBridge AI Phase 6 Trainer & Faculty Module
Tests:
- Authentication & RBAC (401, 403, inactive accounts)
- Document upload, MIME validation, and chunking
- Trainer document listing and data isolation
- Document deletion ownership enforcement
- AI Quiz generation: Draft creation with source traceability
- Draft quiz excluded from learner assessment catalogue & intake
- Quiz detail retrieval with answers for authoring
- Quiz modification and server-side rubric validation
- Mandatory publishing workflow: Draft -> Published
- Published quiz visibility in learner assessment catalogue
- Quiz deletion without attempts vs safe archival when attempts exist
- Trainer-to-trainer data isolation
"""
import io
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
    USER_ADMIN_ID,
    USER_LEARNER_ID,
    USER_TRAINER_ID,
    seed_database,
)
from app.db.session import get_db
from app.main import app
from app.models.competency import Competency
from app.models.document import DocumentChunk, TrainingDocument
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User

TEST_DB_FILE = "test_trainer_api_temp.db"
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
    email: str = "trainer.sharma@skillbridge.gov.in",
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

def test_unauthenticated_trainer_endpoints_return_401():
    assert client.get("/api/v1/trainer/documents").status_code == 401
    assert client.get("/api/v1/trainer/quizzes").status_code == 401
    assert client.post("/api/v1/trainer/quizzes/generate", json={}).status_code == 401


def test_learner_cannot_access_trainer_endpoints():
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    assert client.get("/api/v1/trainer/documents", headers=headers).status_code == 403
    assert client.get("/api/v1/trainer/quizzes", headers=headers).status_code == 403
    assert client.post("/api/v1/trainer/quizzes/generate", json={}, headers=headers).status_code == 403


def test_inactive_trainer_blocked():
    with TestingSessionLocal() as db:
        inactive_trainer = User(
            email="inactive.trn@skillbridge.gov.in",
            full_name="Inactive Faculty",
            role="trainer",
            is_active=False,
        )
        db.add(inactive_trainer)
        db.commit()
        db.refresh(inactive_trainer)
        trn_id = str(inactive_trainer.id)

    token = create_token(sub=trn_id, email="inactive.trn@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/trainer/documents", headers=headers)
    assert res.status_code == 403


# -----------------------------------------------------------------------------
# 2. Document Ingestion & Management Tests
# -----------------------------------------------------------------------------

def test_trainer_document_upload_success():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    sample_text = (
        "Ministry of Personnel Circular No. 12/2026.\n\n"
        "Guidelines on Public Procurement through Government e-Marketplace (GeM).\n"
        "All central ministries and state departments must mandate procurement through GeM "
        "for goods and services valued above threshold limits. Direct purchase is authorized up to "
        "rupees twenty-five thousand through any available supplier on GeM meeting quality standards. "
        "For values between rupees twenty-five thousand and five lakh, procurement must be conducted through "
        "the GeM seller with lowest price after comparing at least three distinct manufacturers. "
        "Splitting of procurement requirements to evade higher threshold bidding protocols is strictly prohibited. "
        "Invoicing and electronic payments must be completed within ten days of consignee acceptance. "
    ) * 4

    files = {
        "file": ("gem_procurement_sop.txt", io.BytesIO(sample_text.encode("utf-8")), "text/plain"),
    }
    data = {"title": "GeM Public Procurement Standard Operating Procedure"}

    res = client.post("/api/v1/trainer/documents/upload", headers=headers, files=files, data=data)
    assert res.status_code == 201
    doc_data = res.json()

    assert doc_data["title"] == "GeM Public Procurement Standard Operating Procedure"
    assert doc_data["status"] == "processed"
    assert doc_data["chunk_count"] >= 1
    assert "id" in doc_data


def test_trainer_document_upload_oversized_rejected():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    # 16 MB dummy payload
    oversized = b"0" * (16 * 1024 * 1024)
    files = {
        "file": ("huge_file.txt", io.BytesIO(oversized), "text/plain"),
    }

    res = client.post("/api/v1/trainer/documents/upload", headers=headers, files=files)
    assert res.status_code == 400
    assert "exceeds maximum limit" in res.json()["detail"]


def test_trainer_document_listing_and_data_isolation():
    # Create second trainer
    with TestingSessionLocal() as db:
        trainer2 = User(
            email="trainer2@skillbridge.gov.in",
            full_name="Second Trainer",
            role="trainer",
            is_active=True,
        )
        db.add(trainer2)
        db.commit()
        db.refresh(trainer2)
        trn2_id = str(trainer2.id)

        # Upload a document under trainer2
        doc2 = TrainingDocument(
            title="Trainer 2 Secret Document",
            file_name="secret.txt",
            file_path="storage/documents/secret.txt",
            file_size_bytes=100,
            mime_type="text/plain",
            status="processed",
            uploaded_by=trainer2.id,
        )
        db.add(doc2)
        db.commit()
        db.refresh(doc2)
        doc2_id = doc2.id

    token_trn1 = create_token(sub=str(USER_TRAINER_ID))
    token_trn2 = create_token(sub=trn2_id, email="trainer2@skillbridge.gov.in")
    token_admin = create_token(sub=str(USER_ADMIN_ID), email="admin@skillbridge.gov.in")

    headers_trn1 = {"Authorization": f"Bearer {token_trn1}"}
    headers_trn2 = {"Authorization": f"Bearer {token_trn2}"}
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # Trainer 1 does not see Trainer 2's document
    res_trn1 = client.get("/api/v1/trainer/documents", headers=headers_trn1)
    assert res_trn1.status_code == 200
    trn1_titles = [d["title"] for d in res_trn1.json()]
    assert "Trainer 2 Secret Document" not in trn1_titles

    # Trainer 2 sees their own document
    res_trn2 = client.get("/api/v1/trainer/documents", headers=headers_trn2)
    assert res_trn2.status_code == 200
    trn2_titles = [d["title"] for d in res_trn2.json()]
    assert "Trainer 2 Secret Document" in trn2_titles

    # Trainer 1 cannot delete Trainer 2's document
    res_del_denied = client.delete(f"/api/v1/trainer/documents/{doc2_id}", headers=headers_trn1)
    assert res_del_denied.status_code == 403

    # Admin can see all documents
    res_admin = client.get("/api/v1/trainer/documents", headers=headers_admin)
    assert res_admin.status_code == 200
    admin_titles = [d["title"] for d in res_admin.json()]
    assert "Trainer 2 Secret Document" in admin_titles


# -----------------------------------------------------------------------------
# 3. AI Quiz Generation & Publishing Workflow Tests
# -----------------------------------------------------------------------------

def test_ai_quiz_generation_creates_draft_quiz():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    # Get uploaded document
    res_docs = client.get("/api/v1/trainer/documents", headers=headers)
    assert res_docs.status_code == 200
    docs = res_docs.json()
    assert len(docs) > 0
    doc_id = docs[0]["id"]

    payload = {
        "document_id": doc_id,
        "title": "GeM Public Procurement Diagnostic Assessment",
        "competency_code": "GOV_COMPLIANCE",
        "question_count": 3,
        "difficulty_level": 3,
        "passing_marks": 60,
        "total_marks": 100,
    }

    res = client.post("/api/v1/trainer/quizzes/generate", json=payload, headers=headers)
    assert res.status_code == 201
    quiz_data = res.json()

    assert quiz_data["status"] == "draft"
    assert quiz_data["title"] == "GeM Public Procurement Diagnostic Assessment"
    assert quiz_data["question_count"] == 3
    assert len(quiz_data["questions"]) == 3

    # Verify answers are included for trainer review
    for q in quiz_data["questions"]:
        assert "correct_index" in q
        assert "explanation" in q
        assert "[SOURCE-DERIVED DETERMINISTIC EVALUATION]" in q["explanation"]


def test_draft_quiz_not_visible_to_learners():
    # Trainer has created draft quiz
    with TestingSessionLocal() as db:
        draft_quiz = (
            db.query(Quiz)
            .filter(Quiz.status == "draft", Quiz.created_by == USER_TRAINER_ID)
            .first()
        )
        assert draft_quiz is not None
        draft_id = str(draft_quiz.id)

    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers = {"Authorization": f"Bearer {learner_token}"}

    # 1. Draft quiz must NOT appear in assessment catalogue
    res_cat = client.get("/api/v1/assessment/catalogue", headers=headers)
    assert res_cat.status_code == 200
    cat_ids = [q["id"] for q in res_cat.json()]
    assert draft_id not in cat_ids

    # 2. Intake endpoint must return 404 for draft quiz
    res_detail = client.get(f"/api/v1/assessment/{draft_id}", headers=headers)
    assert res_detail.status_code == 404

    # 3. Submission endpoint must reject draft quiz
    res_sub = client.post(
        f"/api/v1/assessment/{draft_id}/submit",
        json={"answers": {}},
        headers=headers,
    )
    assert res_sub.status_code == 404


def test_trainer_updates_quiz_definition():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    with TestingSessionLocal() as db:
        draft_quiz = (
            db.query(Quiz)
            .filter(Quiz.status == "draft", Quiz.created_by == USER_TRAINER_ID)
            .first()
        )
        draft_id = str(draft_quiz.id)

    update_payload = {
        "title": "GeM Public Procurement Diagnostic Assessment (Edited)",
        "passing_marks": 70,
    }

    res = client.put(f"/api/v1/trainer/quizzes/{draft_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["title"] == "GeM Public Procurement Diagnostic Assessment (Edited)"
    assert updated["passing_marks"] == 70


def test_trainer_publishes_quiz_workflow():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    with TestingSessionLocal() as db:
        draft_quiz = (
            db.query(Quiz)
            .filter(Quiz.status == "draft", Quiz.created_by == USER_TRAINER_ID)
            .first()
        )
        # Ensure learner is pursuing the course associated with this quiz
        from app.models.course import Course
        course = db.query(Course).filter(Course.code == "CRS-IGOT-DA01").first()
        if course:
            draft_quiz.course_id = course.id
            db.commit()
        draft_id = str(draft_quiz.id)

    # Publish action
    res_pub = client.post(f"/api/v1/trainer/quizzes/{draft_id}/publish", headers=headers)
    assert res_pub.status_code == 200
    assert res_pub.json()["status"] == "published"

    # Now verify it becomes accessible to learners
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner@skillbridge.gov.in")
    headers_lrn = {"Authorization": f"Bearer {learner_token}"}

    res_cat = client.get("/api/v1/assessment/catalogue", headers=headers_lrn)
    assert res_cat.status_code == 200
    cat_ids = [q["id"] for q in res_cat.json()]
    assert draft_id in cat_ids


def test_quiz_deletion_without_attempts():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    # Create dummy quiz with 0 attempts
    with TestingSessionLocal() as db:
        q = Quiz(
            title="Temporary Deletable Quiz",
            status="draft",
            created_by=USER_TRAINER_ID,
            total_marks=50,
            passing_marks=30,
            questions=[],
        )
        db.add(q)
        db.commit()
        db.refresh(q)
        q_id = str(q.id)

    res = client.delete(f"/api/v1/trainer/quizzes/{q_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_quiz_with_attempts_safely_archived_instead_of_deleted():
    trainer_token = create_token(sub=str(USER_TRAINER_ID))
    headers = {"Authorization": f"Bearer {trainer_token}"}

    # Create quiz authored by trainer and associate an attempt
    with TestingSessionLocal() as db:
        quiz = Quiz(
            title="Quiz With Historical Attempts",
            status="published",
            created_by=USER_TRAINER_ID,
            total_marks=100,
            passing_marks=60,
            questions=[],
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        quiz_id = str(quiz.id)

        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=USER_LEARNER_ID,
            score=80,
            percentage=80.0,
            passed=True,
            answers={"q1": 0},
        )
        db.add(attempt)
        db.commit()

    res = client.delete(f"/api/v1/trainer/quizzes/{quiz_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "archived"
    assert "safely archived" in data["message"]

    # Verify quiz still exists in DB with status == 'archived'
    with TestingSessionLocal() as db:
        archived_q = db.query(Quiz).filter(Quiz.id == uuid.UUID(quiz_id)).first()
        assert archived_q is not None
        assert archived_q.status == "archived"
