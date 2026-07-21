"""
Embedding service — local sentence-transformers model
paraphrase-multilingual-mpnet-base-v2 → 768-dim vectors
No API key required. Downloaded on first use (~420MB).
"""
from __future__ import annotations
import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from backend.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    model_name = get_settings().embedding_model
    logger.info(f"Loading embedding model: {model_name}")
    return SentenceTransformer(model_name)


def embed_text(text: str) -> list[float]:
    """Return 768-dim embedding vector for the given text."""
    model = _get_model()
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Return embeddings for a batch of texts."""
    model = _get_model()
    vecs = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [v.tolist() for v in vecs]
