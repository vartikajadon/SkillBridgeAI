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

class TrainerCompetencyItem(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    category: str
    description: Optional[str] = None

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    title: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    chunk_count: int
    is_published: bool = False
    competency_id: Optional[uuid.UUID] = None
    competency_code: Optional[str] = None
    competency_name: Optional[str] = None
    embedding_model: Optional[str] = None
    embedding_dim: Optional[int] = None
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
    is_published: bool = False
    competency_id: Optional[uuid.UUID] = None
    competency_code: Optional[str] = None
    competency_name: Optional[str] = None
    embedding_model: Optional[str] = None
    embedding_dim: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class DocumentPublishResponse(BaseModel):
    id: uuid.UUID
    title: str
    is_published: bool
    status: str
    chunks_embedded: int
    message: str

    model_config = ConfigDict(extra="forbid")


class TrainerCourseModuleItem(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_code: str
    course_title: str
    module_number: int
    title: str
    description: Optional[str] = None
    duration_minutes: int = 20
    video_url: Optional[str] = None
    content: Optional[str] = None
    document_id: Optional[uuid.UUID] = None
    document_title: Optional[str] = None
    skills_covered: List[str] = Field(default_factory=list)
    is_published: bool = True
    created_at: datetime

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class ModulePublishResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    module_number: int
    title: str
    is_published: bool
    message: str

    model_config = ConfigDict(extra="forbid")


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


# -----------------------------------------------------------------------------
# 4. Course Management & Publishing Schemas
# -----------------------------------------------------------------------------

class TrainerCourseItem(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    provider: str
    duration_hours: int
    status: str
    target_role: Optional[str] = None
    competencies: List[str] = []
    enrollments_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class CoursePublishResponse(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    message: str

    model_config = ConfigDict(extra="forbid", from_attributes=True)

