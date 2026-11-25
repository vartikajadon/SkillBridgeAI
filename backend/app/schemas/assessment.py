"""
Assessment & Skill Gap Analysis Pydantic Schemas (Phase 4)
Strict request and response schemas for diagnostic quizzes, answer submissions,
competency evaluations, historical attempts, and skill-gap ledgers.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 1. Assessment Catalogue Schemas
# -----------------------------------------------------------------------------

class AssessmentCatalogueItem(BaseModel):
    id: uuid.UUID
    title: str
    course_id: Optional[uuid.UUID] = None
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    total_marks: int
    passing_marks: int
    question_count: int
    duration_minutes: int
    competencies_evaluated: List[str] = Field(default_factory=list)
    completed_attempts_count: int = 0
    last_attempt_score: Optional[int] = None
    last_attempt_percentage: Optional[float] = None
    last_attempt_passed: Optional[bool] = None
    course_progress_percentage: Optional[int] = None
    course_completed: bool = False
    is_locked: bool = False
    lock_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 2. Assessment Intake / Question Delivery (Sanitized)
# -----------------------------------------------------------------------------

class SanitizedQuestion(BaseModel):
    id: str
    prompt: str
    options: List[str]
    points: float
    difficulty_level: int
    competency_code: str

    model_config = ConfigDict(extra="forbid")


class AssessmentDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    course_id: Optional[uuid.UUID] = None
    course_title: Optional[str] = None
    total_marks: int
    passing_marks: int
    question_count: int
    duration_minutes: int
    questions: List[SanitizedQuestion]

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 3. Assessment Submission Request
# -----------------------------------------------------------------------------

class AssessmentSubmitRequest(BaseModel):
    """Client submission payload mapping question IDs to selected option indices.
    Strictly forbids client-submitted scores, levels, or extra fields.
    """
    answers: Dict[str, Optional[int]] = Field(
        ...,
        description="Dictionary mapping question IDs to 0-based selected option indices (or null if unanswered)",
    )

    model_config = ConfigDict(extra="forbid")


# -----------------------------------------------------------------------------
# 4. Assessment Evaluation / Results
# -----------------------------------------------------------------------------

class EvaluatedQuestionItem(BaseModel):
    question_id: str
    competency_code: str
    prompt: str
    options: List[str]
    selected_index: Optional[int]
    correct_index: int
    is_correct: bool
    points_earned: float
    max_points: float
    difficulty_level: int
    explanation: Optional[str] = None


class CompetencyPerformanceItem(BaseModel):
    competency_code: str
    competency_name: str
    earned_points: float
    total_points: float
    percentage: float
    current_level: int
    target_level: Optional[int] = None
    gap_score: Optional[int] = None
    criticality: Optional[str] = None
    is_strength: bool = False
    is_priority: bool = False
    questions_evaluated: int = 0


class AssessmentResultResponse(BaseModel):
    attempt_id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    total_score: float
    max_score: float
    percentage: float
    passed: bool
    passing_marks: float
    submitted_at: datetime
    questions: List[EvaluatedQuestionItem]
    competency_results: List[CompetencyPerformanceItem]
    strengths: List[CompetencyPerformanceItem]
    priorities: List[CompetencyPerformanceItem]


# -----------------------------------------------------------------------------
# 5. Assessment History
# -----------------------------------------------------------------------------

class AssessmentHistoryItem(BaseModel):
    attempt_id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    score: int
    percentage: float
    passed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 6. Skill Gap Analysis Ledger
# -----------------------------------------------------------------------------

class SkillGapItem(BaseModel):
    competency_id: uuid.UUID
    competency_code: str
    competency_name: str
    category: str
    current_level: Optional[int] = None  # None if unassessed
    target_level: int
    gap_score: Optional[int] = None      # None if unassessed
    criticality: str                     # "Mandatory" or "Desirable"
    status: str                          # "Strength", "Priority", or "Unassessed"
    last_assessed_at: Optional[datetime] = None


class SkillGapAnalysisResponse(BaseModel):
    job_role_title: Optional[str] = None
    job_role_code: Optional[str] = None
    department: Optional[str] = None
    total_competencies_tracked: int = 0
    strengths_count: int = 0
    priorities_count: int = 0
    average_gap_score: float = 0.0
    competencies: List[SkillGapItem] = Field(default_factory=list)
    strengths: List[SkillGapItem] = Field(default_factory=list)
    priorities: List[SkillGapItem] = Field(default_factory=list)
