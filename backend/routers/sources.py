"""
/api/sources — CRUD for news sources table
"""
from __future__ import annotations
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from backend.database import get_client
from backend.models import SourceCreate, SourceUpdate, SourceOut

router = APIRouter(prefix="/api/sources", tags=["sources"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[SourceOut])
async def list_sources():
    db = get_client()
    result = db.table("sources").select("*").order("created_at", desc=False).execute()
    return result.data or []


@router.post("", response_model=SourceOut, status_code=201)
async def create_source(body: SourceCreate):
    db = get_client()
    result = db.table("sources").insert(body.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create source")
    return result.data[0]


@router.patch("/{source_id}", response_model=SourceOut)
async def update_source(source_id: str, body: SourceUpdate):
    db = get_client()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("sources").update(updates).eq("id", source_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Source not found")
    return result.data[0]


@router.delete("/{source_id}", status_code=204)
async def delete_source(source_id: str):
    db = get_client()
    db.table("sources").delete().eq("id", source_id).execute()
