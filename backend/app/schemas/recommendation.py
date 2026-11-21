"""
Recommendation Engine & Learning Path Pydantic Schemas (Phase 5)
Strict request and response schemas for personalized course recommendations,
step-wise learning paths, and course enrollment actions.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 1. Competency Addressed Schemas
# -----------------------------------------------------------------------------

class CompetencyAddressedItem(BaseModel):
    competency_id: uuid.UUID
    code: str
    name: str
    current_level: Optional[int] = None
    target_level: int
    gap_score: int
    target_level_achieved: int
    criticality: str = "Mandatory"

    model_config = ConfigDict(extra="forbid", from_attributes=True)


# -----------------------------------------------------------------------------
# 2. Course Recommendation Item & Response
# -----------------------------------------------------------------------------

class CourseRecommendationItem(BaseModel):
    course_id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    provider: str
    duration_hours: int
    status: str
    relevance_score: float
    priority: str = Field(description="'High', 'Medium', or 'Low'")
    reason: str
    competencies_addressed: List[CompetencyAddressedItem] = Field(default_factory=list)
    is_enrolled: bool = False
    enrollment_status: Optional[str] = None
    progress_percentage: Optional[int] = None

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class CourseRecommendationsResponse(BaseModel):
    learner_id: uuid.UUID
    job_role_title: Optional[str] = None
    total_gaps_identified: int = 0
    recommendations: List[CourseRecommendationItem] = Field(default_factory=list)
    summary_reason: str

    model_config = ConfigDict(extra="forbid", from_attributes=True)


# -----------------------------------------------------------------------------
# 3. Learning Path Schemas
# -----------------------------------------------------------------------------

class LearningPathStepItem(BaseModel):
    step_number: int
    course_id: uuid.UUID
    code: str
    title: str
    provider: str
    duration_hours: int
    target_level_achieved: int
    priority: str
    relevance_score: float
    reason: str
    competencies_addressed: List[str] = Field(default_factory=list)
    is_enrolled: bool = False
    enrollment_status: Optional[str] = None
    progress_percentage: Optional[int] = None

    model_config = ConfigDict(extra="forbid", from_attributes=True)


class LearningPathResponse(BaseModel):
    learner_id: uuid.UUID
    job_role_title: Optional[str] = None
    total_steps: int = 0
    total_estimated_hours: int = 0
    steps: List[LearningPathStepItem] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid", from_attributes=True)


# -----------------------------------------------------------------------------
# 4. Enrollment Action Schemas
# -----------------------------------------------------------------------------

class EnrollmentCreateResponse(BaseModel):
    enrollment_id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    status: str
    progress_percentage: int
    enrolled_at: datetime
    message: str

    model_config = ConfigDict(extra="forbid", from_attributes=True)
