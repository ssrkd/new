"""
Configuration — reads from .env via pydantic-settings
Environment variables always take priority over .env file values.
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_key: str = ""

    # ── LLM — OpenRouter (primary) ────────────────────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1/chat/completions"
    openrouter_model: str = "google/gemini-2.5-flash"

    # ── LLM — Groq (fallback, round-robin) ───────────────────
    groq_api_keys: str = ""

    @property
    def parsed_groq_keys(self) -> list[str]:
        if not self.groq_api_keys:
            return []
        import json
        try:
            parsed = json.loads(self.groq_api_keys)
            if isinstance(parsed, list):
                return [str(k).strip() for k in parsed if k]
        except Exception:
            pass
        return [k.strip() for k in self.groq_api_keys.split(',') if k.strip()]

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
    ingestion_interval_minutes: int = 10
    processing_interval_minutes: int = 12

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        # pydantic-settings reads env vars + .env automatically
        _settings = Settings()
        # Safety fallback for platforms that inject env vars late (e.g. Northflank)
        if not _settings.supabase_url:
            object.__setattr__(_settings, 'supabase_url', os.environ.get("SUPABASE_URL", ""))
            object.__setattr__(_settings, 'supabase_service_key', os.environ.get("SUPABASE_SERVICE_KEY", ""))
            object.__setattr__(_settings, 'openrouter_api_key', os.environ.get("OPENROUTER_API_KEY", ""))
            object.__setattr__(_settings, 'groq_api_keys', os.environ.get("GROQ_API_KEYS", ""))
    return _settings
