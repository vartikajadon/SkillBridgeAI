"""
Chat & AI Learning Assistant Endpoints (Phase 7)
Provides grounded Q&A over authorized public sector training materials with verifiable source citations.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.course import Course
from app.models.document import DocumentChunk, TrainingDocument
from app.models.user import User
from app.schemas.chat import (
    ChatAnswerResponse,
    ChatCourseItem,
    ChatHealthResponse,
    ChatQueryRequest,
    SourceCitation,
    SourcePassageResponse,
)
from app.services.embedding_service import get_embedding_service
from app.services.rag_service import get_rag_service
from app.services.retrieval_service import RetrievedChunk, get_retrieval_service

router = APIRouter()


@router.get(
    "/courses",
    response_model=List[ChatCourseItem],
    summary="List available courses for AI learning assistant",
    description="Returns published courses with metadata so learners can select a course focus for the AI assistant.",
)
def list_chat_courses(
    current_user: User = Depends(require_roles("learner", "trainer", "admin")),
    db: Session = Depends(get_db),
) -> List[ChatCourseItem]:
    courses = db.query(Course).filter(Course.status == "published").order_by(Course.code.asc()).all()
    results = []
    for c in courses:
        comp_names = [cc.competency.name for cc in c.course_competencies if cc.competency]
        results.append(
            ChatCourseItem(
                id=c.id,
                code=c.code,
                title=c.title,
                provider=c.provider,
                description=c.description,
                competencies=comp_names,
            )
        )
    return results


@router.post(
    "/ask",
    response_model=ChatAnswerResponse,
    summary="Submit question to the AI Learning Assistant",
    description="Retrieves authorized document chunks and synthesizes a grounded answer with citations.",
)
async def ask_question(
    query_in: ChatQueryRequest,
    current_user: User = Depends(require_roles("learner", "trainer", "admin")),
    db: Session = Depends(get_db),
):
    # 1. If document_id filter is provided, verify it is published and accessible
    if query_in.document_id:
        doc = (
            db.query(TrainingDocument)
            .filter(TrainingDocument.id == query_in.document_id)
            .first()
        )
        if not doc or (not doc.is_published and current_user.role == "learner"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Requested document filter '{query_in.document_id}' is not available or unpublished.",
            )

    target_course = None
    course_competency_ids = []
    if query_in.course_id:
        target_course = db.query(Course).filter(Course.id == query_in.course_id).first()
        if target_course:
            course_competency_ids = [cc.competency_id for cc in target_course.course_competencies if cc.competency_id]

    # 2. Semantic retrieval of authorized chunks
    retrieval_svc = get_retrieval_service()
    filter_comp_id = query_in.competency_id
    if not filter_comp_id and course_competency_ids:
        # Prioritize competency of selected course if not explicitly set
        filter_comp_id = course_competency_ids[0]

    chunks = retrieval_svc.retrieve(
        db=db,
        question=query_in.question,
        top_k=query_in.top_k,
        competency_id=filter_comp_id,
        document_id=query_in.document_id,
    )

    # If course is selected, prepend anchor course syllabus chunk so AI has explicit course context
    if target_course:
        comp_names = [cc.competency.name for cc in target_course.course_competencies if cc.competency]
        curriculum_text = (
            f"Official Course Curriculum: {target_course.title} (Course Code: {target_course.code}). "
            f"Provider: {target_course.provider}. "
            f"Course Overview & Key Topics: {target_course.description} "
            f"Core Competencies Taught: {', '.join(comp_names) if comp_names else 'General Administration'}."
        )
        course_chunk = RetrievedChunk(
            chunk_id=uuid.uuid5(uuid.NAMESPACE_DNS, f"course-{target_course.id}"),
            document_id=target_course.id,
            document_title=f"Curriculum: {target_course.code} - {target_course.title}",
            chunk_index=0,
            chunk_text=curriculum_text,
            token_count=100,
            similarity_score=0.98,
            metadata_json={"section": "Official Course Curriculum & Guidelines", "page_number": 1},
        )
        chunks = [course_chunk] + [c for c in chunks if c.chunk_text != curriculum_text]

    # 3. Grounded answer generation and citation verification
    rag_svc = get_rag_service()
    result = rag_svc.generate(
        question=query_in.question,
        retrieved_chunks=chunks,
    )

    # 4. Map citations to Pydantic schema
    schema_citations: List[SourceCitation] = [
        SourceCitation(
            citation_id=c.citation_id,
            document_id=c.document_id,
            document_title=c.document_title,
            chunk_id=c.chunk_id,
            chunk_index=c.chunk_index,
            page_number=c.page_number,
            excerpt=c.excerpt,
            similarity_score=c.similarity_score,
        )
        for c in result.citations
    ]

    return ChatAnswerResponse(
        answer=result.answer,
        citations=schema_citations,
        is_grounded=result.is_grounded,
        refusal_reason=result.refusal_reason,
        retrieved_chunk_count=result.retrieved_chunk_count,
    )


@router.get(
    "/sources/{chunk_id}",
    response_model=SourcePassageResponse,
    summary="Inspect full source chunk passage",
    description="Returns the full text passage for a citation after verifying learner authorization.",
)
async def get_source_chunk(
    chunk_id: uuid.UUID,
    current_user: User = Depends(require_roles("learner", "trainer", "admin")),
    db: Session = Depends(get_db),
):
    chunk = (
        db.query(DocumentChunk, TrainingDocument)
        .join(TrainingDocument, DocumentChunk.document_id == TrainingDocument.id)
        .filter(DocumentChunk.id == chunk_id)
        .first()
    )

    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source chunk not found.",
        )

    chunk_obj, doc_obj = chunk

    # Authorization Check: Learners cannot view chunks from unpublished/private documents
    if current_user.role == "learner" and not doc_obj.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source chunk belongs to an unpublished training document.",
        )

    # Trainers can view published documents or their own uploaded documents
    if current_user.role == "trainer" and not doc_obj.is_published and doc_obj.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source chunk not accessible.",
        )

    return SourcePassageResponse(
        chunk_id=chunk_obj.id,
        document_id=doc_obj.id,
        document_title=doc_obj.title,
        chunk_index=chunk_obj.chunk_index,
        token_count=chunk_obj.token_count,
        content=chunk_obj.chunk_text,
        metadata=chunk_obj.metadata_json or {},
    )


@router.get(
    "/health",
    response_model=ChatHealthResponse,
    summary="Get RAG Assistant pipeline status",
    description="Returns service readiness and configured embedding and LLM models without exposing secrets.",
)
async def get_chat_health():
    emb_svc = get_embedding_service()
    return ChatHealthResponse(
        status="ready",
        embedding_provider=(settings.EMBEDDING_PROVIDER or "mock"),
        embedding_model=emb_svc.model_name,
        embedding_dimensions=emb_svc.dimensions,
        llm_provider=(settings.RAG_LLM_PROVIDER or "mock"),
        top_k=settings.RAG_TOP_K,
        similarity_threshold=settings.RAG_SIMILARITY_THRESHOLD,
    )
