"""
/api/memory — API for managing user memory
"""
from __future__ import annotations
import logging
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.database import get_client

router = APIRouter(prefix="/api/memory", tags=["memory"])
logger = logging.getLogger(__name__)

class MemoryUpdate(BaseModel):
    profile: dict

# Simple in-memory cache — avoids repeated Supabase calls on every page load
_memory_cache: dict = {}
_memory_cache_ts: float = 0
_CACHE_TTL = 30  # seconds

@router.get("")
async def get_memory():
    global _memory_cache, _memory_cache_ts
    now = time.time()
    if _memory_cache and (now - _memory_cache_ts) < _CACHE_TTL:
        return _memory_cache

    db = get_client()
    res = db.table("user_memory").select("*").eq("id", 1).execute()
    if not res.data:
        db.table("user_memory").insert({"id": 1, "profile": {}}).execute()
        _memory_cache = {"profile": {}}
    else:
        _memory_cache = {"profile": res.data[0].get("profile", {})}
    _memory_cache_ts = now
    return _memory_cache

@router.put("")
async def update_memory(body: MemoryUpdate):
    global _memory_cache, _memory_cache_ts
    db = get_client()
    res = db.table("user_memory").update({
        "profile": body.profile,
        "updated_at": "now()"
    }).eq("id", 1).execute()
    
    if not res.data:
        res = db.table("user_memory").insert({
            "id": 1,
            "profile": body.profile
        }).execute()
    
    # Invalidate cache on update
    _memory_cache = {"profile": res.data[0].get("profile", {})}
    _memory_cache_ts = time.time()
    return {"status": "ok", "profile": _memory_cache["profile"]}

