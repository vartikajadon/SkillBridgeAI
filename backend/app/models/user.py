"""
User Model
Decoupled application user profile mapping 1:1 with Supabase auth.users.
"""
import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import CheckConstraint, ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, SQLiteUUID, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.job_role import JobRole
    from app.models.competency import LearnerCompetency
    from app.models.course import Enrollment
    from app.models.document import TrainingDocument
    from app.models.quiz import QuizAttempt


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 1: users
    Civil servant profile record.
    Matches Supabase auth.users id. No plaintext passwords stored.
    """
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('learner', 'trainer', 'admin')", name="ck_user_role"),
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="Government official email address",
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Full legal name of the employee",
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="learner",
        index=True,
        doc="Access role: learner, trainer, admin",
    )
    department: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Assigned department or ministry",
    )
    designation: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Official designation e.g. Assistant Director",
    )
    employee_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
        doc="Official civil service employee identification code",
    )
    job_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        SQLiteUUID(),
        ForeignKey("job_roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Current job role assignment",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether user account is active",
    )

    # Relationships
    job_role: Mapped[Optional["JobRole"]] = relationship(
        "JobRole",
        back_populates="users",
    )
    learner_competencies: Mapped[List["LearnerCompetency"]] = relationship(
        "LearnerCompetency",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    uploaded_documents: Mapped[List["TrainingDocument"]] = relationship(
        "TrainingDocument",
        back_populates="uploader",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
