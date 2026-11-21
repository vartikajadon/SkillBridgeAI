"""Initial migration creating 13 core tables for SkillBridge AI

Revision ID: 001_initial_13_tables
Revises: 
Create Date: 2026-11-21 13:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_13_tables"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. job_roles
    # --------------------------------------------------------------------------
    op.create_table(
        "job_roles",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_job_roles_code", "job_roles", ["code"], unique=True)
    op.create_index("ix_job_roles_department", "job_roles", ["department"])

    # --------------------------------------------------------------------------
    # 2. competencies
    # --------------------------------------------------------------------------
    op.create_table(
        "competencies",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("category IN ('Technical', 'Domain', 'Behavioral')", name="ck_competency_category"),
    )
    op.create_index("ix_competencies_code", "competencies", ["code"], unique=True)

    # --------------------------------------------------------------------------
    # 3. courses
    # --------------------------------------------------------------------------
    op.create_table(
        "courses",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(length=255), nullable=False, server_default="iGOT Karmayogi"),
        sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_course_status"),
        sa.CheckConstraint("duration_hours > 0", name="ck_course_duration"),
    )
    op.create_index("ix_courses_code", "courses", ["code"], unique=True)
    op.create_index("ix_courses_provider", "courses", ["provider"])

    # --------------------------------------------------------------------------
    # 4. users
    # --------------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="learner"),
        sa.Column("department", sa.String(length=255), nullable=True),
        sa.Column("designation", sa.String(length=255), nullable=True),
        sa.Column("employee_id", sa.String(length=100), nullable=True),
        sa.Column("job_role_id", sa.CHAR(36), sa.ForeignKey("job_roles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("role IN ('learner', 'trainer', 'admin')", name="ck_user_role"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_employee_id", "users", ["employee_id"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_job_role_id", "users", ["job_role_id"])

    # --------------------------------------------------------------------------
    # 5. role_competencies
    # --------------------------------------------------------------------------
    op.create_table(
        "role_competencies",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("job_role_id", sa.CHAR(36), sa.ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("competency_id", sa.CHAR(36), sa.ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_level", sa.Integer(), nullable=False),
        sa.Column("criticality", sa.String(length=50), nullable=False, server_default="Mandatory"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("target_level BETWEEN 1 AND 5", name="ck_role_target_level"),
        sa.CheckConstraint("criticality IN ('Mandatory', 'Desirable')", name="ck_role_competency_criticality"),
        sa.UniqueConstraint("job_role_id", "competency_id", name="uq_role_competency"),
    )
    op.create_index("ix_role_competencies_job_role_id", "role_competencies", ["job_role_id"])
    op.create_index("ix_role_competencies_competency_id", "role_competencies", ["competency_id"])

    # --------------------------------------------------------------------------
    # 6. learner_competencies
    # --------------------------------------------------------------------------
    op.create_table(
        "learner_competencies",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("competency_id", sa.CHAR(36), sa.ForeignKey("competencies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("current_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("target_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("gap_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_assessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("current_level BETWEEN 1 AND 5", name="ck_learner_current_level"),
        sa.CheckConstraint("target_level BETWEEN 1 AND 5", name="ck_learner_target_level"),
        sa.UniqueConstraint("user_id", "competency_id", name="uq_learner_competency"),
    )
    op.create_index("ix_learner_competencies_user_id", "learner_competencies", ["user_id"])
    op.create_index("ix_learner_competencies_competency_id", "learner_competencies", ["competency_id"])

    # --------------------------------------------------------------------------
    # 7. course_competencies
    # --------------------------------------------------------------------------
    op.create_table(
        "course_competencies",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("course_id", sa.CHAR(36), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("competency_id", sa.CHAR(36), sa.ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_level_achieved", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("target_level_achieved BETWEEN 1 AND 5", name="ck_course_competency_level"),
        sa.UniqueConstraint("course_id", "competency_id", name="uq_course_competency"),
    )
    op.create_index("ix_course_competencies_course_id", "course_competencies", ["course_id"])
    op.create_index("ix_course_competencies_competency_id", "course_competencies", ["competency_id"])

    # --------------------------------------------------------------------------
    # 8. enrollments
    # --------------------------------------------------------------------------
    op.create_table(
        "enrollments",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", sa.CHAR(36), sa.ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="enrolled"),
        sa.Column("progress_percentage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('enrolled', 'in_progress', 'completed', 'dropped')", name="ck_enrollment_status"),
        sa.CheckConstraint("progress_percentage BETWEEN 0 AND 100", name="ck_enrollment_progress"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_user_course_enrollment"),
    )
    op.create_index("ix_enrollments_user_id", "enrollments", ["user_id"])
    op.create_index("ix_enrollments_course_id", "enrollments", ["course_id"])

    # --------------------------------------------------------------------------
    # 9. training_documents
    # --------------------------------------------------------------------------
    op.create_table(
        "training_documents",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mime_type", sa.String(length=100), nullable=False, server_default="application/pdf"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("uploaded_by", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'processed', 'failed')", name="ck_document_status"),
        sa.CheckConstraint("file_size_bytes >= 0", name="ck_document_file_size"),
    )
    op.create_index("ix_training_documents_uploaded_by", "training_documents", ["uploaded_by"])

    # --------------------------------------------------------------------------
    # 10. document_chunks
    # --------------------------------------------------------------------------
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("document_id", sa.CHAR(36), sa.ForeignKey("training_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("chunk_index >= 0", name="ck_chunk_index_positive"),
        sa.CheckConstraint("token_count >= 0", name="ck_token_count_positive"),
    )
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])
    op.create_index("ix_doc_chunk_order", "document_chunks", ["document_id", "chunk_index"])

    # --------------------------------------------------------------------------
    # 11. quizzes
    # --------------------------------------------------------------------------
    op.create_table(
        "quizzes",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("course_id", sa.CHAR(36), sa.ForeignKey("courses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("competency_id", sa.CHAR(36), sa.ForeignKey("competencies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("total_marks", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("passing_marks", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("total_marks > 0", name="ck_quiz_total_marks"),
        sa.CheckConstraint("passing_marks >= 0 AND passing_marks <= total_marks", name="ck_quiz_passing_marks"),
    )
    op.create_index("ix_quizzes_course_id", "quizzes", ["course_id"])
    op.create_index("ix_quizzes_competency_id", "quizzes", ["competency_id"])
    op.create_index("ix_quizzes_created_by", "quizzes", ["created_by"])

    # --------------------------------------------------------------------------
    # 12. quiz_attempts
    # --------------------------------------------------------------------------
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("quiz_id", sa.CHAR(36), sa.ForeignKey("quizzes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("percentage", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("passed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("ai_feedback", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("score >= 0", name="ck_attempt_score_positive"),
        sa.CheckConstraint("percentage >= 0.0 AND percentage <= 100.0", name="ck_attempt_percentage"),
    )
    op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])
    op.create_index("ix_quiz_attempts_user_id", "quiz_attempts", ["user_id"])

    # --------------------------------------------------------------------------
    # 13. audit_logs
    # --------------------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.CHAR(36), primary_key=True, nullable=False),
        sa.Column("actor_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=100), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    # Drop in exact reverse dependency order
    op.drop_table("audit_logs")
    op.drop_table("quiz_attempts")
    op.drop_table("quizzes")
    op.drop_table("document_chunks")
    op.drop_table("training_documents")
    op.drop_table("enrollments")
    op.drop_table("course_competencies")
    op.drop_table("learner_competencies")
    op.drop_table("role_competencies")
    op.drop_table("users")
    op.drop_table("courses")
    op.drop_table("competencies")
    op.drop_table("job_roles")
