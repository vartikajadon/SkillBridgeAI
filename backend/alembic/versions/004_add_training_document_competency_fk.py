"""add foreign key constraint for training_documents.competency_id

Revision ID: 004_add_training_document_competency_fk
Revises: 003_add_document_publication_and_competency
Create Date: 2026-11-21 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_add_training_document_competency_fk"
down_revision: Union[str, None] = "003_add_document_publication_and_competency"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for full compatibility with SQLite table rebuilds
    # and PostgreSQL standard ALTER TABLE ADD CONSTRAINT statements
    with op.batch_alter_table("training_documents", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_training_documents_competency_id_competencies",
            "competencies",
            ["competency_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("training_documents", schema=None) as batch_op:
        batch_op.drop_constraint(
            "fk_training_documents_competency_id_competencies",
            type_="foreignkey",
        )
