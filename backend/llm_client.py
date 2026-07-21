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
        keys = get_settings().groq_api_keys
        _groq_key_cycle = itertools.cycle(keys)
    return _groq_key_cycle


async def _call_openrouter(messages: list[dict], max_tokens: int = 1024, system: str | None = None) -> str:
    s = get_settings()
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
                "model": s.openrouter_model,
                "messages": full_messages,
                "temperature": 0,
                "max_tokens": max_tokens,
            },
        )
        data = resp.json()
        if resp.status_code != 200 or "error" in data:
            raise ValueError(f"OpenRouter error: {data.get('error', resp.text)}")
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


async def call_llm(messages: list[dict], max_tokens: int = 1024, system: str | None = None, temperature: int = 0) -> str:
    """
    Call LLM with OpenRouter primary, Groq fallback.
    Always temperature=0.
    """
    try:
        return await _call_openrouter(messages, max_tokens, system=system)
    except Exception as e:
        logger.warning(f"OpenRouter failed ({e}), trying Groq fallback...")

    # Try Groq (up to 4 keys via round-robin)
    last_error = None
    for _ in range(len(get_settings().groq_api_keys)):
        try:
            return await _call_groq(messages, max_tokens, system=system)
        except Exception as e:
            logger.warning(f"Groq key failed: {e}")
            last_error = e

    raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")


async def call_llm_json(messages: list[dict], max_tokens: int = 1024) -> dict[str, Any]:
    """
    Call LLM and parse JSON response. Retries once on parse failure.
    """
    for attempt in range(2):
        raw = await call_llm(messages, max_tokens)
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
