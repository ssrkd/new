"""
Web Search — Tavily API integration for Jack AI.
Used when the local vector DB has no relevant documents for a query.
Results are injected into the LLM context and optionally saved to DB for future use.
"""
from __future__ import annotations
import logging
from urllib.parse import urlparse

import httpx

from backend.config import get_settings

logger = logging.getLogger(__name__)
TAVILY_SEARCH_URL = "https://api.tavily.com/search"


async def web_search(query: str, max_results: int = 5) -> list[dict]:
    """Search the web using Tavily. Returns list of doc-like dicts."""
    s = get_settings()
    if not s.tavily_api_key:
        logger.warning("Tavily API key not set, skipping web search")
        return []

    payload = {
        "api_key": s.tavily_api_key,
        "query": query,
        "search_depth": "basic",
        "include_answer": False,
        "include_raw_content": False,
        "max_results": max_results,
    }
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.post(TAVILY_SEARCH_URL, json=payload)
        if resp.status_code != 200:
            logger.error(f"Tavily {resp.status_code}: {resp.text[:200]}")
            return []
        results = resp.json().get("results", [])
        formatted = []
        for r in results:
            domain = _domain(r.get("url", ""))
            formatted.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
                "published_at": r.get("published_date") or None,
                "source_name": domain,
                "similarity": 0.75,
                "from_web": True,
            })
        logger.info(f"Tavily: {len(formatted)} results for '{query[:60]}'")
        return formatted
    except Exception as e:
        logger.error(f"Tavily failed: {e}")
        return []


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "") or url[:30]
    except Exception:
        return url[:30]


async def save_web_results_to_db(db, results: list[dict]) -> None:
    """Cache top 3 Tavily results into raw_articles table."""
    for r in results[:3]:
        try:
            existing = db.table("raw_articles").select("id").eq("url", r["url"]).execute()
            if existing.data:
                continue
            db.table("raw_articles").insert({
                "title": r["title"],
                "url": r["url"],
                "content": r["content"][:3000],
                "published_at": r.get("published_at"),
                "source_name": r["source_name"],
                "ingested_at": "now()",
            }).execute()
        except Exception as e:
            logger.warning(f"Cache web result failed: {e}")
