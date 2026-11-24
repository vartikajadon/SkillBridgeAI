"""
Authentication and User Profile Pydantic Schemas (Phase 2)
Uses strict ConfigDict(extra="forbid") to reject unapproved or malicious fields.
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfileCreateRequest(BaseModel):
    """Initial post-signup profile completion request.
    Role is NEVER accepted from client input; the backend strictly enforces role = 'learner'.
    """
    full_name: str = Field(..., min_length=2, max_length=255, description="Full legal name of the employee")
    department: Optional[str] = Field(None, max_length=255, description="Ministry or Department")
    designation: Optional[str] = Field(None, max_length=255, description="Official job title / rank")
    employee_id: Optional[str] = Field(None, max_length=100, description="Civil service employee ID")

    model_config = ConfigDict(extra="forbid")


class UserRegisterRequest(BaseModel):
    """Self-service registration request for new Learner accounts."""
    email: EmailStr = Field(..., description="Government/Civil service email address")
    password: Optional[str] = Field(None, min_length=6, description="Account password")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full legal name")
    department: Optional[str] = Field(None, max_length=255, description="Ministry or Department")
    designation: Optional[str] = Field(None, max_length=255, description="Official rank / designation")
    employee_id: Optional[str] = Field(None, max_length=100, description="Civil service employee ID")

    model_config = ConfigDict(extra="forbid")


class ProfileUpdateRequest(BaseModel):
    """Self-service profile update allowlist.
    Learners/Trainers can only edit basic non-privileged profile information.
    Attempts to modify id, role, is_active, job_role_id, or employee_id are strictly rejected.
    """
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    designation: Optional[str] = Field(None, max_length=255)

    model_config = ConfigDict(extra="forbid")


class AdminUserUpdateRequest(BaseModel):
    """Administrative user management request (Admin only)."""
    role: Optional[str] = Field(None, pattern="^(learner|trainer|admin)$")
    is_active: Optional[bool] = None
    job_role_id: Optional[uuid.UUID] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class JobRoleSummary(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    department: str

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    """Full user profile response."""
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    job_role_id: Optional[uuid.UUID] = None
    job_role: Optional[JobRoleSummary] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
