"""
Database Base Metadata
Imports Base and all 13 models to provide a single metadata source for Alembic and SQLAlchemy.
"""
from app.models.base import Base
from app.models.user import User
from app.models.job_role import JobRole
from app.models.competency import Competency, RoleCompetency, LearnerCompetency
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.document import TrainingDocument, DocumentChunk
from app.models.quiz import Quiz, QuizAttempt
from app.models.audit import AuditLog

__all__ = [
    "Base",
    "User",
    "JobRole",
    "Competency",
    "RoleCompetency",
    "LearnerCompetency",
    "Course",
    "CourseCompetency",
    "Enrollment",
    "TrainingDocument",
    "DocumentChunk",
    "Quiz",
    "QuizAttempt",
    "AuditLog",
]
