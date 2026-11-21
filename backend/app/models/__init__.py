"""
Models Package Initialization
Exports all 13 core database models for SkillBridge AI.
"""
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, VectorType
from app.models.user import User
from app.models.job_role import JobRole
from app.models.competency import Competency, RoleCompetency, LearnerCompetency
from app.models.course import Course, CourseCompetency, Enrollment
from app.models.document import TrainingDocument, DocumentChunk
from app.models.quiz import Quiz, QuizAttempt
from app.models.audit import AuditLog

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "VectorType",
    # 13 tables:
    "User",                 # 1. users
    "JobRole",              # 2. job_roles
    "Competency",           # 3. competencies
    "RoleCompetency",       # 4. role_competencies
    "LearnerCompetency",    # 5. learner_competencies
    "Course",               # 6. courses
    "CourseCompetency",     # 7. course_competencies
    "Enrollment",           # 8. enrollments
    "TrainingDocument",     # 9. training_documents
    "DocumentChunk",        # 10. document_chunks
    "Quiz",                 # 11. quizzes
    "QuizAttempt",          # 12. quiz_attempts
    "AuditLog",             # 13. audit_logs
]
