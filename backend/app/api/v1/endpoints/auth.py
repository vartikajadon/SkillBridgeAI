"""
Authentication and User Profile Endpoints (Phase 2)
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import get_authenticated_identity, get_current_user, require_roles
from app.core.security import AuthenticatedIdentity
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.auth import (
    AdminUserUpdateRequest,
    ProfileCreateRequest,
    ProfileUpdateRequest,
    UserProfileResponse,
)

router = APIRouter()


@router.post(
    "/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision or complete application user profile (Learner only)",
    description=(
        "Links authenticated Supabase Auth identity (via verified JWT) to an application profile. "
        "Strictly enforces role = 'learner'. Safe to retry (idempotent)."
    ),
)
async def create_profile(
    profile_in: ProfileCreateRequest,
    identity: AuthenticatedIdentity = Depends(get_authenticated_identity),
    db: Session = Depends(get_db),
):
    # 1. Check if profile already exists for this Supabase user (Idempotent Recovery)
    existing_user = db.query(User).filter(User.id == identity.sub).first()
    if existing_user:
        return existing_user

    # 2. Ensure email is present
    user_email = identity.email
    if not user_email:
        # Fallback to claim or fail
        user_email = identity.claims.get("email")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authenticated token does not contain a verified email address",
        )

    # 3. Check for uniqueness conflicts before inserting
    if db.query(User).filter(User.email == user_email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{user_email}' is already registered in the application.",
        )

    if profile_in.employee_id:
        if db.query(User).filter(User.employee_id == profile_in.employee_id).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee ID '{profile_in.employee_id}' is already registered to another user.",
            )

    # 4. Construct and insert application profile (role is STRICTLY 'learner')
    new_user = User(
        id=identity.sub,
        email=user_email,
        full_name=profile_in.full_name,
        role="learner",  # Strictly enforce learner role for public onboarding
        department=profile_in.department,
        designation=profile_in.designation,
        employee_id=profile_in.employee_id,
        is_active=True,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile creation failed due to a database constraint conflict. Please verify your details.",
        )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get authenticated user profile",
    description="Returns profile and verified application role of currently authenticated civil servant.",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch(
    "/me",
    response_model=UserProfileResponse,
    summary="Update authenticated user profile (Self-service allowlist)",
    description=(
        "Updates self-service profile attributes (full_name, department, designation). "
        "Privileged fields such as role, is_active, job_role_id, and employee_id cannot be modified."
    ),
)
async def update_my_profile(
    profile_update: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name
    if profile_update.department is not None:
        current_user.department = profile_update.department
    if profile_update.designation is not None:
        current_user.designation = profile_update.designation

    db.commit()
    db.refresh(current_user)
    return current_user


# ------------------------------------------------------------------------------
# Administrative User Management (Admin Only)
# ------------------------------------------------------------------------------
@router.get(
    "/admin/users",
    response_model=List[UserProfileResponse],
    summary="List all application users (Admin only)",
    description="Administrative listing of civil servant profiles, roles, and activation statuses.",
)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.patch(
    "/admin/users/{user_id}",
    response_model=UserProfileResponse,
    summary="Admin role elevation and account management (Admin only)",
    description="Allows administrators to elevate users to trainer, assign job roles, or deactivate accounts.",
)
async def admin_update_user(
    user_id: uuid.UUID,
    admin_update: AdminUserUpdateRequest,
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found",
        )

    # Apply admin updates
    if admin_update.role is not None:
        target_user.role = admin_update.role
    if admin_update.is_active is not None:
        target_user.is_active = admin_update.is_active
    if admin_update.job_role_id is not None:
        target_user.job_role_id = admin_update.job_role_id
    if admin_update.employee_id is not None:
        target_user.employee_id = admin_update.employee_id
    if admin_update.department is not None:
        target_user.department = admin_update.department
    if admin_update.designation is not None:
        target_user.designation = admin_update.designation

    # Audit the admin action
    audit = AuditLog(
        actor_id=admin.id,
        action="ADMIN_USER_UPDATE",
        entity_type="users",
        entity_id=str(target_user.id),
        details={
            "updated_fields": admin_update.model_dump(exclude_unset=True),
            "admin_email": admin.email,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(target_user)
    return target_user
