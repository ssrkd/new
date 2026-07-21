"""
Ingestion worker — fetches articles from RSS and Telegram sources.
Deduplicates by URL. Runs on scheduler every 30 min.
"""
from __future__ import annotations
import logging
import hashlib
from datetime import datetime, timezone
from typing import Optional

import feedparser
import httpx
from bs4 import BeautifulSoup

from backend.database import get_client

logger = logging.getLogger(__name__)


def _clean_html(raw: str) -> str:
    """Strip HTML tags from content."""
    if not raw:
        return ""
    return BeautifulSoup(raw, "lxml").get_text(separator=" ", strip=True)


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


async def fetch_rss(source: dict) -> int:
    """
    Fetch articles from an RSS source.
    Returns number of new articles inserted.
    """
    db = get_client()
    feed = feedparser.parse(source["url"])
    inserted = 0

    for entry in feed.entries:
        url = entry.get("link", "").strip()
        if not url:
            continue

        title = entry.get("title", "").strip()
        content = _clean_html(
            entry.get("content", [{}])[0].get("value", "")
            or entry.get("summary", "")
        )
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            import time
            ts = time.mktime(entry.published_parsed)
            published_at = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

        row = {
            "source_id": source["id"],
            "title": title,
            "content": content[:50000],  # cap to 50k chars
            "url": url,
            "published_at": published_at,
        }

        try:
            # upsert — ignore if url already exists
            result = db.table("raw_articles").upsert(
                row, on_conflict="url", ignore_duplicates=True
            ).execute()
            if result.data:
                inserted += len(result.data)
        except Exception as e:
            # Duplicate key or other error — skip silently
            logger.debug(f"Skipped {url}: {e}")

    logger.info(f"[RSS] {source['name']}: {inserted} new articles")
    return inserted


async def fetch_telegram(source: dict) -> int:
    """
    Fetch messages from a Telegram channel via Telethon.
    Only runs if TELEGRAM_API_ID/HASH are configured.
    """
    from backend.config import get_settings
    s = get_settings()

    if not s.telegram_api_id or not s.telegram_api_hash:
        logger.warning(f"Telegram credentials not configured, skipping {source['name']}")
        return 0

    try:
        from telethon import TelegramClient
        from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
    except ImportError:
        logger.error("telethon not installed")
        return 0

    db = get_client()
    channel_url = source["url"]  # e.g. "https://t.me/channel_name" or "@channel_name"
    channel = channel_url.replace("https://t.me/", "@") if "t.me/" in channel_url else channel_url

    client = TelegramClient(s.telegram_session, int(s.telegram_api_id), s.telegram_api_hash)
    inserted = 0
    try:
        await client.start()
        async for msg in client.iter_messages(channel, limit=50):
            if not msg.text:
                continue
            url = f"https://t.me/{channel.lstrip('@')}/{msg.id}"
            row = {
                "source_id": source["id"],
                "title": msg.text[:200],
                "content": msg.text[:50000],
                "url": url,
                "published_at": msg.date.isoformat() if msg.date else None,
            }
            try:
                result = db.table("raw_articles").upsert(
                    row, on_conflict="url", ignore_duplicates=True
                ).execute()
                if result.data:
                    inserted += len(result.data)
            except Exception as e:
                logger.debug(f"Skipped {url}: {e}")
    finally:
        await client.disconnect()

    logger.info(f"[Telegram] {source['name']}: {inserted} new messages")
    return inserted


async def fetch_scraped(source: dict) -> int:
    """
    Fetch articles for a 'scraper' type source using our gov HTML scrapers.
    The source row must have a 'slug' field matching a key in GOV_SCRAPERS.
    """
    from backend.scrapers.gov import run_scraper, fetch_article_content, GOV_SCRAPERS

    db = get_client()
    # Map source name → slug. Try exact, then slugify name, then use URL hostname.
    name_lower = source.get("name", "").lower()
    slug = None
    for key in GOV_SCRAPERS:
        if key in name_lower:
            slug = key
            break
    if not slug:
        slug = name_lower.replace(" ", "_").replace("(", "").replace(")", "")
    articles = await run_scraper(slug)

    inserted = 0
    for art in articles:
        url = art.get("url", "").strip()
        if not url:
            continue

        # Fetch full content if not already provided
        content = art.get("content", "").strip()
        if not content:
            try:
                content = await fetch_article_content(url)
            except Exception:
                content = ""

        row = {
            "source_id": source["id"],
            "title": art.get("title", "")[:500],
            "content": content[:50000],
            "url": url,
            "published_at": art.get("published_at"),
        }

        try:
            result = db.table("raw_articles").upsert(
                row, on_conflict="url", ignore_duplicates=True
            ).execute()
            if result.data:
                inserted += len(result.data)
        except Exception as e:
            logger.debug(f"Skipped scraped {url}: {e}")

    logger.info(f"[Scraper] {source['name']} ({slug}): {inserted} new articles")
    return inserted


async def run_ingestion() -> dict:
    """
    Main ingestion task — fetches from all active sources.
    Supports rss, telegram, and scraper source types.
    """
    db = get_client()
    sources_res = db.table("sources").select("*").eq("active", True).execute()
    sources = sources_res.data or []

    total_rss = 0
    total_tg = 0
    total_scraper = 0

    for src in sources:
        try:
            if src["type"] == "rss":
                total_rss += await fetch_rss(src)
            elif src["type"] == "telegram":
                total_tg += await fetch_telegram(src)
            elif src["type"] == "scraper":
                total_scraper += await fetch_scraped(src)
        except Exception as e:
            logger.error(f"Ingestion error for {src['name']}: {e}")

    logger.info(
        f"[Ingestion] Done: {total_rss} RSS + {total_tg} Telegram + {total_scraper} Scraped"
    )
    return {"rss": total_rss, "telegram": total_tg, "scraper": total_scraper}
