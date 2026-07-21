"""
/api/articles — article feed with filters
"""
from __future__ import annotations
from datetime import date
from typing import Optional
import logging

from fastapi import APIRouter, Query, HTTPException
from backend.database import get_client
from backend.models import ArticlesListResponse, ArticleOut

router = APIRouter(prefix="/api/articles", tags=["articles"])
logger = logging.getLogger(__name__)


@router.get("", response_model=ArticlesListResponse)
async def get_articles(
    category: Optional[str] = Query(None),
    importance: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    gov: Optional[bool] = Query(None, description="Фильтр только по госорганам (Акорда, МВД, КНБ, Антикор, АФМ, Прокуратура)"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    db = get_client()

    # List of government source names
    GOV_SOURCE_NAMES = [
        'Акорда', 'МВД Казахстана', 'КНБ Казахстана',
        'Антикор Казахстана', 'АФМ Казахстана', 'Генеральная Прокуратура РК'
    ]

    # We join processed_articles → raw_articles → sources
    q = (
        db.table("processed_articles")
        .select(
            "id, raw_article_id, summary, tags, entities, importance, importance_reason, created_at,"
            "raw_articles!inner(id, title, url, content, published_at, source_id,"
            "sources!inner(name, category))",
            count="exact"
        )
        .order("created_at", desc=True)
    )

    if importance:
        q = q.eq("importance", importance)
    if category:
        # Check both capitalized and lowercase variants in the text[] tags array
        cat_lower = category.lower()
        cat_cap = category.capitalize()
        q = q.or_(f"tags.cs.{{{cat_lower}}},tags.cs.{{{cat_cap}}}")
    if source_id:
        q = q.eq("raw_articles.source_id", source_id)
    if gov:
        # Fetch IDs of government sources first, then filter
        gov_sources = db.table("sources").select("id").in_(
            "name", GOV_SOURCE_NAMES
        ).execute()
        gov_ids = [s["id"] for s in (gov_sources.data or [])]
        if gov_ids:
            q = q.in_("raw_articles.source_id", gov_ids)
        else:
            # No gov sources found — return empty
            return ArticlesListResponse(items=[], total=0, limit=limit, offset=offset)
    if date_from:
        q = q.gte("raw_articles.published_at", date_from.isoformat())
    if date_to:
        q = q.lte("raw_articles.published_at", date_to.isoformat())

    paged = q.range(offset, offset + limit - 1).execute()
    total = paged.count or 0
    rows = paged.data or []

    items = []
    for r in rows:
        raw = r.get("raw_articles") or {}
        src = raw.get("sources") or {}
        items.append(ArticleOut(
            id=r["id"],
            raw_article_id=r.get("raw_article_id"),
            summary=r.get("summary"),
            tags=r.get("tags"),
            entities=r.get("entities"),
            importance=r.get("importance"),
            importance_reason=r.get("importance_reason"),
            created_at=r.get("created_at"),
            title=raw.get("title"),
            url=raw.get("url"),
            content=raw.get("content"),
            published_at=raw.get("published_at"),
            source_name=src.get("name"),
            category=src.get("category"),
        ))

    # Sort by publication date descending (Supabase can't order by nested table cols)
    items.sort(key=lambda x: x.published_at or "", reverse=True)

    return ArticlesListResponse(items=items, total=total, limit=limit, offset=offset)
