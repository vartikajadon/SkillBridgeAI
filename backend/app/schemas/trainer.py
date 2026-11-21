"""
Trainer & Faculty Management Pydantic Schemas (Phase 6)
Strict schemas for document ingestion, AI quiz synthesis, quiz editing, and publishing workflows.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 1. Document Ingestion Schemas
# -----------------------------------------------------------------------------

class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    title: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class TrainerDocumentItem(BaseModel):
    id: uuid.UUID
    title: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(extra="forbid", from_attributes=True)


# -----------------------------------------------------------------------------
# 2. AI Quiz Generation Request & Responses
# -----------------------------------------------------------------------------

class QuizGenerateRequest(BaseModel):
    document_id: uuid.UUID
    title: str = Field(..., min_length=3, max_length=255)
    competency_id: Optional[uuid.UUID] = None
    competency_code: Optional[str] = None
    question_count: int = Field(default=5, ge=1, le=20)
    difficulty_level: int = Field(default=3, ge=1, le=5)
    passing_marks: int = Field(default=60, ge=1)
    total_marks: int = Field(default=100, ge=1)

    model_config = ConfigDict(extra="forbid")


class QuizUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    total_marks: Optional[int] = Field(None, ge=1)
    passing_marks: Optional[int] = Field(None, ge=1)
    questions: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(extra="forbid")


class TrainerQuizDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    competency_id: Optional[uuid.UUID] = None
    competency_code: Optional[str] = None
    total_marks: int
    passing_marks: int
    question_count: int
    created_at: datetime
    updated_at: datetime
    questions: List[Dict[str, Any]]
    attempts_count: int = 0

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class TrainerQuizListItem(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    competency_code: Optional[str] = None
    total_marks: int
    passing_marks: int
    question_count: int
    attempts_count: int
    pass_rate: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class QuizPublishResponse(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    message: str

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class QuizDeleteResponse(BaseModel):
    id: uuid.UUID
    message: str
    status: str

    model_config = ConfigDict(extra="forbid", from_attributes=True)
