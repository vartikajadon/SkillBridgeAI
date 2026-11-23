"""
Trainer & Faculty Management Endpoints (Phase 6)
Provides document upload, ingestion & text chunking, AI quiz generation,
quiz reviewing & editing, publishing workflows, and archival protection.
"""
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.competency import Competency
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.document import DocumentChunk, TrainingDocument
from app.models.quiz import Quiz, QuizAttempt
from app.models.user import User
from app.schemas.trainer import (
    CoursePublishResponse,
    DocumentPublishResponse,
    DocumentUploadResponse,
    QuizDeleteResponse,
    QuizGenerateRequest,
    QuizPublishResponse,
    QuizUpdateRequest,
    TrainerCourseItem,
    TrainerDocumentItem,
    TrainerQuizDetailResponse,
    TrainerQuizListItem,
)
from app.services.assessment_engine import validate_quiz_definition
from app.services.document_embedding import embed_document_chunks
from app.services.document_processor import process_and_store_document
from app.services.quiz_generator import generate_quiz_from_document

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Document Upload & Ingestion
# -----------------------------------------------------------------------------

@router.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest training document",
    description="Accepts PDF, TXT, or Markdown files (max 15MB), validates signatures, extracts text, and creates chunks.",
)
async def upload_training_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    content = await file.read()

    try:
        doc, chunks = process_and_store_document(
            db=db,
            file_bytes=content,
            original_filename=file.filename or "uploaded_document.pdf",
            mime_type=file.content_type or "application/pdf",
            title=title or file.filename or "Untitled Document",
            uploader_id=current_user.id,
        )
        # Generate initial chunk embeddings
        try:
            embed_document_chunks(db, doc.id)
            db.refresh(doc)
        except Exception:
            pass
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return DocumentUploadResponse(
        id=doc.id,
        title=doc.title,
        file_name=doc.file_name,
        file_size_bytes=doc.file_size_bytes,
        mime_type=doc.mime_type,
        status=doc.status,
        chunk_count=len(chunks),
        is_published=doc.is_published,
        embedding_model=doc.embedding_model,
        embedding_dim=doc.embedding_dim,
        created_at=doc.created_at,
    )


@router.get(
    "/documents",
    response_model=List[TrainerDocumentItem],
    summary="List uploaded training documents",
    description="Returns documents uploaded by the authenticated trainer (or all for admin), with chunk counts.",
)
def list_trainer_documents(
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> List[TrainerDocumentItem]:
    query = db.query(TrainingDocument)
    if current_user.role != "admin":
        query = query.filter(TrainingDocument.uploaded_by == current_user.id)

    docs = query.order_by(TrainingDocument.created_at.desc()).all()
    results = []
    for doc in docs:
        chunk_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
        results.append(
            TrainerDocumentItem(
                id=doc.id,
                title=doc.title,
                file_name=doc.file_name,
                file_size_bytes=doc.file_size_bytes,
                mime_type=doc.mime_type,
                status=doc.status,
                chunk_count=chunk_count,
                is_published=doc.is_published,
                embedding_model=doc.embedding_model,
                embedding_dim=doc.embedding_dim,
                created_at=doc.created_at,
            )
        )
    return results


@router.post(
    "/documents/{document_id}/publish",
    response_model=DocumentPublishResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish training document for learner RAG access",
    description="Transitions document to published status, generates chunk embeddings, and exposes it to civil service learners.",
)
def publish_trainer_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> DocumentPublishResponse:
    doc = db.query(TrainingDocument).filter(TrainingDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    # Ownership check
    if current_user.role != "admin" and doc.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to publish this document.",
        )

    if doc.status != "processed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish document with status '{doc.status}'. Document must be processed first.",
        )

    # Ensure chunk embeddings exist
    _, total = embed_document_chunks(db, doc.id)

    doc.is_published = True
    db.commit()
    db.refresh(doc)

    return DocumentPublishResponse(
        id=doc.id,
        title=doc.title,
        is_published=True,
        status=doc.status,
        chunks_embedded=total,
        message="Document published successfully. It is now accessible to learners via AI Learning Assistant.",
    )


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete uploaded training document",
    description="Deletes training document and its associated chunks. Requires document ownership or admin role.",
)
def delete_trainer_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> dict:
    doc = db.query(TrainingDocument).filter(TrainingDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    # Ownership check
    if current_user.role != "admin" and doc.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this document.",
        )

    # Remove file from disk safely
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document and associated chunks deleted successfully."}


# -----------------------------------------------------------------------------
# 2. AI Quiz Generation Studio
# -----------------------------------------------------------------------------

@router.post(
    "/quizzes/generate",
    response_model=TrainerQuizDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Synthesize AI quiz from document chunks",
    description="Generates a draft quiz from selected document text chunks aligned with target competency.",
)
def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> TrainerQuizDetailResponse:
    # 1. Fetch document and verify ownership
    doc = db.query(TrainingDocument).filter(TrainingDocument.id == payload.document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source document with ID '{payload.document_id}' was not found.",
        )

    if current_user.role != "admin" and doc.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only generate assessments from documents you uploaded.",
        )

    if doc.status != "processed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source document is not processed (Status: '{doc.status}').",
        )

    # 2. Fetch document chunks
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No processed chunks available for this document.",
        )

    # 3. Resolve competency
    comp_code = payload.competency_code or "GENERAL_GOVERNANCE"
    comp_id = payload.competency_id

    if comp_id:
        comp_obj = db.query(Competency).filter(Competency.id == comp_id).first()
        if comp_obj:
            comp_code = comp_obj.code
    elif payload.competency_code:
        comp_obj = db.query(Competency).filter(Competency.code == payload.competency_code).first()
        if comp_obj:
            comp_id = comp_obj.id

    # 4. Generate questions
    try:
        questions = generate_quiz_from_document(
            chunks=chunks,
            competency_code=comp_code,
            question_count=payload.question_count,
            difficulty_level=payload.difficulty_level,
            total_marks=payload.total_marks,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # 5. Create Draft Quiz
    quiz = Quiz(
        title=payload.title,
        status="draft",
        competency_id=comp_id,
        created_by=current_user.id,
        total_marks=payload.total_marks,
        passing_marks=payload.passing_marks,
        questions=questions,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    return TrainerQuizDetailResponse(
        id=quiz.id,
        title=quiz.title,
        status=quiz.status,
        competency_id=quiz.competency_id,
        competency_code=comp_code,
        total_marks=quiz.total_marks,
        passing_marks=quiz.passing_marks,
        question_count=len(quiz.questions),
        created_at=quiz.created_at,
        updated_at=quiz.updated_at,
        questions=quiz.questions,
        attempts_count=0,
    )


# -----------------------------------------------------------------------------
# 3. Quiz Review, Edit & Publishing
# -----------------------------------------------------------------------------

@router.get(
    "/quizzes",
    response_model=List[TrainerQuizListItem],
    summary="List authored quizzes",
    description="Returns quizzes authored by the trainer with attempt metrics, status, and pass rates.",
)
def list_trainer_quizzes(
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> List[TrainerQuizListItem]:
    query = db.query(Quiz)
    if current_user.role != "admin":
        query = query.filter(Quiz.created_by == current_user.id)

    quizzes = query.order_by(Quiz.created_at.desc()).all()
    results = []

    for q in quizzes:
        comp_code = None
        if q.competency_id:
            c = db.query(Competency).filter(Competency.id == q.competency_id).first()
            if c:
                comp_code = c.code

        attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).all()
        att_count = len(attempts)
        passed_count = sum(1 for a in attempts if a.passed)
        pass_rate = round((passed_count / att_count) * 100, 1) if att_count > 0 else 0.0

        results.append(
            TrainerQuizListItem(
                id=q.id,
                title=q.title,
                status=q.status,
                competency_code=comp_code,
                total_marks=q.total_marks,
                passing_marks=q.passing_marks,
                question_count=len(q.questions) if isinstance(q.questions, list) else 0,
                attempts_count=att_count,
                pass_rate=pass_rate,
                created_at=q.created_at,
                updated_at=q.updated_at,
            )
        )
    return results


@router.get(
    "/quizzes/{quiz_id}",
    response_model=TrainerQuizDetailResponse,
    summary="Get full quiz definition for editing",
    description="Returns quiz definition including answer keys and explanations for trainer review and authoring.",
)
def get_quiz_detail(
    quiz_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> TrainerQuizDetailResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID '{quiz_id}' was not found.",
        )

    if current_user.role != "admin" and quiz.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view or edit this quiz.",
        )

    comp_code = None
    if quiz.competency_id:
        c = db.query(Competency).filter(Competency.id == quiz.competency_id).first()
        if c:
            comp_code = c.code

    att_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).count()

    return TrainerQuizDetailResponse(
        id=quiz.id,
        title=quiz.title,
        status=quiz.status,
        competency_id=quiz.competency_id,
        competency_code=comp_code,
        total_marks=quiz.total_marks,
        passing_marks=quiz.passing_marks,
        question_count=len(quiz.questions) if isinstance(quiz.questions, list) else 0,
        created_at=quiz.created_at,
        updated_at=quiz.updated_at,
        questions=quiz.questions,
        attempts_count=att_count,
    )


@router.put(
    "/quizzes/{quiz_id}",
    response_model=TrainerQuizDetailResponse,
    summary="Update quiz questions and parameters",
    description="Updates quiz title, passing marks, and question bank. Enforces server-side rubric validation.",
)
def update_quiz(
    quiz_id: uuid.UUID,
    payload: QuizUpdateRequest,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> TrainerQuizDetailResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID '{quiz_id}' was not found.",
        )

    if current_user.role != "admin" and quiz.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this quiz.",
        )

    if payload.questions is not None:
        try:
            validate_quiz_definition(payload.questions)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid question bank: {str(e)}",
            )
        quiz.questions = payload.questions

    if payload.title is not None:
        quiz.title = payload.title.strip()
    if payload.total_marks is not None:
        quiz.total_marks = payload.total_marks
    if payload.passing_marks is not None:
        if payload.passing_marks > quiz.total_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Passing marks ({payload.passing_marks}) cannot exceed total marks ({quiz.total_marks}).",
            )
        quiz.passing_marks = payload.passing_marks

    db.commit()
    db.refresh(quiz)

    comp_code = None
    if quiz.competency_id:
        c = db.query(Competency).filter(Competency.id == quiz.competency_id).first()
        if c:
            comp_code = c.code

    att_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).count()

    return TrainerQuizDetailResponse(
        id=quiz.id,
        title=quiz.title,
        status=quiz.status,
        competency_id=quiz.competency_id,
        competency_code=comp_code,
        total_marks=quiz.total_marks,
        passing_marks=quiz.passing_marks,
        question_count=len(quiz.questions),
        created_at=quiz.created_at,
        updated_at=quiz.updated_at,
        questions=quiz.questions,
        attempts_count=att_count,
    )


@router.post(
    "/quizzes/{quiz_id}/publish",
    response_model=QuizPublishResponse,
    summary="Publish draft quiz to learner catalogue",
    description="Transitions a quiz from 'draft' to 'published', making it accessible in the learner assessment catalogue.",
)
def publish_quiz(
    quiz_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> QuizPublishResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID '{quiz_id}' was not found.",
        )

    if current_user.role != "admin" and quiz.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to publish this quiz.",
        )

    if not quiz.questions or len(quiz.questions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish a quiz with an empty question bank.",
        )

    quiz.status = "published"
    db.commit()

    return QuizPublishResponse(
        id=quiz.id,
        title=quiz.title,
        status=quiz.status,
        message=f"Assessment '{quiz.title}' is now published and active for civil service learners.",
    )


@router.delete(
    "/quizzes/{quiz_id}",
    response_model=QuizDeleteResponse,
    summary="Delete or archive quiz",
    description="Deletes quiz if no learner attempts exist; archives the quiz to protect attempt history if attempts exist.",
)
def delete_quiz(
    quiz_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> QuizDeleteResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID '{quiz_id}' was not found.",
        )

    if current_user.role != "admin" and quiz.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this quiz.",
        )

    # Check for historical attempts
    attempt_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).count()

    if attempt_count > 0:
        # Mandatory audit protection: archive rather than destroy
        quiz.status = "archived"
        db.commit()
        return QuizDeleteResponse(
            id=quiz.id,
            status="archived",
            message=f"Quiz '{quiz.title}' has {attempt_count} historical learner attempt(s) and was safely archived rather than deleted.",
        )

    # Safe to delete permanently
    db.delete(quiz)
    db.commit()
    return QuizDeleteResponse(
        id=quiz_id,
        status="deleted",
        message=f"Quiz '{quiz.title}' was deleted successfully.",
    )


# -----------------------------------------------------------------------------
# 4. Course Curriculum Review & Publishing
# -----------------------------------------------------------------------------

@router.get(
    "/courses",
    response_model=List[TrainerCourseItem],
    summary="List training courses for review and publishing",
    description="Returns courses with mapped competencies, enrollment counts, and publishing status.",
)
def list_trainer_courses(
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> List[TrainerCourseItem]:
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    results = []

    for c in courses:
        comp_codes = []
        for cc in c.course_competencies:
            comp = db.query(Competency).filter(Competency.id == cc.competency_id).first()
            if comp:
                comp_codes.append(comp.code)

        # Detect target role from code or description
        target_role = "General Civil Service"
        if "DA" in c.code or "Data Analyst" in (c.description or ""):
            target_role = "Data Analyst"
        elif "BA" in c.code or "Business Analyst" in (c.description or ""):
            target_role = "Business Analyst"
        elif "FA" in c.code or "Finance" in (c.description or "") or "PFMS" in c.title:
            target_role = "Finance Assistant"

        enrollment_count = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()

        results.append(
            TrainerCourseItem(
                id=c.id,
                code=c.code,
                title=c.title,
                description=c.description,
                provider=c.provider,
                duration_hours=c.duration_hours,
                status=c.status,
                target_role=target_role,
                competencies=comp_codes,
                enrollments_count=enrollment_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return results


@router.post(
    "/courses/{course_id}/publish",
    response_model=CoursePublishResponse,
    summary="Approve and feed course to learner recommendations",
    description="Transitions a course to 'published' status, making it live in learner course recommendations.",
)
def publish_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> CoursePublishResponse:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' was not found.",
        )

    course.status = "published"
    db.commit()

    return CoursePublishResponse(
        id=course.id,
        title=course.title,
        status="published",
        message=f"Course '{course.title}' is now approved and active in the Learner section.",
    )


@router.post(
    "/courses/{course_id}/unpublish",
    response_model=CoursePublishResponse,
    summary="Unpublish course to draft status",
    description="Transitions a course from 'published' back to 'draft'.",
)
def unpublish_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_roles("trainer", "admin")),
    db: Session = Depends(get_db),
) -> CoursePublishResponse:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' was not found.",
        )

    course.status = "draft"
    db.commit()

    return CoursePublishResponse(
        id=course.id,
        title=course.title,
        status="draft",
        message=f"Course '{course.title}' moved to draft status.",
    )
