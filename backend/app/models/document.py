"""
Training Documents and Document Chunks (RAG)
Stores government training manuals, guidelines, and vector-embedded chunks.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, SQLiteUUID, TimestampMixin, UUIDPrimaryKeyMixin, VectorType

if TYPE_CHECKING:
    from app.models.user import User


class TrainingDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Table 9: training_documents
    Source government circulars, SOPs, manual PDFs uploaded for RAG processing.
    """
    __tablename__ = "training_documents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processed', 'failed')",
            name="ck_document_status",
        ),
        CheckConstraint("file_size_bytes >= 0", name="ck_document_file_size"),
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Descriptive document title",
    )
    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Original uploaded file name",
    )
    file_path: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        doc="Storage bucket reference or filesystem location",
    )
    file_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="File size in bytes",
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="application/pdf",
        doc="MIME type e.g. application/pdf",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
        doc="Ingestion status: pending, processed, failed",
    )
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        SQLiteUUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Trainer or admin who uploaded the document",
    )

    # Relationships
    uploader: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="uploaded_documents",
    )
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<TrainingDocument(id={self.id}, title='{self.title}', status='{self.status}')>"


class DocumentChunk(Base, UUIDPrimaryKeyMixin):
    """Table 10: document_chunks
    Partitioned text chunks with pgvector-compatible embedding coordinates for RAG retrieval.
    """
    __tablename__ = "document_chunks"
    __table_args__ = (
        Index("ix_doc_chunk_order", "document_id", "chunk_index"),
        CheckConstraint("chunk_index >= 0", name="ck_chunk_index_positive"),
        CheckConstraint("token_count >= 0", name="ck_token_count_positive"),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        SQLiteUUID(),
        ForeignKey("training_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Sequential order of chunk in the source document",
    )
    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Extracted text chunk content",
    )
    token_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        doc="Approximate token count of chunk",
    )
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        doc="Chunk metadata: section headers, page numbers, keywords",
    )
    embedding: Mapped[Optional[Any]] = mapped_column(
        VectorType(1536),
        nullable=True,
        doc="pgvector embedding coordinate (e.g. OpenAI text-embedding-3 or Gemini 1536-dim)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    document: Mapped["TrainingDocument"] = relationship(
        "TrainingDocument",
        back_populates="chunks",
    )

    def __repr__(self) -> str:
        return f"<DocumentChunk(id={self.id}, doc={self.document_id}, idx={self.chunk_index}, tokens={self.token_count})>"
