"""
LLM client — OpenRouter (Gemini 2.5 Flash) primary,
              Groq (Llama 3.3 70B) round-robin fallback
temperature = 0 for all analytical tasks
"""
import json
import logging
import itertools
from typing import Any

import httpx

from backend.config import get_settings

logger = logging.getLogger(__name__)

_groq_key_cycle = None


def _get_groq_key_cycle():
    global _groq_key_cycle
    if _groq_key_cycle is None:
        keys = get_settings().parsed_groq_keys
        if not keys:
            keys = [""]
        _groq_key_cycle = itertools.cycle(keys)
    return _groq_key_cycle


async def _call_gemini(messages: list[dict], max_tokens: int = 1024, system: str | None = None) -> str:
    s = get_settings()
    if not s.gemini_api_key:
        raise ValueError("Gemini API key not configured")
    full_messages = ([{"role": "system", "content": system}] if system else []) + messages
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            s.gemini_base_url,
            headers={
                "Authorization": f"Bearer {s.gemini_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": s.gemini_model,
                "messages": full_messages,
                "temperature": 0,
                "max_tokens": max_tokens,
            },
        )
        data = resp.json()
        if resp.status_code != 200 or "error" in data:
            raise ValueError(f"Gemini API error: {data.get('error', resp.text)}")
        return data["choices"][0]["message"]["content"]



async def _call_openrouter(messages: list[dict], max_tokens: int = 1024, system: str | None = None, model: str | None = None) -> str:
    s = get_settings()
    target_model = model or s.openrouter_model
    full_messages = ([{"role": "system", "content": system}] if system else []) + messages
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            s.openrouter_base_url,
            headers={
                "Authorization": f"Bearer {s.openrouter_api_key}",
                "HTTP-Referer": "https://diplomat.local",
                "X-Title": "Diplomat Analytics",
                "Content-Type": "application/json",
            },
            json={
                "model": target_model,
                "messages": full_messages,
                "temperature": 0,
                "max_tokens": max_tokens,
            },
        )
        data = resp.json()
        if resp.status_code != 200 or "error" in data:
            raise ValueError(f"OpenRouter error ({target_model}): {data.get('error', resp.text)}")
        return data["choices"][0]["message"]["content"]


async def _call_groq(messages: list[dict], max_tokens: int = 1024, system: str | None = None) -> str:
    s = get_settings()
    key = next(_get_groq_key_cycle())
    full_messages = ([{"role": "system", "content": system}] if system else []) + messages
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            s.groq_base_url,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": s.groq_model,
                "messages": full_messages,
                "temperature": 0,
                "max_completion_tokens": max_tokens,
            },
        )
        data = resp.json()
        if "error" in data:
            raise ValueError(f"Groq error: {data['error']['message']}")
        return data["choices"][0]["message"]["content"]


async def call_llm_for_news(messages: list[dict], max_tokens: int = 1024, system: str | None = None, temperature: int = 0) -> str:
    """
    Call LLM for news processing.
    Order: Groq -> OpenRouter -> Gemini.
    """
    last_error = None
    # 1. Primary: Groq
    keys = get_settings().parsed_groq_keys
    for _ in range(max(len(keys), 1)):
        try:
            return await _call_groq(messages, max_tokens, system=system)
        except Exception as e:
            logger.warning(f"Groq key failed: {e}")
            last_error = e

    # 2. Fallback: OpenRouter
    try:
        return await _call_openrouter(messages, max_tokens, system=system)
    except Exception as e:
        logger.warning(f"OpenRouter news fallback failed ({e}), trying Gemini...")
        last_error = e
        
    # 3. Fallback: Gemini
    try:
        if get_settings().gemini_api_key:
            return await _call_gemini(messages, max_tokens, system=system)
    except Exception as e:
        logger.warning(f"Gemini news fallback failed ({e}).")
        last_error = e

    raise RuntimeError(f"All LLM providers failed for news. Last error: {last_error}")


async def call_llm_for_chat(messages: list[dict], max_tokens: int = 1024, system: str | None = None, temperature: int = 0) -> str:
    """
    Call LLM for interactive AI Chat.
    Order: Groq -> OpenRouter -> Gemini.
    """
    last_error = None
    
    # 1. Primary: Groq (for speed)
    keys = get_settings().parsed_groq_keys
    for _ in range(max(len(keys), 1)):
        try:
            return await _call_groq(messages, max_tokens, system=system)
        except Exception as e:
            logger.warning(f"Groq chat key failed: {e}")
            last_error = e

    # 2. Fallback: OpenRouter
    try:
        return await _call_openrouter(messages, max_tokens, system=system)
    except Exception as e:
        logger.warning(f"OpenRouter chat fallback failed ({e}), trying Gemini...")
        last_error = e

    # 3. Fallback: Gemini
    try:
        if get_settings().gemini_api_key:
            return await _call_gemini(messages, max_tokens, system=system)
    except Exception as e:
        logger.warning(f"Gemini chat fallback failed ({e}).")
        last_error = e

    raise RuntimeError(f"All LLM providers failed for chat. Last error: {last_error}")


async def call_llm_json_for_news(messages: list[dict], max_tokens: int = 1024) -> dict[str, Any]:
    """
    Call LLM and parse JSON response. Retries once on parse failure.
    """
    for attempt in range(2):
        raw = await call_llm_for_news(messages, max_tokens)
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse failed (attempt {attempt+1}): {e}\nRaw: {raw[:200]}")
            if attempt == 0:
                # Add correction message for retry
                messages = messages + [
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content": "Ответ не является валидным JSON. Повтори, вернув ТОЛЬКО валидный JSON без markdown-разметки."}
                ]

    raise ValueError("Failed to get valid JSON from LLM after 2 attempts")
