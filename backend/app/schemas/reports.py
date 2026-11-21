"""
Report Schemas for SkillBridge AI (Phase 8)
Defines query filter parameters and structured metadata for administrative and self-service exports.
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ReportFilterParams(BaseModel):
    """Query parameter model for filtering tabular and PDF reports."""
    format: str = Field("csv", pattern="^(csv|pdf)$", description="Export format: csv or pdf")
    department: Optional[str] = Field(None, description="Optional department filter")
    competency_id: Optional[uuid.UUID] = Field(None, description="Optional competency filter")
    quiz_id: Optional[uuid.UUID] = Field(None, description="Optional quiz filter")
    user_id: Optional[uuid.UUID] = Field(None, description="Target learner UUID (for transcript)")
    start_date: Optional[datetime] = Field(None, description="Filter records starting from UTC datetime")
    end_date: Optional[datetime] = Field(None, description="Filter records up to UTC datetime")

    model_config = ConfigDict(extra="forbid")


class ReportAuditSummary(BaseModel):
    """Confirmation payload returned when a report export is scheduled or logged."""
    report_name: str
    export_format: str
    requested_by: str
    timestamp: datetime
    record_count: int

    model_config = ConfigDict(extra="forbid")
