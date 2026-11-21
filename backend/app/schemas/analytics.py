"""
Analytics Schemas for SkillBridge AI (Phase 8)
Defines strict Pydantic models for executive KPIs, time-series telemetry, and departmental benchmarks.
"""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AdminExecutiveMetricsResponse(BaseModel):
    """Platform-wide capacity and governance indicators for executive administration."""
    total_learners: int = Field(..., description="Total registered civil service learners")
    active_learner_accounts: int = Field(
        ...,
        description="Total learner accounts with is_active=True (measures capacity, not study activity)",
    )
    total_trainers: int = Field(..., description="Total academy trainers and faculty authors")
    total_admins: int = Field(..., description="Total system administrators")
    total_courses: int = Field(..., description="Total courses in catalogue")
    published_courses: int = Field(..., description="Active published courses available for enrollment")
    total_documents: int = Field(..., description="Total uploaded training documents")
    published_documents: int = Field(..., description="Total published documents accessible to learners")
    total_quizzes: int = Field(..., description="Total diagnostic and course quizzes")
    published_quizzes: int = Field(..., description="Total published active quizzes")
    total_quiz_attempts: int = Field(..., description="Total recorded quiz attempts (including drafts)")
    completed_quiz_attempts: int = Field(..., description="Total finalized completed quiz attempts")
    average_assessment_score: float = Field(
        ...,
        description="Mean score percentage across finalized completed assessment attempts only",
    )
    quiz_pass_rate: float = Field(
        ...,
        description="Percentage of completed quiz attempts that met the passing mark",
    )
    course_completion_rate: float = Field(
        ...,
        description="Percentage of commenced enrollments that reached completed status",
    )
    overall_enrollments: int = Field(..., description="Total enrollment records")
    document_publication_ratio: float = Field(
        ...,
        description="Percentage of processed documents that have been published",
    )

    model_config = ConfigDict(extra="forbid")


class MonthlyTrendPoint(BaseModel):
    """Single calendar month data point for Recharts time-series telemetry."""
    month: str = Field(..., description="Calendar month formatted as YYYY-MM")
    registrations: int = Field(..., description="New learner account registrations in month")
    monthly_active_learners: int = Field(
        ...,
        description="Distinct active learners who submitted a quiz or completed a course module in month",
    )
    course_completions: int = Field(..., description="Total courses completed in month")
    quiz_attempts: int = Field(..., description="Completed assessment submissions in month")

    model_config = ConfigDict(extra="forbid")


class DepartmentCompetencyMetric(BaseModel):
    """Departmental competency proficiency and skill-gap telemetry."""
    department: str = Field(..., description="Government ministry or department name")
    total_learners: int = Field(..., description="Total assigned learners in department")
    active_learners: int = Field(..., description="Active learner accounts in department")
    assessed_learners: int = Field(
        ...,
        description="Learners in department who have completed at least one assessment",
    )
    assessment_coverage_pct: float = Field(
        ...,
        description="Percentage of department learners who have been assessed",
    )
    average_gap_score: float = Field(
        ...,
        description="Average skill gap score among assessed competency records only",
    )
    average_assessment_score: float = Field(
        ...,
        description="Mean assessment score for department officers across completed attempts",
    )
    top_deficit_competency: Optional[str] = Field(
        default=None,
        description="Competency code with the largest aggregate gap in this department",
    )

    model_config = ConfigDict(extra="forbid")


class AdminAnalyticsSummary(BaseModel):
    """Aggregated response containing executive metrics and health status."""
    metrics: AdminExecutiveMetricsResponse
    system_status: str = Field(default="healthy")

    model_config = ConfigDict(extra="forbid")
