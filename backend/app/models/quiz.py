"""
Quizzes and Quiz Attempts Models
Handles AI-generated quizzes, questions, learner answers, and diagnostic feedback.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, SQLiteUUID, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.competency import Competency
    from app.models.course import Course
    from app.models.user import User


class Quiz(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 11: quizzes
    AI-generated or trainer-curated skill assessment quizzes.
    """
    __tablename__ = "quizzes"
    __table_args__ = (
        CheckConstraint("total_marks > 0", name="ck_quiz_total_marks"),
        CheckConstraint(
            "passing_marks >= 0 AND passing_marks <= total_marks",
            name="ck_quiz_passing_marks",
        ),
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Quiz title or evaluation name",
    )
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        SQLiteUUID(),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Associated course (if course-specific)",
    )
    competency_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        SQLiteUUID(),
        ForeignKey("competencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target competency evaluated",
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        SQLiteUUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Trainer or admin author",
    )
    total_marks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,
        doc="Total maximum score attainable",
    )
    passing_marks: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=60,
        doc="Benchmark score needed to pass",
    )
    questions: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        doc="Array of structured question objects: prompt, options, rubric, correct_answer",
    )

    # Relationships
    course: Mapped[Optional["Course"]] = relationship(
        "Course",
        back_populates="quizzes",
    )
    competency: Mapped[Optional["Competency"]] = relationship(
        "Competency",
        back_populates="quizzes",
    )
    attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Quiz(id={self.id}, title='{self.title}', total_marks={self.total_marks})>"


class QuizAttempt(Base, UUIDPrimaryKeyMixin):
    """Table 12: quiz_attempts
    Learner assessment submissions, evaluated scores, and AI diagnostic feedback.
    """
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        CheckConstraint("score >= 0", name="ck_attempt_score_positive"),
        CheckConstraint("percentage >= 0.0 AND percentage <= 100.0", name="ck_attempt_percentage"),
    )

    quiz_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("quizzes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Calculated numeric score",
    )
    percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        doc="Calculated percentage (0.0 to 100.0)",
    )
    passed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        doc="Whether attempt met passing_marks threshold",
    )
    answers: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        doc="Learner submitted answers and question-level evaluation",
    )
    ai_feedback: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="AI generated improvement recommendations and diagnostic insights",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    quiz: Mapped["Quiz"] = relationship(
        "Quiz",
        back_populates="attempts",
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="quiz_attempts",
    )

    def __repr__(self) -> str:
        return f"<QuizAttempt(id={self.id}, quiz={self.quiz_id}, user={self.user_id}, score={self.score}, passed={self.passed})>"
