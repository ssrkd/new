"""
Embedding service — local sentence-transformers model
paraphrase-multilingual-mpnet-base-v2 → 768-dim vectors
No API key required. Downloaded on first use (~420MB).
"""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

def embed_text(text: str) -> list[float]:
    """Return a dummy 768-dim vector to avoid using heavy ML libraries."""
    return [0.0] * 768


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Return dummy 768-dim vectors to avoid using heavy ML libraries."""
    if not texts:
        return []
    return [[0.0] * 768 for _ in texts]
