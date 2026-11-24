"""
Pydantic Schemas for AI Learning Assistant (Phase 7)
Strict request and response models with extra='forbid' to enforce security boundaries.
"""
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatQueryRequest(BaseModel):
    """Learner chat question request with optional course, competency, and document filters."""
    question: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Civil service learning question about authorized training materials",
        examples=["What are the core procurement rules under GeM?"],
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Optional client conversation session reference",
    )
    course_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional filter by specific course UUID",
    )
    competency_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional filter by public sector competency UUID",
    )
    document_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional filter to a specific authorized training document UUID",
    )
    top_k: Optional[int] = Field(
        default=None,
        ge=1,
        le=10,
        description="Number of relevant chunks to retrieve (1-10)",
    )

    model_config = ConfigDict(extra="forbid")


class ChatCourseItem(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    provider: str
    description: Optional[str] = None
    competencies: List[str] = []

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class SourceCitation(BaseModel):
    """Source reference connecting generated answer to an actual retrieved document chunk."""
    citation_id: str = Field(..., description="Citation marker e.g. [1]")
    document_id: uuid.UUID
    document_title: str
    chunk_id: uuid.UUID
    chunk_index: int
    page_number: Optional[int] = None
    excerpt: str = Field(..., description="Short supporting passage from the source chunk")
    similarity_score: float = Field(..., description="Semantic cosine similarity score")

    model_config = ConfigDict(extra="forbid")


class ChatAnswerResponse(BaseModel):
    """Verified grounded answer response delivered to the civil servant learner."""
    answer: str
    citations: List[SourceCitation] = Field(default_factory=list)
    is_grounded: bool = Field(
        ...,
        description="True if factual evidence was found; False if refused due to insufficient information",
    )
    refusal_reason: Optional[str] = Field(
        default=None,
        description="Reason code if refused, e.g. 'insufficient_evidence'",
    )
    retrieved_chunk_count: int = Field(default=0)

    model_config = ConfigDict(extra="forbid")


class SourcePassageResponse(BaseModel):
    """Full source passage details for expandable citation inspection."""
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    chunk_index: int
    token_count: int
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="forbid")


class ChatHealthResponse(BaseModel):
    """Safe readiness status of the AI Learning Assistant RAG pipeline."""
    status: str
    embedding_provider: str
    embedding_model: str
    embedding_dimensions: int
    llm_provider: str
    top_k: int
    similarity_threshold: float

    model_config = ConfigDict(extra="forbid")
