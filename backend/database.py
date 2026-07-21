"""
Supabase client singleton
"""
from supabase import create_client, Client
from functools import lru_cache
from backend.config import get_settings


@lru_cache
def get_client() -> Client:
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
        )
    return create_client(s.supabase_url, s.supabase_service_key)
