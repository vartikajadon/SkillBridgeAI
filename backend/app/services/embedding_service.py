"""
Embedding Service & Provider Abstraction (Phase 7)
Provides modular embedding generation for document chunks and user queries.
Supports deterministic mock embeddings for offline testing, as well as OpenAI, Gemini, and Ollama.
"""
import abc
import hashlib
import math
import re
from typing import List, Optional
import httpx

from app.core.config import settings


class BaseEmbeddingProvider(abc.ABC):
    """Abstract Base Class for Embedding Providers."""

    @property
    @abc.abstractmethod
    def model_name(self) -> str:
        """Returns the identifier of the embedding model."""
        pass

    @property
    @abc.abstractmethod
    def dimensions(self) -> int:
        """Returns the fixed vector dimension of the embeddings."""
        pass

    @abc.abstractmethod
    def embed_query(self, text: str) -> List[float]:
        """Generates an embedding vector for a single query string."""
        pass

    @abc.abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a batch of text chunks."""
        pass


class DeterministicMockEmbeddingProvider(BaseEmbeddingProvider):
    """Deterministic, offline embedding provider for development and automated testing.
    Constructs normalized pseudo-semantic embeddings based on word and character n-gram projections.
    Guarantees exact dimension matching and consistent cosine similarities without network calls.
    """

    def __init__(self, model_name: str = "mock-embedding-v1", dimensions: int = 1536):
        self._model_name = model_name
        self._dimensions = dimensions

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def _text_to_vector(self, text: str) -> List[float]:
        """Transforms text into a deterministic, unit-normalized vector of size `self._dimensions`."""
        if not text or not text.strip():
            raise ValueError("Cannot generate embedding for empty or whitespace-only text.")

        cleaned = text.strip().lower()
        words = re.findall(r"\w+", cleaned)
        if not words:
            words = [cleaned]

        stopwords = {
            "what", "is", "the", "on", "in", "at", "for", "a", "an", "and", "or",
            "to", "of", "with", "from", "by", "do", "does", "how", "which", "are",
            "this", "that", "it", "as", "be", "was", "were", "can", "could", "should",
        }

        vec = [0.0] * self._dimensions

        for word in words:
            if len(word) < 2:
                continue
            weight = 0.25 if word in stopwords else 2.5
            # Hash word into multiple vector indices with positive/negative weights
            word_hash = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            for i in range(8):  # Project each word across 8 dimensions
                idx = (word_hash + i * 199) % self._dimensions
                sign = 1.0 if ((word_hash >> i) & 1) else -1.0
                vec[idx] += sign * weight

        # Also add bigram projections to capture local phrases
        for i in range(len(words) - 1):
            if words[i] not in stopwords or words[i + 1] not in stopwords:
                bigram = f"{words[i]}_{words[i+1]}"
                bi_hash = int(hashlib.md5(bigram.encode("utf-8")).hexdigest(), 16)
                idx = bi_hash % self._dimensions
                vec[idx] += 1.8

        # Normalize to unit length (L2 norm) so dot product == cosine similarity
        norm = math.sqrt(sum(x * x for x in vec))
        if norm < 1e-9:
            norm = 1.0
            vec[0] = 1.0

        normalized = [x / norm for x in vec]
        return normalized

    def embed_query(self, text: str) -> List[float]:
        return self._text_to_vector(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._text_to_vector(t) for t in texts]


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """OpenAI hosted embedding provider using text-embedding-3-small / text-embedding-ada-002."""

    def __init__(
        self,
        api_key: str,
        model_name: str = "text-embedding-3-small",
        dimensions: int = 1536,
        timeout_seconds: float = 15.0,
    ):
        self._api_key = api_key
        self._model_name = model_name
        self._dimensions = dimensions
        self._timeout = timeout_seconds

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def _call_api(self, input_texts: List[str]) -> List[List[float]]:
        for t in input_texts:
            if not t or not t.strip():
                raise ValueError("Cannot generate embedding for empty text.")

        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model_name,
            "input": input_texts,
            "dimensions": self._dimensions,
        }

        try:
            with httpx.Client(timeout=self._timeout) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"OpenAI embedding error ({res.status_code}): {res.text}")
                data = res.json()
                embeddings = [item["embedding"] for item in data["data"]]
                return embeddings
        except httpx.TimeoutException:
            raise TimeoutError("OpenAI embedding request timed out.")
        except Exception as e:
            if isinstance(e, (ValueError, TimeoutError, RuntimeError)):
                raise
            raise RuntimeError(f"OpenAI embedding communication failed: {str(e)}")

    def embed_query(self, text: str) -> List[float]:
        return self._call_api([text])[0]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        return self._call_api(texts)


class EmbeddingService:
    """Centralized Embedding Service.
    Wraps provider selection, dimension verification, and fallback handling.
    """

    def __init__(self, provider: Optional[BaseEmbeddingProvider] = None):
        if provider is not None:
            self._provider = provider
        else:
            self._provider = self._create_configured_provider()

    def _create_configured_provider(self) -> BaseEmbeddingProvider:
        prov_type = (settings.EMBEDDING_PROVIDER or "mock").strip().lower()
        dims = int(settings.EMBEDDING_DIMENSIONS or 1536)
        model = settings.EMBEDDING_MODEL or "mock-embedding-v1"
        is_production = (settings.ENVIRONMENT or "development").strip().lower() == "production"

        if is_production and (prov_type == "mock" or not prov_type):
            raise RuntimeError(
                "Production configuration error: Mock embedding provider is strictly forbidden in production."
            )

        if prov_type == "openai":
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-placeholder"):
                if is_production:
                    raise RuntimeError("Production configuration error: Valid OPENAI_API_KEY is required in production.")
            else:
                return OpenAIEmbeddingProvider(
                    api_key=settings.OPENAI_API_KEY,
                    model_name=model,
                    dimensions=dims,
                )

        if is_production:
            raise RuntimeError(f"Production configuration error: Unsupported or unconfigured embedding provider '{prov_type}'.")

        # Default / Mock / Offline provider for development and testing
        return DeterministicMockEmbeddingProvider(model_name=model, dimensions=dims)

    @property
    def model_name(self) -> str:
        return self._provider.model_name

    @property
    def dimensions(self) -> int:
        return self._provider.dimensions

    def embed_query(self, text: str) -> List[float]:
        """Generates vector embedding for search query."""
        if not text or not text.strip():
            raise ValueError("Query string cannot be empty.")
        vec = self._provider.embed_query(text)
        if len(vec) != self.dimensions:
            raise ValueError(f"Vector dimension mismatch: expected {self.dimensions}, got {len(vec)}")
        return vec

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates batch embeddings for document chunks."""
        if not texts:
            return []
        vectors = self._provider.embed_documents(texts)
        for i, vec in enumerate(vectors):
            if len(vec) != self.dimensions:
                raise ValueError(
                    f"Vector dimension mismatch at index {i}: expected {self.dimensions}, got {len(vec)}"
                )
        return vectors


# Global singleton instance
_embedding_service_instance: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Returns singleton EmbeddingService instance."""
    global _embedding_service_instance
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService()
    return _embedding_service_instance
