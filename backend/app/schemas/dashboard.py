"""
Dashboard Pydantic Schemas (Phase 3)
Strict response models for role-based dashboard endpoints.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# Learner Dashboard Schemas
# -----------------------------------------------------------------------------

class EnrolledCourseItem(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    code: str
    provider: str
    duration_hours: int
    status: str
    progress_percentage: int
    enrolled_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LearnerCompetencyItem(BaseModel):
    id: uuid.UUID
    competency_id: uuid.UUID
    name: str
    code: str
    category: str
    current_level: int
    target_level: int
    gap_score: int
    last_assessed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LearnerQuizAttemptItem(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    score: int
    percentage: float
    passed: bool
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LearnerSummaryMetrics(BaseModel):
    enrolled_courses_count: int = 0
    completed_courses_count: int = 0
    in_progress_courses_count: int = 0
    average_progress: float = 0.0
    total_quizzes_taken: int = 0
    average_quiz_score: float = 0.0
    competencies_assessed_count: int = 0
    average_gap_score: float = 0.0


class LearnerDashboardResponse(BaseModel):
    summary: LearnerSummaryMetrics
    enrolled_courses: List[EnrolledCourseItem] = []
    competencies: List[LearnerCompetencyItem] = []
    recent_quiz_attempts: List[LearnerQuizAttemptItem] = []


# -----------------------------------------------------------------------------
# Trainer Dashboard Schemas
# -----------------------------------------------------------------------------

class TrainerDocumentItem(BaseModel):
    id: uuid.UUID
    title: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrainerQuizItem(BaseModel):
    id: uuid.UUID
    title: str
    course_title: Optional[str] = None
    competency_name: Optional[str] = None
    total_marks: int
    passing_marks: int
    question_count: int = 0
    attempts_count: int = 0
    pass_rate: float = 0.0
    average_score: float = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrainerLearnerAttemptItem(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    learner_name: str
    learner_email: str
    score: int
    percentage: float
    passed: bool
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TrainerSummaryMetrics(BaseModel):
    total_documents_uploaded: int = 0
    processed_documents_count: int = 0
    total_quizzes_created: int = 0
    total_attempts_received: int = 0
    average_pass_rate: float = 0.0


class TrainerDashboardResponse(BaseModel):
    summary: TrainerSummaryMetrics
    documents: List[TrainerDocumentItem] = []
    quizzes: List[TrainerQuizItem] = []
    recent_attempts: List[TrainerLearnerAttemptItem] = []


# -----------------------------------------------------------------------------
# Admin Dashboard Schemas
# -----------------------------------------------------------------------------

class SystemHealth(BaseModel):
    database_status: str
    server_time: datetime
    version: str = "1.0.0"


class DepartmentUserCount(BaseModel):
    department: str
    user_count: int


class AdminAuditLogItem(BaseModel):
    id: uuid.UUID
    actor_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminSummaryMetrics(BaseModel):
    total_users: int = 0
    learners_count: int = 0
    trainers_count: int = 0
    admins_count: int = 0
    active_users_count: int = 0
    total_courses: int = 0
    total_quizzes: int = 0
    total_documents: int = 0
    total_enrollments: int = 0


class AdminDashboardResponse(BaseModel):
    summary: AdminSummaryMetrics
    health: SystemHealth
    departments: List[DepartmentUserCount] = []
    recent_audit_logs: List[AdminAuditLogItem] = []
