"""
/api/digest/daily — generate and retrieve daily digest by category
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta, date

from fastapi import APIRouter, HTTPException
from backend.database import get_client
from backend.llm_client import call_llm
from backend.models import DigestResponse, DigestCategoryItem

router = APIRouter(prefix="/api/digest", tags=["digest"])
logger = logging.getLogger(__name__)

CATEGORIES = ["казахстан", "мир", "дипломатия", "экономика", "безопасность"]

DIGEST_PROMPT = """Ты — аналитик новостей. Составь краткую аналитическую сводку за сегодня по категории "{category}".

ПРАВИЛА:
1. Используй ТОЛЬКО статьи из списка ниже.
2. Выдели 3-5 ключевых событий, каждое — 1-2 предложения.
3. В конце — 1-2 предложения общего вывода о тенденции.
4. Пиши на русском, нейтральным тоном.
5. Не добавляй информацию из общих знаний.

СТАТЬИ:
{articles}"""


def _today_range():
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now
    return start.isoformat(), end.isoformat()


@router.get("/daily", response_model=DigestResponse)
async def get_daily_digest():
    """Return the most recent digest for today (without regenerating)."""
    db = get_client()
    today = date.today().isoformat()

    result = (
        db.table("digests")
        .select("*")
        .eq("date", today)
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []

    if not rows:
        raise HTTPException(status_code=404, detail="Дайджест за сегодня ещё не сгенерирован")

    categories = [DigestCategoryItem(category=r["category"], content=r["content"]) for r in rows]
    return DigestResponse(
        date=today,
        categories=categories,
        generated_at=rows[0].get("created_at"),
    )


@router.post("/daily", response_model=DigestResponse)
async def generate_daily_digest():
    """Generate a fresh digest for today across all categories."""
    db = get_client()
    today = date.today().isoformat()
    start_iso, end_iso = _today_range()

    # Delete existing digests for today
    db.table("digests").delete().eq("date", today).execute()

    # Fetch today's processed articles with source category
    arts_res = (
        db.table("processed_articles")
        .select(
            "summary, tags, importance,"
            "raw_articles!inner(title, url, published_at,"
            "sources!inner(name, category))"
        )
        .gte("created_at", start_iso)
        .lte("created_at", end_iso)
        .execute()
    )
    all_articles = arts_res.data or []

    # Group by category using LLM tags
    by_category: dict[str, list[str]] = {cat: [] for cat in CATEGORIES}
    for art in all_articles:
        raw = art.get("raw_articles") or {}
        tags = art.get("tags") or []
        title = raw.get("title", "")
        summary = art.get("summary", "")
        
        for cat in CATEGORIES:
            if any(cat.lower() == str(t).lower() for t in tags):
                by_category[cat].append(f"- [{title}]: {summary}")

    # Generate digest per category via LLM
    digest_items = []
    for cat in CATEGORIES:
        articles_text = by_category.get(cat, [])
        if not articles_text:
            content = "Событий в данной категории за сегодня не зафиксировано."
        else:
            prompt_text = DIGEST_PROMPT.format(
                category=cat,
                articles="\n".join(articles_text[:30]),  # cap at 30
            )
            try:
                content = await call_llm(
                    [{"role": "user", "content": prompt_text}],
                    max_tokens=600,
                )
            except Exception as e:
                logger.error(f"Digest LLM failed for {cat}: {e}")
                content = "Ошибка генерации сводки."

        # Save to DB
        db.table("digests").insert({
            "date": today,
            "category": cat,
            "content": content,
        }).execute()

        digest_items.append(DigestCategoryItem(category=cat, content=content))

    return DigestResponse(
        date=today,
        categories=digest_items,
        generated_at=datetime.now(timezone.utc),
    )
