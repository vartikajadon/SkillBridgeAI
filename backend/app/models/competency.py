"""
Competencies and Skill Mapping Models
Implements competency framework, role target levels, and learner skill gaps.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, SQLiteUUID, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.job_role import JobRole
    from app.models.user import User
    from app.models.course import CourseCompetency
    from app.models.quiz import Quiz


class Competency(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 3: competencies
    Standardized skill & capability dictionary with 1-5 proficiency rubrics.
    """
    __tablename__ = "competencies"
    __table_args__ = (
        CheckConstraint(
            "category IN ('Technical', 'Domain', 'Behavioral')",
            name="ck_competency_category",
        ),
    )

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        doc="Standard competency code e.g. STAT_ANALYSIS",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Human readable competency name",
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Category: Technical, Domain, or Behavioral",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Competency scope and proficiency descriptions",
    )

    # Relationships
    role_competencies: Mapped[List["RoleCompetency"]] = relationship(
        "RoleCompetency",
        back_populates="competency",
        cascade="all, delete-orphan",
    )
    learner_competencies: Mapped[List["LearnerCompetency"]] = relationship(
        "LearnerCompetency",
        back_populates="competency",
    )
    course_competencies: Mapped[List["CourseCompetency"]] = relationship(
        "CourseCompetency",
        back_populates="competency",
        cascade="all, delete-orphan",
    )
    quizzes: Mapped[List["Quiz"]] = relationship(
        "Quiz",
        back_populates="competency",
    )

    def __repr__(self) -> str:
        return f"<Competency(id={self.id}, code='{self.code}', name='{self.name}')>"


class RoleCompetency(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 4: role_competencies
    Defines mandatory target competency levels (1-5) required for a job role.
    """
    __tablename__ = "role_competencies"
    __table_args__ = (
        CheckConstraint("target_level BETWEEN 1 AND 5", name="ck_role_target_level"),
        CheckConstraint(
            "criticality IN ('Mandatory', 'Desirable')",
            name="ck_role_competency_criticality",
        ),
        UniqueConstraint("job_role_id", "competency_id", name="uq_role_competency"),
    )

    job_role_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("job_roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Required mastery level: 1 (Foundational) to 5 (Mastery)",
    )
    criticality: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Mandatory",
        doc="Priority weighting: Mandatory or Desirable",
    )

    # Relationships
    job_role: Mapped["JobRole"] = relationship(
        "JobRole",
        back_populates="role_competencies",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
        back_populates="role_competencies",
    )

    def __repr__(self) -> str:
        return f"<RoleCompetency(role={self.job_role_id}, comp={self.competency_id}, target={self.target_level})>"


class LearnerCompetency(Base, UUIDPrimaryKeyMixin):
    """Table 5: learner_competencies
    Real-time competency ledger. Tracks current evaluated level and skill gap (target - current).
    """
    __tablename__ = "learner_competencies"
    __table_args__ = (
        CheckConstraint("current_level BETWEEN 1 AND 5", name="ck_learner_current_level"),
        CheckConstraint("target_level BETWEEN 1 AND 5", name="ck_learner_target_level"),
        UniqueConstraint("user_id", "competency_id", name="uq_learner_competency"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("competencies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    current_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        doc="Current verified proficiency level (1-5)",
    )
    target_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        doc="Target benchmark required for assigned role (1-5)",
    )
    gap_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Calculated skill gap: target_level - current_level",
    )
    last_assessed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when this competency was last assessed",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="learner_competencies",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
        back_populates="learner_competencies",
    )

    def calculate_gap(self) -> int:
        """Helper to compute skill gap score (clamped at 0 minimum)."""
        self.gap_score = max(0, self.target_level - self.current_level)
        return self.gap_score

    def __repr__(self) -> str:
        return f"<LearnerCompetency(user={self.user_id}, comp={self.competency_id}, current={self.current_level}, target={self.target_level}, gap={self.gap_score})>"
