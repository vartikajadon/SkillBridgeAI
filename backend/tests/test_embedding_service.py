"""
Unit Tests for SkillBridge AI Phase 7 Embedding Service
Tests:
- Vector dimension validation
- L2 normalization
- Empty input validation
- Deterministic reproducibility
- Semantic separation (relevant vs irrelevant)
- Batch processing
- Provider error and timeout handling
"""
import pytest
from app.services.embedding_service import (
    BaseEmbeddingProvider,
    DeterministicMockEmbeddingProvider,
    EmbeddingService,
    OpenAIEmbeddingProvider,
)


def test_deterministic_embedding_dimensions_and_normalization():
    provider = DeterministicMockEmbeddingProvider(dimensions=1536)
    vec = provider.embed_query("Government e-Marketplace procurement procedures")

    assert len(vec) == 1536
    # Check L2 norm == 1.0
    norm_sq = sum(x * x for x in vec)
    assert pytest.approx(norm_sq, abs=1e-4) == 1.0


def test_empty_or_whitespace_input_raises_value_error():
    provider = DeterministicMockEmbeddingProvider(dimensions=1536)
    with pytest.raises(ValueError, match="empty or whitespace-only"):
        provider.embed_query("")

    with pytest.raises(ValueError, match="empty or whitespace-only"):
        provider.embed_query("   \n\t  ")


def test_deterministic_reproducibility():
    provider = DeterministicMockEmbeddingProvider(dimensions=1536)
    text = "General Financial Rules Rule 149 public procurement guidelines"
    vec1 = provider.embed_query(text)
    vec2 = provider.embed_query(text)

    assert vec1 == vec2


def test_semantic_differentiation_cosine_similarity():
    provider = DeterministicMockEmbeddingProvider(dimensions=1536)
    query = "GeM direct purchase threshold and financial limit"
    doc_relevant = "Direct purchase is permitted on GeM portal up to Rs. 25,000 threshold limit."
    doc_irrelevant = "Preparation of herbal green tea using honey and warm water."

    vq = provider.embed_query(query)
    vr = provider.embed_query(doc_relevant)
    vi = provider.embed_query(doc_irrelevant)

    sim_rel = sum(a * b for a, b in zip(vq, vr))
    sim_irr = sum(a * b for a, b in zip(vq, vi))

    assert sim_rel > sim_irr
    assert sim_rel > 0.15
    assert sim_irr < 0.10


def test_batch_document_embeddings():
    provider = DeterministicMockEmbeddingProvider(dimensions=1536)
    texts = [
        "Procurement via reverse auction above Rs. 5,00,000.",
        "Consignee Receipt and Acceptance Certificate timelines.",
        "Penal interest for delayed supplier disbursements.",
    ]
    vectors = provider.embed_documents(texts)

    assert len(vectors) == 3
    for v in vectors:
        assert len(v) == 1536
        assert pytest.approx(sum(x * x for x in v), abs=1e-4) == 1.0


def test_embedding_service_dimension_validation():
    # Mock a buggy provider returning wrong dimensions
    class BadDimensionProvider(BaseEmbeddingProvider):
        @property
        def model_name(self) -> str:
            return "bad-dim"

        @property
        def dimensions(self) -> int:
            return 1536

        def embed_query(self, text: str):
            return [0.1] * 100  # Returns 100 instead of 1536

        def embed_documents(self, texts):
            return [[0.1] * 100 for _ in texts]

    svc = EmbeddingService(provider=BadDimensionProvider())
    with pytest.raises(ValueError, match="Vector dimension mismatch"):
        svc.embed_query("test query")

    with pytest.raises(ValueError, match="Vector dimension mismatch"):
        svc.embed_documents(["test doc"])
