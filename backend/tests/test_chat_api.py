"""
Integration Tests for SkillBridge AI Phase 7 Chat & RAG Assistant APIs
Tests:
- Authentication & RBAC (401, 403 inactive)
- Learner ask question over authorized documents with source citations
- Safe refusal on out-of-scope questions
- Unauthorized document filter returns 404
- Source inspection endpoint access control
- Health endpoint readiness without secrets leakage
- Strict schema validation
"""
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
from app.models.document import DocumentChunk, TrainingDocument
from app.models.user import User
from app.services.document_embedding import serialize_vector_for_db
from app.services.embedding_service import get_embedding_service

TEST_DB_FILE = "test_chat_api_temp.db"
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


app.dependency_overrides[get_db] = override_get_db
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


@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)

    # Add extra unpublished document for isolation testing
    emb = get_embedding_service()
    doc_unpub = TrainingDocument(
        id=uuid.UUID("55555555-5555-5555-5555-555555555501"),
        title="Trainer Private Draft On Budgeting",
        file_name="private_budget.txt",
        file_path="storage/private_budget.txt",
        status="processed",
        is_published=False,  # UNPUBLISHED
        uploaded_by=USER_TRAINER_ID,
    )
    db.add(doc_unpub)
    db.flush()

    chunk_unpub = DocumentChunk(
        id=uuid.UUID("55555555-5555-5555-5555-555555555502"),
        document_id=doc_unpub.id,
        chunk_index=0,
        chunk_text="Confidential draft: allocation of contingent expenditure funds.",
        token_count=50,
        embedding=serialize_vector_for_db(emb.embed_query("Confidential draft allocation"), "sqlite"),
    )
    db.add(chunk_unpub)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


def test_unauthenticated_chat_returns_401():
    res = client.post("/api/v1/chat/ask", json={"question": "What is GeM procurement?"})
    assert res.status_code == 401


def test_inactive_user_is_blocked():
    db = TestingSessionLocal()
    inactive_user = User(
        id=uuid.uuid4(),
        email="inactive@skillbridge.gov.in",
        full_name="Deactivated Officer",
        role="learner",
        is_active=False,
    )
    db.add(inactive_user)
    db.commit()
    db.close()

    token = create_token(sub=str(inactive_user.id), email=inactive_user.email)
    res = client.post(
        "/api/v1/chat/ask",
        json={"question": "What is GeM procurement?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_learner_ask_question_over_published_documents():
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    res = client.post(
        "/api/v1/chat/ask",
        json={"question": "What is the direct purchase limit on GeM portal?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["is_grounded"] is True
    assert data["refusal_reason"] is None
    assert len(data["citations"]) >= 1
    assert "GeM" in data["answer"] or "purchase" in data["answer"].lower()

    cit = data["citations"][0]
    assert cit["citation_id"] == "[1]"
    assert "GeM" in cit["document_title"]
    assert cit["chunk_id"] is not None


def test_learner_ask_irrelevant_question_returns_refusal():
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    res = client.post(
        "/api/v1/chat/ask",
        json={"question": "How to make a mango cheesecake dessert?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["is_grounded"] is False
    assert data["refusal_reason"] == "insufficient_evidence"
    assert len(data["citations"]) == 0
    assert "cannot find sufficient" in data["answer"].lower()


def test_open_world_relatable_conceptual_answering():
    # User asks a conceptual question related to the course/domain (e.g. "what is statistics?")
    # even without an exact definition in the specific source manual
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    res = client.post(
        "/api/v1/chat/ask",
        json={"question": "What is statistics and how does it help policymaking?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["is_grounded"] is True
    assert data["refusal_reason"] is None
    assert "statistics" in data["answer"].lower()
    assert "evidence-based policymaking" in data["answer"].lower() or "governance" in data["answer"].lower()



def test_filter_by_unpublished_document_returns_404_for_learner():
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    unpub_doc_id = "55555555-5555-5555-5555-555555555501"

    res = client.post(
        "/api/v1/chat/ask",
        json={
            "question": "What is the budget allocation?",
            "document_id": unpub_doc_id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404


def test_source_chunk_inspection_access_control():
    learner_token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")

    # 1. Accessing published chunk (from GeM seed doc)
    db = TestingSessionLocal()
    pub_chunk = (
        db.query(DocumentChunk, TrainingDocument)
        .join(TrainingDocument)
        .filter(TrainingDocument.is_published == True)
        .first()
    )
    db.close()
    assert pub_chunk is not None

    res = client.get(
        f"/api/v1/chat/sources/{pub_chunk[0].id}",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert res.status_code == 200
    passage_data = res.json()
    assert passage_data["chunk_id"] == str(pub_chunk[0].id)
    assert len(passage_data["content"]) > 0

    # 2. Learner attempting to access unpublished chunk -> 404
    unpub_chunk_id = "55555555-5555-5555-5555-555555555502"
    res_unpub = client.get(
        f"/api/v1/chat/sources/{unpub_chunk_id}",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert res_unpub.status_code == 404


def test_chat_health_endpoint():
    res = client.get("/api/v1/chat/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ready"
    assert data["embedding_dimensions"] == 1536
    assert "embedding_model" in data
    assert "api_key" not in str(data).lower()
    assert "secret" not in str(data).lower()


def test_question_length_validation():
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    # Too short (< 3 chars)
    res = client.post(
        "/api/v1/chat/ask",
        json={"question": "hi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


def test_list_chat_courses():
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    res = client.get("/api/v1/chat/courses", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 1
    codes = [c["code"] for c in courses]
    assert "CRS-IGOT-DA01" in codes


def test_learner_ask_question_with_course_scoping():
    token = create_token(sub=str(USER_LEARNER_ID), email="learner.patel@skillbridge.gov.in")
    # Get course ID for DA01
    res_courses = client.get("/api/v1/chat/courses", headers={"Authorization": f"Bearer {token}"})
    assert res_courses.status_code == 200
    da_course = next(c for c in res_courses.json() if c["code"] == "CRS-IGOT-DA01")

    res = client.post(
        "/api/v1/chat/ask",
        json={
            "question": "What is the curriculum and key topics covered in this course?",
            "course_id": da_course["id"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_grounded"] is True
    assert len(data["citations"]) >= 1
    assert "CRS-IGOT-DA01" in data["citations"][0]["document_title"] or "Data-Driven" in data["answer"]
