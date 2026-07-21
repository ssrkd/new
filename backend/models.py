"""
Pydantic models for request/response validation
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ── Sources ──────────────────────────────────────────────────────────────────

class SourceCreate(BaseModel):
    name: str
    url: str
    type: str = Field(..., pattern="^(rss|telegram|api|scraper)$")
    category: str = Field(..., pattern="^(казахстан|мир|дипломатия|экономика|безопасность)$")
    active: bool = True


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    active: Optional[bool] = None


class SourceOut(BaseModel):
    id: str
    name: str
    url: str
    type: str
    category: str
    active: bool
    created_at: datetime


# ── Articles ─────────────────────────────────────────────────────────────────

class ArticleOut(BaseModel):
    # from processed_articles
    id: str
    summary: Optional[str] = None
    tags: Optional[list[str]] = None
    entities: Optional[dict] = None
    importance: Optional[str] = None
    importance_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    # from raw_articles (joined)
    raw_article_id: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    published_at: Optional[datetime] = None
    source_name: Optional[str] = None
    category: Optional[str] = None


class ArticlesListResponse(BaseModel):
    items: list[ArticleOut]
    total: int
    limit: int
    offset: int


# ── RAG / Ask ─────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    chat_id: Optional[str] = None


class AskSource(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    source_name: Optional[str] = None
    published_at: Optional[datetime] = None
    similarity: Optional[float] = None


class AskResponse(BaseModel):
    answer: str
    sources: list[AskSource]


# ── Digest ────────────────────────────────────────────────────────────────────

class DigestCategoryItem(BaseModel):
    category: str
    content: str


class DigestResponse(BaseModel):
    date: str
    categories: list[DigestCategoryItem]
    generated_at: Optional[datetime] = None
