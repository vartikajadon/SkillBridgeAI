"""
Semantic Retrieval Engine (Phase 7)
Retrieves and ranks authorized document chunks using vector cosine similarity.
Enforces strict document publication filters, competency scoping, similarity thresholds, and deduplication.
"""
import math
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import DocumentChunk, TrainingDocument
from app.services.document_embedding import deserialize_vector_from_db, serialize_vector_for_db
from app.services.embedding_service import EmbeddingService, get_embedding_service


@dataclass
class RetrievedChunk:
    """Represents a semantically retrieved and verified document chunk."""
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    chunk_index: int
    chunk_text: str
    token_count: int
    similarity_score: float
    metadata_json: Dict[str, Any] = field(default_factory=dict)


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Computes cosine similarity between two float vectors.
    Assumes unit-normalized vectors: dot_product(a, b).
    Falls back to full cosine formula if norms differ from 1.0.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a)
    norm_b = sum(b * b for b in vec_b)

    if norm_a <= 1e-9 or norm_b <= 1e-9:
        return 0.0

    # If already normalized within small epsilon, dot is cosine similarity
    if abs(norm_a - 1.0) < 1e-4 and abs(norm_b - 1.0) < 1e-4:
        # Clamp to [-1.0, 1.0]
        return max(-1.0, min(1.0, dot))

    denom = math.sqrt(norm_a) * math.sqrt(norm_b)
    return max(-1.0, min(1.0, dot / denom))


class RetrievalService:
    """Coordinates question embedding, database querying, authorization filtering,
    and similarity scoring across published training document corpora.
    """

    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        self.embedding_service = embedding_service or get_embedding_service()

    def build_postgresql_query(
        self,
        db: Session,
        query_vector: List[float],
        k: int,
        threshold: float,
        competency_id: Optional[uuid.UUID] = None,
        document_id: Optional[uuid.UUID] = None,
    ):
        """Constructs native PostgreSQL pgvector cosine distance query.
        Calculates cosine distance via pgvector '<=>' operator, ranks in-database,
        and bounds candidates to Top-K without loading the full corpus into Python.

        Recommended pgvector index strategy for production:
        CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_cosine
        ON document_chunks USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
        """
        query_vector_str = serialize_vector_for_db(query_vector, "postgresql")
        distance_expr = DocumentChunk.embedding.op("<=>")(query_vector_str)
        similarity_expr = (1.0 - distance_expr).label("similarity_score")

        query = (
            db.query(DocumentChunk, TrainingDocument, similarity_expr)
            .join(TrainingDocument, DocumentChunk.document_id == TrainingDocument.id)
            .filter(
                TrainingDocument.is_published == True,
                TrainingDocument.status == "processed",
                DocumentChunk.embedding != None,
            )
        )

        if competency_id:
            query = query.filter(TrainingDocument.competency_id == competency_id)

        if document_id:
            query = query.filter(TrainingDocument.id == document_id)

        if threshold is not None:
            # Cosine similarity >= threshold  <=>  cosine distance <= (1 - threshold)
            query = query.filter(distance_expr <= (1.0 - threshold))

        # Order by closest cosine distance first and limit Top-K in database
        query = query.order_by(distance_expr.asc()).limit(max(k * 2, 10))
        return query

    def _retrieve_postgresql(
        self,
        db: Session,
        query_vector: List[float],
        k: int,
        threshold: float,
        competency_id: Optional[uuid.UUID] = None,
        document_id: Optional[uuid.UUID] = None,
    ) -> List[RetrievedChunk]:
        query = self.build_postgresql_query(
            db=db,
            query_vector=query_vector,
            k=k,
            threshold=threshold,
            competency_id=competency_id,
            document_id=document_id,
        )
        rows = query.all()
        if not rows:
            return []

        deduped: List[RetrievedChunk] = []
        seen_texts = set()
        for chunk_obj, doc_obj, sim_score in rows:
            fingerprint = chunk_obj.chunk_text.strip()[:100].lower()
            if fingerprint in seen_texts:
                continue
            seen_texts.add(fingerprint)
            deduped.append(
                RetrievedChunk(
                    chunk_id=chunk_obj.id,
                    document_id=doc_obj.id,
                    document_title=doc_obj.title,
                    chunk_index=chunk_obj.chunk_index,
                    chunk_text=chunk_obj.chunk_text,
                    token_count=chunk_obj.token_count,
                    similarity_score=round(float(sim_score), 4),
                    metadata_json=chunk_obj.metadata_json or {},
                )
            )
            if len(deduped) >= k:
                break

        return deduped

    def _retrieve_sqlite(
        self,
        db: Session,
        query_vector: List[float],
        k: int,
        threshold: float,
        competency_id: Optional[uuid.UUID] = None,
        document_id: Optional[uuid.UUID] = None,
    ) -> List[RetrievedChunk]:
        query = (
            db.query(DocumentChunk, TrainingDocument)
            .join(TrainingDocument, DocumentChunk.document_id == TrainingDocument.id)
            .filter(
                TrainingDocument.is_published == True,
                TrainingDocument.status == "processed",
                DocumentChunk.embedding != None,
            )
        )

        if competency_id:
            query = query.filter(TrainingDocument.competency_id == competency_id)

        if document_id:
            query = query.filter(TrainingDocument.id == document_id)

        rows = query.all()
        if not rows:
            return []

        scored_candidates: List[RetrievedChunk] = []
        for chunk_obj, doc_obj in rows:
            chunk_vec = deserialize_vector_from_db(chunk_obj.embedding)
            if not chunk_vec or len(chunk_vec) != len(query_vector):
                continue

            score = compute_cosine_similarity(query_vector, chunk_vec)
            if score >= threshold:
                scored_candidates.append(
                    RetrievedChunk(
                        chunk_id=chunk_obj.id,
                        document_id=doc_obj.id,
                        document_title=doc_obj.title,
                        chunk_index=chunk_obj.chunk_index,
                        chunk_text=chunk_obj.chunk_text,
                        token_count=chunk_obj.token_count,
                        similarity_score=round(score, 4),
                        metadata_json=chunk_obj.metadata_json or {},
                    )
                )

        scored_candidates.sort(key=lambda x: x.similarity_score, reverse=True)

        seen_texts = set()
        deduped: List[RetrievedChunk] = []
        for cand in scored_candidates:
            fingerprint = cand.chunk_text.strip()[:100].lower()
            if fingerprint in seen_texts:
                continue
            seen_texts.add(fingerprint)
            deduped.append(cand)
            if len(deduped) >= k:
                break

        return deduped

    def retrieve(
        self,
        db: Session,
        question: str,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None,
        competency_id: Optional[uuid.UUID] = None,
        document_id: Optional[uuid.UUID] = None,
    ) -> List[RetrievedChunk]:
        """Retrieves and ranks the top-k most semantically relevant document chunks.
        Strictly enforces that documents must have `is_published == True`.
        Uses native pgvector distance ranking on PostgreSQL, and in-memory cosine ranking on SQLite.
        """
        if not question or not question.strip():
            return []

        k = top_k if top_k is not None else settings.RAG_TOP_K
        threshold = similarity_threshold if similarity_threshold is not None else settings.RAG_SIMILARITY_THRESHOLD

        # 1. Convert learner question into embedding
        query_vector = self.embedding_service.embed_query(question.strip())

        # 2. Check dialect
        dialect_name = db.bind.dialect.name if (db.bind and hasattr(db.bind, "dialect")) else "sqlite"
        if dialect_name == "postgresql":
            return self._retrieve_postgresql(
                db=db,
                query_vector=query_vector,
                k=k,
                threshold=threshold,
                competency_id=competency_id,
                document_id=document_id,
            )
        else:
            return self._retrieve_sqlite(
                db=db,
                query_vector=query_vector,
                k=k,
                threshold=threshold,
                competency_id=competency_id,
                document_id=document_id,
            )


_retrieval_service_instance: Optional[RetrievalService] = None


def get_retrieval_service() -> RetrievalService:
    """Returns singleton RetrievalService instance."""
    global _retrieval_service_instance
    if _retrieval_service_instance is None:
        _retrieval_service_instance = RetrievalService()
    return _retrieval_service_instance
