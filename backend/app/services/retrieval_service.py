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
from app.services.document_embedding import deserialize_vector_from_db
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
        """
        if not question or not question.strip():
            return []

        k = top_k if top_k is not None else settings.RAG_TOP_K
        threshold = similarity_threshold if similarity_threshold is not None else settings.RAG_SIMILARITY_THRESHOLD

        # 1. Convert learner question into embedding
        query_vector = self.embedding_service.embed_query(question.strip())

        # 2. Query only eligible, published documents (Security & Access Boundary)
        query = (
            db.query(DocumentChunk, TrainingDocument)
            .join(TrainingDocument, DocumentChunk.document_id == TrainingDocument.id)
            .filter(
                TrainingDocument.is_published == True,
                TrainingDocument.status == "processed",
                DocumentChunk.embedding != None,
            )
        )

        # Optional filters
        if competency_id:
            query = query.filter(TrainingDocument.competency_id == competency_id)

        if document_id:
            query = query.filter(TrainingDocument.id == document_id)

        rows = query.all()
        if not rows:
            return []

        # 3. Calculate similarity score for each chunk
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

        # 4. Rank candidates by similarity score descending
        scored_candidates.sort(key=lambda x: x.similarity_score, reverse=True)

        # 5. Deduplicate near-identical text passages
        seen_texts = set()
        deduped: List[RetrievedChunk] = []
        for cand in scored_candidates:
            # Simple content fingerprint to avoid identical chunks
            fingerprint = cand.chunk_text.strip()[:100].lower()
            if fingerprint in seen_texts:
                continue
            seen_texts.add(fingerprint)
            deduped.append(cand)
            if len(deduped) >= k:
                break

        return deduped


_retrieval_service_instance: Optional[RetrievalService] = None


def get_retrieval_service() -> RetrievalService:
    """Returns singleton RetrievalService instance."""
    global _retrieval_service_instance
    if _retrieval_service_instance is None:
        _retrieval_service_instance = RetrievalService()
    return _retrieval_service_instance
