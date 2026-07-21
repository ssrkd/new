"""
Configuration — reads from .env via pydantic-settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_key: str = ""

    # ── LLM — OpenRouter (primary) ────────────────────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1/chat/completions"
    openrouter_model: str = "google/gemini-2.5-flash"

    # ── LLM — Groq (fallback, round-robin) ───────────────────
    groq_api_keys: list[str] = []
    groq_base_url: str = "https://api.groq.com/openai/v1/chat/completions"
    groq_model: str = "llama-3.3-70b-versatile"

    # ── Telegram Config ──────────────────────────────────────
    telegram_session: str = "diplomat_session"
    telegram_api_id: str = ""
    telegram_api_hash: str = ""
    telegram_bot_token: str = "8625561904:AAG-nOP532tMvjC39shR_QYY9jXlXwa8xcw"
    telegram_chat_id: str = "996317285"

    # ── Optional Bearer token (simple API protection) ─────────
    access_token: str = ""

    # ── Embedding model (local, no API key needed) ────────────
    embedding_model: str = "paraphrase-multilingual-mpnet-base-v2"

    # ── Scheduler intervals (minutes) ─────────────────────────
    # Ingestion: collect raw articles from all sources
    ingestion_interval_minutes: int = 10
    # Processing: LLM analysis of collected articles (runs right after ingestion)
    processing_interval_minutes: int = 12

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
