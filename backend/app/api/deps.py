"""
FastAPI Authentication & RBAC Dependencies
Separates verified identity extraction from application profile lookup.
"""
from typing import Callable, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.security import AuthenticatedIdentity, jwt_verifier
from app.db.session import get_db
from app.models.user import User

# Bearer token extractor
oauth2_scheme = HTTPBearer(auto_error=True)


def get_authenticated_identity(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
) -> AuthenticatedIdentity:
    """Dependency 1: Verifies the Supabase JWT and extracts the authenticated identity.
    Does NOT require a corresponding row in public.users.
    Used for POST /api/v1/auth/profile to avoid the first-time profile creation circular dependency.
    """
    token = credentials.credentials
    return jwt_verifier.verify(token)


def get_current_user(
    identity: AuthenticatedIdentity = Depends(get_authenticated_identity),
    db: Session = Depends(get_db),
) -> User:
    """Dependency 2: Uses verified identity to retrieve existing application user profile.
    Checks that the user exists in public.users and is active.
    Used for standard authenticated endpoints.
    """
    user = db.query(User).filter(User.id == identity.sub).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application user profile not found. Please complete profile registration.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact your system administrator.",
        )
    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency 3 Factory: Enforces server-side Role-Based Access Control (RBAC).
    Never trusts client-supplied roles; strictly inspects the verified database profile.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access forbidden: role '{current_user.role}' is not authorized for this resource. "
                    f"Required: {', '.join(allowed_roles)}"
                ),
            )
        return current_user

    return role_checker
