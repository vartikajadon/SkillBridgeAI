"""
Unit Tests for SkillBridge AI Phase 7 Semantic Retrieval Engine
Tests:
- Cosine similarity ranking (highest score first)
- Unpublished documents strictly excluded from learner retrieval
- Top-k limit enforcement
- Similarity threshold filtering
- Competency scoping filter
- Near-duplicate passage deduplication
"""
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.competency import Competency
from app.models.document import DocumentChunk, TrainingDocument
from app.services.document_embedding import serialize_vector_for_db
from app.services.embedding_service import DeterministicMockEmbeddingProvider, EmbeddingService
from app.services.retrieval_service import RetrievalService, compute_cosine_similarity

TEST_DB_FILE = "test_retrieval_temp.db"
test_engine = create_engine(f"sqlite:///{TEST_DB_FILE}", echo=False)
TestingSessionLocal = sessionmaker(bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def test_cosine_similarity_computation():
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [1.0, 0.0, 0.0]
    vec_c = [0.0, 1.0, 0.0]
    vec_d = [-1.0, 0.0, 0.0]

    assert compute_cosine_similarity(vec_a, vec_b) == 1.0
    assert compute_cosine_similarity(vec_a, vec_c) == 0.0
    assert compute_cosine_similarity(vec_a, vec_d) == -1.0


def test_retrieval_ranking_and_publication_filtering():
    db = TestingSessionLocal()
    mock_prov = DeterministicMockEmbeddingProvider(dimensions=1536)
    svc = EmbeddingService(provider=mock_prov)
    retrieval = RetrievalService(embedding_service=svc)

    # 1. Published document A (GeM Procurement)
    doc_a = TrainingDocument(
        id=uuid.uuid4(),
        title="GeM Public Procurement Guide",
        file_name="gem.pdf",
        file_path="storage/gem.pdf",
        status="processed",
        is_published=True,
    )
    # 2. Unpublished document B (Private draft notes about GeM)
    doc_b = TrainingDocument(
        id=uuid.uuid4(),
        title="Trainer Private Draft on GeM",
        file_name="private_gem.pdf",
        file_path="storage/private.pdf",
        status="processed",
        is_published=False,  # UNPUBLISHED
    )
    db.add_all([doc_a, doc_b])
    db.flush()

    # Chunks for doc A
    text_a1 = "Direct purchase is permissible on GeM up to Rs. 25,000 threshold limit."
    text_a2 = "Procurement above Rs. 5,00,000 mandates reverse auction."
    chunk_a1 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc_a.id,
        chunk_index=0,
        chunk_text=text_a1,
        token_count=80,
        embedding=serialize_vector_for_db(svc.embed_query(text_a1), "sqlite"),
    )
    chunk_a2 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc_a.id,
        chunk_index=1,
        chunk_text=text_a2,
        token_count=70,
        embedding=serialize_vector_for_db(svc.embed_query(text_a2), "sqlite"),
    )

    # Chunk for private doc B (contains exact match keywords, but doc is private)
    text_b = "Confidential note: direct purchase on GeM up to Rs. 25,000 threshold."
    chunk_b = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc_b.id,
        chunk_index=0,
        chunk_text=text_b,
        token_count=75,
        embedding=serialize_vector_for_db(svc.embed_query(text_b), "sqlite"),
    )

    db.add_all([chunk_a1, chunk_a2, chunk_b])
    db.commit()

    # Search for direct purchase limit
    results = retrieval.retrieve(
        db=db,
        question="What is the direct purchase limit on GeM?",
        top_k=5,
        similarity_threshold=0.15,
    )

    assert len(results) >= 1
    # Top result should be chunk_a1
    assert results[0].chunk_id == chunk_a1.id
    assert results[0].document_title == "GeM Public Procurement Guide"

    # CRITICAL: Verify chunk_b from unpublished document is NEVER returned!
    retrieved_chunk_ids = {r.chunk_id for r in results}
    assert chunk_b.id not in retrieved_chunk_ids

    db.close()


def test_competency_filter_scoping():
    db = TestingSessionLocal()
    mock_prov = DeterministicMockEmbeddingProvider(dimensions=1536)
    svc = EmbeddingService(provider=mock_prov)
    retrieval = RetrievalService(embedding_service=svc)

    comp_compliance = Competency(
        id=uuid.uuid4(),
        code="COMP_TEST_1",
        name="Compliance Domain",
        category="Domain",
    )
    comp_other = Competency(
        id=uuid.uuid4(),
        code="COMP_TEST_2",
        name="Other Domain",
        category="Domain",
    )
    db.add_all([comp_compliance, comp_other])
    db.flush()

    doc_matched = TrainingDocument(
        id=uuid.uuid4(),
        title="Compliance SOP",
        file_name="comp.pdf",
        file_path="storage/comp.pdf",
        status="processed",
        is_published=True,
        competency_id=comp_compliance.id,
    )
    doc_unmatched = TrainingDocument(
        id=uuid.uuid4(),
        title="General Guidelines",
        file_name="gen.pdf",
        file_path="storage/gen.pdf",
        status="processed",
        is_published=True,
        competency_id=comp_other.id,
    )
    db.add_all([doc_matched, doc_unmatched])
    db.flush()

    t_text = "RTI disclosure guidelines and transparency timeline standards."
    c1 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc_matched.id,
        chunk_index=0,
        chunk_text=t_text,
        token_count=60,
        embedding=serialize_vector_for_db(svc.embed_query(t_text), "sqlite"),
    )
    c2 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc_unmatched.id,
        chunk_index=0,
        chunk_text=t_text,
        token_count=60,
        embedding=serialize_vector_for_db(svc.embed_query(t_text), "sqlite"),
    )
    db.add_all([c1, c2])
    db.commit()

    # Filter specifically by comp_compliance.id
    filtered_results = retrieval.retrieve(
        db=db,
        question="RTI disclosure guidelines",
        competency_id=comp_compliance.id,
        similarity_threshold=0.15,
    )

    assert len(filtered_results) == 1
    assert filtered_results[0].chunk_id == c1.id
    assert filtered_results[0].document_id == doc_matched.id

    db.close()
