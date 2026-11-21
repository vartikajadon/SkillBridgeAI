"""
Unit Tests for SkillBridge AI Phase 7 Document Embedding Pipeline
Tests:
- Generating embeddings for eligible processed documents
- Skipping already-embedded chunks (duplicate prevention)
- Force reprocessing when requested
- Recording embedding model and dimensions metadata on TrainingDocument
- Rejection of unprocessed/pending documents
"""
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.document import DocumentChunk, TrainingDocument
from app.services.document_embedding import (
    deserialize_vector_from_db,
    embed_document_chunks,
    serialize_vector_for_db,
)
from app.services.embedding_service import DeterministicMockEmbeddingProvider, EmbeddingService

TEST_DB_FILE = "test_doc_embed_temp.db"
test_engine = create_engine(f"sqlite:///{TEST_DB_FILE}", echo=False)
TestingSessionLocal = sessionmaker(bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def test_embed_processed_document_chunks():
    db = TestingSessionLocal()
    mock_provider = DeterministicMockEmbeddingProvider(dimensions=1536)
    svc = EmbeddingService(provider=mock_provider)

    doc = TrainingDocument(
        id=uuid.uuid4(),
        title="Administrative Vigilance Manual",
        file_name="vigilance_manual.pdf",
        file_path="storage/vigilance.pdf",
        status="processed",
        is_published=False,
    )
    db.add(doc)
    db.flush()

    chunk1 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        chunk_index=0,
        chunk_text="Preliminary inquiry protocols under CVC guidelines.",
        token_count=100,
    )
    chunk2 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        chunk_index=1,
        chunk_text="Disciplinary proceedings and framing of article of charges.",
        token_count=120,
    )
    db.add_all([chunk1, chunk2])
    db.commit()

    embedded, total = embed_document_chunks(db, doc.id, embedding_service=svc)

    assert embedded == 2
    assert total == 2

    # Refresh and inspect
    db.refresh(doc)
    db.refresh(chunk1)
    db.refresh(chunk2)

    assert doc.embedding_model == "mock-embedding-v1"
    assert doc.embedding_dim == 1536
    assert chunk1.embedding is not None

    v1 = deserialize_vector_from_db(chunk1.embedding)
    assert len(v1) == 1536

    # Repeated call without force_reprocess should skip
    embedded2, total2 = embed_document_chunks(db, doc.id, embedding_service=svc)
    assert embedded2 == 0
    assert total2 == 2

    # Call with force_reprocess should reprocess
    embedded3, total3 = embed_document_chunks(db, doc.id, force_reprocess=True, embedding_service=svc)
    assert embedded3 == 2
    assert total3 == 2

    db.close()


def test_embed_pending_document_raises_error():
    db = TestingSessionLocal()
    doc = TrainingDocument(
        id=uuid.uuid4(),
        title="Unprocessed Draft",
        file_name="draft.txt",
        file_path="storage/draft.txt",
        status="pending",
    )
    db.add(doc)
    db.commit()

    with pytest.raises(ValueError, match="state"):
        embed_document_chunks(db, doc.id)

    db.close()
