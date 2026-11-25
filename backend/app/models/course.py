"""
Course Catalogue and Enrollment Models
Covers courses, competency fulfillment mapping, and learner enrollments.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, SQLiteUUID, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.competency import Competency
    from app.models.user import User
    from app.models.quiz import Quiz
    from app.models.document import TrainingDocument


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 6: courses
    Training course catalogue for civil service capacity building.
    """
    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="ck_course_status",
        ),
        CheckConstraint("duration_hours > 0", name="ck_course_duration"),
    )

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        doc="Unique course identifier e.g. CRS-STAT-101",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Full course title",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Course syllabus, outcomes, and objectives",
    )
    provider: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="iGOT Karmayogi",
        index=True,
        doc="Training provider e.g. iGOT Karmayogi, ISTM, NIC",
    )
    duration_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        doc="Estimated training duration in hours",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="published",
        doc="Publishing status: draft, published, archived",
    )

    # Relationships
    course_competencies: Mapped[List["CourseCompetency"]] = relationship(
        "CourseCompetency",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment",
        back_populates="course",
    )
    quizzes: Mapped[List["Quiz"]] = relationship(
        "Quiz",
        back_populates="course",
    )
    modules: Mapped[List["CourseModule"]] = relationship(
        "CourseModule",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseModule.module_number.asc()",
    )

    def __repr__(self) -> str:
        return f"<Course(id={self.id}, code='{self.code}', title='{self.title}')>"


class CourseCompetency(Base, UUIDPrimaryKeyMixin):
    """Table 7: course_competencies
    Associates courses with the competencies they fulfill and target level achieved.
    """
    __tablename__ = "course_competencies"
    __table_args__ = (
        CheckConstraint(
            "target_level_achieved BETWEEN 1 AND 5",
            name="ck_course_competency_level",
        ),
        UniqueConstraint("course_id", "competency_id", name="uq_course_competency"),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_level_achieved: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        doc="Proficiency level delivered upon completion (1-5)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="course_competencies",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
        back_populates="course_competencies",
    )

    def __repr__(self) -> str:
        return f"<CourseCompetency(course={self.course_id}, comp={self.competency_id}, level={self.target_level_achieved})>"


class Enrollment(Base, UUIDPrimaryKeyMixin):
    """Table 8: enrollments
    Learner learning path and course enrollment tracking.
    """
    __tablename__ = "enrollments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('enrolled', 'in_progress', 'completed', 'dropped')",
            name="ck_enrollment_status",
        ),
        CheckConstraint(
            "progress_percentage BETWEEN 0 AND 100",
            name="ck_enrollment_progress",
        ),
        UniqueConstraint("user_id", "course_id", name="uq_user_course_enrollment"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("courses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="enrolled",
        doc="Status: enrolled, in_progress, completed, dropped",
    )
    progress_percentage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Completion percentage 0 to 100",
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of course completion",
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="enrollments",
    )
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="enrollments",
    )

    def __repr__(self) -> str:
        return f"<Enrollment(user={self.user_id}, course={self.course_id}, status='{self.status}', progress={self.progress_percentage}%)>"


class CourseModule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 14: course_modules
    Modular learning units for a course, containing title, description, duration,
    supporting video URL / file, study content/document reference, and publication status.
    """
    __tablename__ = "course_modules"
    __table_args__ = (
        CheckConstraint("module_number >= 1", name="ck_course_module_number"),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        doc="Sequential order of the module within the course",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Module title",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Module overview or syllabus notes",
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=20,
        doc="Estimated completion time in minutes",
    )
    video_url: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        doc="Supporting video file URL or stream link",
    )
    content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Extracted text or markdown learning material notes",
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        SQLiteUUID(),
        ForeignKey("training_documents.id", ondelete="SET NULL"),
        nullable=True,
        doc="Reference to uploaded training document if attached",
    )
    skills_covered: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        default=list,
        doc="Codes or names of skills/competencies addressed by this module",
    )
    is_published: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
        doc="Whether module is published and accessible to civil service learners",
    )

    # Relationships
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="modules",
    )
    document: Mapped[Optional["TrainingDocument"]] = relationship(
        "TrainingDocument",
    )

    def __repr__(self) -> str:
        return f"<CourseModule(id={self.id}, course_id={self.course_id}, num={self.module_number}, title='{self.title}')>"

