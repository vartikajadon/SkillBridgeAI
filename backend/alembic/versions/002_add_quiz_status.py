"""add quiz status column

Revision ID: 002_add_quiz_status
Revises: 001_initial_13_tables
Create Date: 2026-11-21 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_add_quiz_status"
down_revision: Union[str, None] = "001_initial_13_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quizzes",
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="published",
        ),
    )
    op.create_index("ix_quizzes_status", "quizzes", ["status"])


def downgrade() -> None:
    op.drop_index("ix_quizzes_status", table_name="quizzes")
    op.drop_column("quizzes", "status")
