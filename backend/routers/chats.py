"""
/api/chats — API for managing chat sessions
"""
from __future__ import annotations
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.database import get_client

router = APIRouter(prefix="/api/chats", tags=["chats"])
logger = logging.getLogger(__name__)

class ChatSessionCreate(BaseModel):
    title: str = "Новый чат"

class ChatSessionUpdate(BaseModel):
    title: str

@router.get("")
async def get_chats():
    db = get_client()
    res = db.table("chat_sessions").select("*").order("updated_at", desc=True).execute()
    return res.data or []

@router.post("")
async def create_chat(body: ChatSessionCreate):
    db = get_client()
    res = db.table("chat_sessions").insert({"title": body.title}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create chat")
    return res.data[0]

@router.get("/{chat_id}")
async def get_chat_history(chat_id: str):
    db = get_client()
    session_res = db.table("chat_sessions").select("*").eq("id", chat_id).execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    msg_res = db.table("chat_messages").select("*").eq("session_id", chat_id).order("created_at", desc=False).execute()
    return {
        "session": session_res.data[0],
        "messages": msg_res.data or []
    }

@router.put("/{chat_id}")
async def update_chat(chat_id: str, body: ChatSessionUpdate):
    db = get_client()
    res = db.table("chat_sessions").update({"title": body.title, "updated_at": "now()"}).eq("id", chat_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    return res.data[0]

@router.delete("/{chat_id}")
async def delete_chat(chat_id: str):
    db = get_client()
    db.table("chat_sessions").delete().eq("id", chat_id).execute()
    return {"status": "ok"}
