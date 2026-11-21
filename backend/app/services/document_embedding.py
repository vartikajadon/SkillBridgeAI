"""
Document Embedding Pipeline Service (Phase 7)
Coordinates chunk retrieval, embedding generation, storage persistence,
and model metadata tracking across document ingestion and publishing workflows.
"""
import json
import logging
import uuid
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.document import DocumentChunk, TrainingDocument
from app.services.embedding_service import EmbeddingService, get_embedding_service

logger = logging.getLogger(__name__)


def serialize_vector_for_db(vector: List[float], dialect_name: str) -> str:
    """Formats float vector appropriately for either PostgreSQL pgvector or SQLite TEXT."""
    if dialect_name == "postgresql":
        # pgvector syntax e.g. '[0.1,0.2,...]'
        return f"[{','.join(str(round(x, 7)) for x in vector)}]"
    else:
        # SQLite JSON string
        return json.dumps([round(x, 7) for x in vector])


def deserialize_vector_from_db(val: Optional[str]) -> Optional[List[float]]:
    """Deserializes vector stored in SQLite TEXT or PostgreSQL pgvector into list of floats."""
    if val is None:
        return None
    if isinstance(val, list):
        return [float(x) for x in val]
    if isinstance(val, str):
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            try:
                return json.loads(val)
            except Exception:
                # Comma separated fallback
                inner = val[1:-1]
                return [float(x.strip()) for x in inner.split(",") if x.strip()]
    return None


def embed_document_chunks(
    db: Session,
    document_id: uuid.UUID,
    force_reprocess: bool = False,
    embedding_service: Optional[EmbeddingService] = None,
) -> Tuple[int, int]:
    """Generates and persists embeddings for chunks belonging to a TrainingDocument.
    Returns:
        (embedded_count, total_chunks)
    """
    service = embedding_service or get_embedding_service()
    doc = db.query(TrainingDocument).filter(TrainingDocument.id == document_id).first()
    if not doc:
        raise ValueError(f"Training document '{document_id}' not found.")

    if doc.status != "processed":
        raise ValueError(
            f"Cannot embed document with status '{doc.status}'. Document must be in 'processed' state."
        )

    # Fetch chunks
    chunks: List[DocumentChunk] = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )

    if not chunks:
        return 0, 0

    # Determine chunks needing embeddings
    dialect_name = db.bind.dialect.name if db.bind else "sqlite"
    chunks_to_embed: List[DocumentChunk] = []

    for c in chunks:
        if force_reprocess or c.embedding is None:
            chunks_to_embed.append(c)

    if not chunks_to_embed:
        # All chunks already embedded
        return 0, len(chunks)

    texts = [c.chunk_text for c in chunks_to_embed]

    try:
        vectors = service.embed_documents(texts)

        for chunk_obj, vec in zip(chunks_to_embed, vectors):
            chunk_obj.embedding = serialize_vector_for_db(vec, dialect_name)
            # Update chunk metadata with embedding model info
            current_meta = dict(chunk_obj.metadata_json or {})
            current_meta["embedding_model"] = service.model_name
            current_meta["embedding_dim"] = service.dimensions
            chunk_obj.metadata_json = current_meta

        # Update document model tracking
        doc.embedding_model = service.model_name
        doc.embedding_dim = service.dimensions

        db.commit()
        db.refresh(doc)
        logger.info(
            f"Embedded {len(chunks_to_embed)} chunks for document '{doc.title}' ({doc.id}) using {service.model_name}."
        )
        return len(chunks_to_embed), len(chunks)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to generate embeddings for document '{document_id}': {str(e)}")
        raise RuntimeError(f"Embedding pipeline failed: {str(e)}")


def embed_all_unembedded_published_documents(
    db: Session,
    embedding_service: Optional[EmbeddingService] = None,
) -> Dict[str, int]:
    """Scans all published processed documents and generates embeddings for any unembedded chunks."""
    service = embedding_service or get_embedding_service()
    published_docs = (
        db.query(TrainingDocument)
        .filter(
            TrainingDocument.is_published == True,
            TrainingDocument.status == "processed",
        )
        .all()
    )

    total_docs_processed = 0
    total_chunks_embedded = 0

    for doc in published_docs:
        embedded, _ = embed_document_chunks(
            db=db,
            document_id=doc.id,
            force_reprocess=False,
            embedding_service=service,
        )
        if embedded > 0:
            total_docs_processed += 1
            total_chunks_embedded += embedded

    return {
        "documents_updated": total_docs_processed,
        "chunks_embedded": total_chunks_embedded,
    }
