"""
Processing worker — takes unprocessed raw_articles, calls LLM for
summary/tags/entities/importance, computes embeddings, stores in processed_articles.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone

from backend.database import get_client
from backend.embeddings import embed_text
from backend.llm_client import call_llm_json

logger = logging.getLogger(__name__)

# ── Prompt 4.1 (verbatim from spec) ──────────────────────────────────────────
PROCESSING_PROMPT = """Ты — аналитик, обрабатывающий новостные статьи для системы мониторинга.

ПРАВИЛА (строго обязательны):
1. Используй ТОЛЬКО текст статьи ниже. Не добавляй факты из общих знаний.
2. Если что-то в статье неясно или неполно — явно отметь как "неопределённо", не додумывай.
3. Обязательно переведи заголовок на русский язык (если он на английском или другом).
4. В массив "tags" ОБЯЗАТЕЛЬНО включи одну или несколько из этих базовых категорий: казахстан, мир, дипломатия, экономика, безопасность. Плюс любые другие теги.
5. Отвечай ТОЛЬКО валидным JSON по схеме:
{{
  "translated_title": "Заголовок на русском",
  "translated_content": "Полный текст новости на русском языке. Переведи исходный текст (разверни если он слишком короткий).",
  "summary": "строка, 2-4 предложения",
  "tags": ["казахстан", "политика", "..."],
  "entities": {{"countries": [], "organizations": [], "people": []}},
  "importance": "low" | "medium" | "high",
  "importance_reason": "краткое обоснование одной строкой"
}}
6. Никогда не меняй ключи и структуру JSON.

ТЕКСТ СТАТЬИ:
{article_text}"""


def _build_article_text(raw: dict) -> str:
    parts = []
    if raw.get("title"):
        parts.append(f"ЗАГОЛОВОК: {raw['title']}")
    if raw.get("content"):
        # Limit to ~6000 chars to stay within context
        parts.append(f"ТЕКСТ: {raw['content'][:6000]}")
    return "\n\n".join(parts)


async def process_article(raw: dict) -> bool:
    """
    Process a single raw_article: LLM analysis + embedding + save.
    Returns True on success.
    """
    db = get_client()
    article_text = _build_article_text(raw)
    if not article_text.strip():
        logger.warning(f"Empty article {raw['id']}, marking processed.")
        db.table("raw_articles").update({"is_processed": True}).eq("id", raw["id"]).execute()
        return False

    prompt = PROCESSING_PROMPT.format(article_text=article_text)
    messages = [{"role": "user", "content": prompt}]

    try:
        result = await call_llm_json(messages, max_tokens=2000)
    except Exception as e:
        logger.error(f"LLM failed for article {raw['id']}: {e}")
        return False

    # Validate required keys
    required = {"summary", "tags", "entities", "importance", "importance_reason"}
    if not required.issubset(result.keys()):
        logger.error(f"LLM JSON missing keys for {raw['id']}: {result.keys()}")
        return False

    # Normalise importance
    importance = result.get("importance", "low")
    if importance not in ("low", "medium", "high"):
        importance = "low"

    # Compute embedding from summary + title
    embed_input = f"{raw.get('title', '')} {result['summary']}"
    try:
        embedding = embed_text(embed_input)
    except Exception as e:
        logger.error(f"Embedding failed for {raw['id']}: {e}")
        return False

    # Upsert processed_articles
    pa_row = {
        "raw_article_id": raw["id"],
        "summary": result["summary"],
        "tags": result["tags"],
        "entities": result["entities"],
        "importance": importance,
        "importance_reason": result["importance_reason"],
        "embedding": embedding,
    }
    
    # Update raw article with translated title and content
    new_title = result.get("translated_title") or raw.get("title")
    new_content = result.get("translated_content") or raw.get("content")

    try:
        db.table("processed_articles").insert(pa_row).execute()
        db.table("raw_articles").update({
            "is_processed": True,
            "title": new_title,
            "content": new_content
        }).eq("id", raw["id"]).execute()
        
        # Check and send Telegram Notification
        from backend.workers.telegram_bot import should_notify, send_telegram_notification
        if should_notify(pa_row):
            # run asynchronously without blocking
            import asyncio
            asyncio.get_event_loop().run_in_executor(None, send_telegram_notification, pa_row, raw.get("url"))

        return True
    except Exception as e:
        logger.error(f"DB insert failed for {raw['id']}: {e}")
        return False


async def run_processing(batch_size: int = 50) -> dict:
    """
    Process a batch of unprocessed articles.
    """
    db = get_client()
    unprocessed = (
        db.table("raw_articles")
        .select("*")
        .eq("is_processed", False)
        .order("published_at", desc=True, nullsfirst=False)
        .limit(batch_size)
        .execute()
    )
    articles = unprocessed.data or []

    if not articles:
        logger.info("[Processing] No unprocessed articles found.")
        return {"processed": 0, "failed": 0}

    ok = 0
    failed = 0
    for art in articles:
        success = await process_article(art)
        if success:
            ok += 1
        else:
            failed += 1

    logger.info(f"[Processing] Done: {ok} OK, {failed} failed (batch of {len(articles)})")
    return {"processed": ok, "failed": failed}
