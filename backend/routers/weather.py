"""
/api/weather — Weather API integration using OpenStreetMap and Open-Meteo
"""
from __future__ import annotations
import logging
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/weather", tags=["weather"])
logger = logging.getLogger(__name__)

async def get_coordinates(address: str) -> tuple[float, float] | None:
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json", "limit": 1}
    headers = {"User-Agent": "DiplomatAnalytics/1.0"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers=headers)
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.error(f"Geocoding failed for {address}: {e}")
    return None

async def get_weather_by_coords(lat: float, lon: float) -> dict | None:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": "true"
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            return resp.json().get("current_weather")
    except Exception as e:
        logger.error(f"Weather fetch failed: {e}")
    return None

async def get_weather_for_address(address: str) -> dict | None:
    if not address:
        return None
    coords = await get_coordinates(address)
    if not coords:
        return None
    return await get_weather_by_coords(*coords)

@router.get("")
async def weather(address: str = ""):
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")
    w = await get_weather_for_address(address)
    if not w:
        raise HTTPException(status_code=404, detail="Weather not found")
    return w
