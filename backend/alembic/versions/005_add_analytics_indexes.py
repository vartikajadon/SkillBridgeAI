"""add analytics composite indexes for query optimization

Revision ID: 005_add_analytics_indexes
Revises: 004_add_training_document_competency_fk
Create Date: 2026-11-21 21:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005_add_analytics_indexes"
down_revision: Union[str, None] = "004_add_training_document_competency_fk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Course completion rate index (optimizes status & completed_at queries)
    op.create_index(
        "ix_enrollments_status_completed",
        "enrollments",
        ["status", "completed_at"],
    )

    # 2. Completed quiz assessment aggregation index (optimizes finalized attempt score aggregation)
    op.create_index(
        "ix_quiz_attempts_completed_stats",
        "quiz_attempts",
        ["completed_at", "passed", "percentage"],
    )

    # 3. Learner competency gap and assessment tracking index (optimizes assessed vs unassessed gap index)
    op.create_index(
        "ix_learner_competencies_gap_assessed",
        "learner_competencies",
        ["last_assessed_at", "gap_score"],
    )

    # 4. Audit log action timeline index (optimizes chronological event queries)
    op.create_index(
        "ix_audit_logs_action_created",
        "audit_logs",
        ["action", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_logs_action_created", table_name="audit_logs")
    op.drop_index("ix_learner_competencies_gap_assessed", table_name="learner_competencies")
    op.drop_index("ix_quiz_attempts_completed_stats", table_name="quiz_attempts")
    op.drop_index("ix_enrollments_status_completed", table_name="enrollments")
