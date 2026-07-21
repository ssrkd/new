"""
gov.py — скраперы для казахстанских госорганов
Используется когда у источника нет RSS-ленты.
Каждый класс реализует метод fetch() → list[dict(title, url, content, published_at)]
"""
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

TIMEOUT = 20.0
MAX_ARTICLES = 15  # per scraper call


def _clean(text: str) -> str:
    """Strip extra whitespace."""
    return re.sub(r"\s+", " ", text or "").strip()


def _parse_date(text: str) -> Optional[str]:
    """Try to parse common Kazakh/Russian date strings into ISO 8601 UTC."""
    if not text:
        return None
    text = _clean(text)
    formats = [
        "%d.%m.%Y",
        "%d-%m-%Y",
        "%d %B %Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d %b %Y",
    ]
    ru_months = {
        "января": "january", "февраля": "february", "марта": "march",
        "апреля": "april", "мая": "may", "июня": "june",
        "июля": "july", "августа": "august", "сентября": "september",
        "октября": "october", "ноября": "november", "декабря": "december",
    }
    lowered = text.lower()
    for ru, en in ru_months.items():
        lowered = lowered.replace(ru, en)
    for fmt in formats:
        try:
            dt = datetime.strptime(lowered, fmt)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return None


async def _fetch_html(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=TIMEOUT) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.text
    except Exception as e:
        logger.warning(f"[scraper] Failed to fetch {url}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Akorda (Официальный сайт Президента РК)  akorda.kz
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_akorda(limit: int = MAX_ARTICLES) -> list[dict]:
    """https://www.akorda.kz/ru/news"""
    base = "https://www.akorda.kz"
    url = f"{base}/ru/news"
    html = await _fetch_html(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    articles = []

    for card in soup.select("div.news-list__item, article.news-item, li.news-item")[:limit]:
        a_tag = card.find("a", href=True)
        if not a_tag:
            continue
        href = urljoin(base, a_tag["href"])
        title = _clean(a_tag.get_text())
        if not title:
            title_tag = card.find(["h2", "h3", "h4"])
            title = _clean(title_tag.get_text()) if title_tag else ""

        date_tag = card.find(class_=re.compile(r"date|time", re.I))
        published_at = _parse_date(date_tag.get_text() if date_tag else "")

        articles.append({
            "title": title,
            "url": href,
            "content": "",
            "published_at": published_at or datetime.now(timezone.utc).isoformat(),
        })

    logger.info(f"[akorda] scraped {len(articles)} articles")
    return articles


# ─────────────────────────────────────────────────────────────────────────────
# МВД (Министерство внутренних дел РК)  mvd.gov.kz  / polisia.kz
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_mvd(limit: int = MAX_ARTICLES) -> list[dict]:
    """https://www.gov.kz/memleket/entities/mvd/press/news"""
    base = "https://www.gov.kz"
    url = f"{base}/memleket/entities/mvd/press/news"
    html = await _fetch_html(url)
    if not html:
        # try direct site
        html = await _fetch_html("https://www.polisia.kz/")
        if not html:
            return []
        base = "https://www.polisia.kz"
        url = base

    soup = BeautifulSoup(html, "lxml")
    articles = _parse_gov_kz_news_list(soup, base, limit)
    logger.info(f"[mvd] scraped {len(articles)} articles")
    return articles


# ─────────────────────────────────────────────────────────────────────────────
# КНБ (Комитет национальной безопасности РК)
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_knb(limit: int = MAX_ARTICLES) -> list[dict]:
    base = "https://www.gov.kz"
    url = f"{base}/memleket/entities/knb/press/news"
    html = await _fetch_html(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")
    articles = _parse_gov_kz_news_list(soup, base, limit)
    logger.info(f"[knb] scraped {len(articles)} articles")
    return articles


# ─────────────────────────────────────────────────────────────────────────────
# Антикор (Агентство по противодействию коррупции РК)
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_anticorruption(limit: int = MAX_ARTICLES) -> list[dict]:
    base = "https://www.gov.kz"
    url = f"{base}/memleket/entities/anticorruption/press/news"
    html = await _fetch_html(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")
    articles = _parse_gov_kz_news_list(soup, base, limit)
    logger.info(f"[anticorruption] scraped {len(articles)} articles")
    return articles


# ─────────────────────────────────────────────────────────────────────────────
# АФМ (Агентство финансового мониторинга РК)
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_afm(limit: int = MAX_ARTICLES) -> list[dict]:
    base = "https://www.gov.kz"
    url = f"{base}/memleket/entities/afm/press/news"
    html = await _fetch_html(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")
    articles = _parse_gov_kz_news_list(soup, base, limit)
    logger.info(f"[afm] scraped {len(articles)} articles")
    return articles


# ─────────────────────────────────────────────────────────────────────────────
# Генеральная Прокуратура РК
# ─────────────────────────────────────────────────────────────────────────────
async def scrape_prosecutor(limit: int = MAX_ARTICLES) -> list[dict]:
    base = "https://www.gov.kz"
    url = f"{base}/memleket/entities/qazaqstanrespublikasybasgaprokurory/press/news"
    html = await _fetch_html(url)
    if not html:
        # fallback to qoldau.kz procurator
        base2 = "https://prokuror.gov.kz"
        html = await _fetch_html(f"{base2}/ru/news")
        if html:
            soup = BeautifulSoup(html, "lxml")
            articles = _parse_gov_kz_news_list(soup, base2, limit)
            logger.info(f"[prosecutor] scraped {len(articles)} articles (fallback)")
            return articles
        return []
    soup = BeautifulSoup(html, "lxml")
    articles = _parse_gov_kz_news_list(soup, base, limit)
    logger.info(f"[prosecutor] scraped {len(articles)} articles")
    return articles


# ─────────────────────────────────────────────────────────────────────────────
# Shared parser for gov.kz portal pages
# ─────────────────────────────────────────────────────────────────────────────
def _parse_gov_kz_news_list(soup: BeautifulSoup, base: str, limit: int) -> list[dict]:
    """
    gov.kz portal uses a consistent card structure.
    Try several common selectors to be resilient to changes.
    """
    selectors = [
        "div.news-item",
        "li.news-item",
        "article.news-item",
        "div.press-item",
        "div.card",
        "a.news-list__item",
    ]
    cards = []
    for sel in selectors:
        found = soup.select(sel)
        if found:
            cards = found
            break

    # fallback — grab all <a> tags that look like article links
    if not cards:
        cards = soup.find_all("a", href=re.compile(r"/press/news/\d+|/news/\d+"))

    results = []
    seen = set()
    for card in cards[:limit]:
        a_tag = card if card.name == "a" else card.find("a", href=True)
        if not a_tag:
            continue
        href = urljoin(base, a_tag.get("href", ""))
        if href in seen:
            continue
        seen.add(href)

        # Title
        title_tag = card.find(["h2", "h3", "h4", "span", "p"], class_=re.compile(r"title|name|heading", re.I))
        if title_tag:
            title = _clean(title_tag.get_text())
        else:
            title = _clean(a_tag.get_text())

        if not title or len(title) < 5:
            continue

        # Date
        date_tag = card.find(class_=re.compile(r"date|time|published", re.I))
        published_at = _parse_date(date_tag.get_text() if date_tag else "")

        results.append({
            "title": title,
            "url": href,
            "content": "",
            "published_at": published_at or datetime.now(timezone.utc).isoformat(),
        })

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Fetch full article content for a scraped URL
# ─────────────────────────────────────────────────────────────────────────────
async def fetch_article_content(url: str) -> str:
    """Fetch the full text from an article page."""
    html = await _fetch_html(url)
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")

    # Remove nav / aside / script / style
    for tag in soup(["script", "style", "nav", "footer", "aside", "header"]):
        tag.decompose()

    # Try common content selectors
    for sel in ["article", "div.content", "div.article-text", "div.detail-text",
                "div.news-content", "div.entry-content", "main"]:
        el = soup.select_one(sel)
        if el:
            return _clean(el.get_text(separator=" "))

    return _clean(soup.get_text(separator=" "))[:3000]


# ─────────────────────────────────────────────────────────────────────────────
# Registry of all gov scrapers
# ─────────────────────────────────────────────────────────────────────────────
# Maps source slug → coroutine function
GOV_SCRAPERS: dict[str, any] = {
    "akorda": scrape_akorda,
    "mvd": scrape_mvd,
    "knb": scrape_knb,
    "anticorruption": scrape_anticorruption,
    "afm": scrape_afm,
    "prosecutor": scrape_prosecutor,
}


async def run_scraper(slug: str) -> list[dict]:
    """Run a single gov scraper by slug and return articles."""
    fn = GOV_SCRAPERS.get(slug)
    if not fn:
        logger.error(f"[scrapers] Unknown scraper slug: {slug}")
        return []
    return await fn()
