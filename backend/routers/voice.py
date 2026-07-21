from fastapi import APIRouter, UploadFile, File, HTTPException
import httpx
import random
import logging
from backend.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not settings.groq_api_keys:
        raise HTTPException(status_code=500, detail="Groq API keys not configured")
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    
    file_bytes = await file.read()
    
    api_key = random.choice(settings.groq_api_keys)
    
    files = {
        'file': (file.filename or "audio.webm", file_bytes, file.content_type or "audio/webm")
    }
    data = {
        'model': 'whisper-large-v3-turbo',
        'temperature': '0.0',
        # 'language': 'ru', # Let it auto-detect ru/kz/en
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, files=files, data=data, timeout=60.0)
            
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Groq Whisper error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        logger.exception("Failed to transcribe audio")
        raise HTTPException(status_code=500, detail=str(e))
