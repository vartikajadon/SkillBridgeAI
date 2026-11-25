"""
Unit tests for SkillBridge AI Phase 1 Database Models & Seeding
Runs against in-memory SQLite for complete offline test execution.
"""
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.seed import seed_database
from app.models.user import User
from app.models.job_role import JobRole
from app.models.competency import Competency, RoleCompetency, LearnerCompetency
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.document import TrainingDocument, DocumentChunk
from app.models.quiz import Quiz, QuizAttempt
from app.models.audit import AuditLog


@pytest.fixture(scope="function")
def db_session():
    """Provides a clean in-memory database session for each test."""
    test_engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


def test_all_13_tables_created(db_session):
    """Verify that all required core tables exist in Base.metadata."""
    table_names = set(Base.metadata.tables.keys())
    expected_tables = {
        "users",
        "job_roles",
        "competencies",
        "role_competencies",
        "learner_competencies",
        "courses",
        "course_competencies",
        "enrollments",
        "training_documents",
        "document_chunks",
        "quizzes",
        "quiz_attempts",
        "audit_logs",
    }
    assert expected_tables.issubset(table_names), f"Missing required tables: {expected_tables.difference(table_names)}"
    assert "course_modules" in table_names
    assert len(table_names) >= 13


def test_user_and_job_role_relationship(db_session):
    """Verify JobRole creation and User association."""
    role = JobRole(
        code="DATA_ARCHITECT",
        title="Senior Data Architect",
        department="Digital Governance Agency",
        description="Oversees database schema and enterprise architecture.",
    )
    db_session.add(role)
    db_session.commit()

    user = User(
        email="architect@gov.in",
        full_name="Aarav Varma",
        role="learner",
        department="Digital Governance Agency",
        job_role_id=role.id,
    )
    db_session.add(user)
    db_session.commit()

    # Query back and verify relationship navigation
    queried_user = db_session.query(User).filter_by(email="architect@gov.in").first()
    assert queried_user is not None
    assert queried_user.job_role.code == "DATA_ARCHITECT"
    assert queried_user.job_role.title == "Senior Data Architect"


def test_duplicate_code_raises_integrity_error(db_session):
    """Verify UNIQUE constraints prevent duplicates."""
    c1 = Competency(code="PYTHON_CORE", name="Python Programming", category="Technical")
    c2 = Competency(code="PYTHON_CORE", name="Duplicate Code", category="Technical")
    db_session.add(c1)
    db_session.commit()

    db_session.add(c2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_document_and_chunks_cascade(db_session):
    """Verify deleting a TrainingDocument automatically cascades to delete its DocumentChunks."""
    doc = TrainingDocument(
        title="Public Financial Management SOP",
        file_name="pfms_sop_2026.pdf",
        file_path="storage/docs/pfms_sop_2026.pdf",
        file_size_bytes=102400,
        mime_type="application/pdf",
        status="processed",
    )
    db_session.add(doc)
    db_session.commit()

    chunk1 = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        chunk_text="Chapter 1: Sanctioning Authorities and Delegations.",
        token_count=12,
    )
    chunk2 = DocumentChunk(
        document_id=doc.id,
        chunk_index=1,
        chunk_text="Chapter 2: Treasury bill submission guidelines.",
        token_count=10,
    )
    db_session.add_all([chunk1, chunk2])
    db_session.commit()

    assert db_session.query(DocumentChunk).filter_by(document_id=doc.id).count() == 2

    # Delete parent document
    db_session.delete(doc)
    db_session.commit()

    # Verify chunks are automatically removed
    assert db_session.query(DocumentChunk).filter_by(document_id=doc.id).count() == 0


def test_deterministic_seed_is_idempotent(db_session):
    """Verify that running seed_database twice produces no duplicates and succeeds cleanly."""
    # First execution
    seed_database(db_session)
    role_count_1 = db_session.query(JobRole).count()
    comp_count_1 = db_session.query(Competency).count()
    course_count_1 = db_session.query(Course).count()
    quiz_count_1 = db_session.query(Quiz).count()
    user_count_1 = db_session.query(User).count()

    assert role_count_1 == 4
    assert comp_count_1 == 12
    assert course_count_1 == 17
    assert quiz_count_1 == 2
    assert user_count_1 == 3

    # Second execution (Idempotency test)
    seed_database(db_session)
    role_count_2 = db_session.query(JobRole).count()
    comp_count_2 = db_session.query(Competency).count()
    course_count_2 = db_session.query(Course).count()
    quiz_count_2 = db_session.query(Quiz).count()
    user_count_2 = db_session.query(User).count()

    assert role_count_2 == role_count_1, "Duplicate JobRoles were created!"
    assert comp_count_2 == comp_count_1, "Duplicate Competencies were created!"
    assert course_count_2 == course_count_1, "Duplicate Courses were created!"
    assert quiz_count_2 == quiz_count_1, "Duplicate Quizzes were created!"
    assert user_count_2 == user_count_1, "Duplicate Users were created!"
