"""
Job Roles Model
Defines official government job designations and tracks.
"""
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.competency import RoleCompetency


class JobRole(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 2: job_roles
    Represents standardized public sector roles (e.g. Data Analyst, Survey Officer).
    """
    __tablename__ = "job_roles"

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        doc="Unique code e.g. DATA_ANALYST, SURVEY_OFFICER",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Official job title",
    )
    department: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        doc="Department or Ministry",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Detailed responsibilities and scope",
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="job_role",
        cascade="all, delete-orphan",
    )
    role_competencies: Mapped[List["RoleCompetency"]] = relationship(
        "RoleCompetency",
        back_populates="job_role",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<JobRole(id={self.id}, code='{self.code}', title='{self.title}')>"
