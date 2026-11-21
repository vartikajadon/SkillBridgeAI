"""add document publication, competency, and embedding metadata columns

Revision ID: 003_add_document_publication_and_competency
Revises: 002_add_quiz_status
Create Date: 2026-11-21 20:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_add_document_publication_and_competency"
down_revision: Union[str, None] = "002_add_quiz_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "training_documents",
        sa.Column(
            "is_published",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "ix_training_documents_is_published",
        "training_documents",
        ["is_published"],
    )
    op.add_column(
        "training_documents",
        sa.Column(
            "competency_id",
            sa.CHAR(36),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_training_documents_competency_id",
        "training_documents",
        ["competency_id"],
    )
    op.add_column(
        "training_documents",
        sa.Column(
            "embedding_model",
            sa.String(length=100),
            nullable=True,
        ),
    )
    op.add_column(
        "training_documents",
        sa.Column(
            "embedding_dim",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.add_column(
        "training_documents",
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("training_documents", "published_at")
    op.drop_column("training_documents", "embedding_dim")
    op.drop_column("training_documents", "embedding_model")
    op.drop_index("ix_training_documents_competency_id", table_name="training_documents")
    op.drop_column("training_documents", "competency_id")
    op.drop_index("ix_training_documents_is_published", table_name="training_documents")
    op.drop_column("training_documents", "is_published")
