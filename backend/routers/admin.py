"""
/api/admin — manual trigger endpoints + status.
All heavy tasks run fully in background (asyncio) to never block the DB or AI chats.
"""
import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

# Global flag so only ONE combined run can be active at a time
_full_run_lock = asyncio.Lock()


async def _background_full_run():
    """Run ingestion THEN processing sequentially in the background event loop."""
    if _full_run_lock.locked():
        logger.info("Admin: full run already in progress, skipping duplicate trigger")
        return
    async with _full_run_lock:
        # ---- INGESTION ----
        try:
            from backend.workers.ingestion import run_ingestion
            logger.info("Admin: starting ingestion in background…")
            result = await run_ingestion()
            logger.info(f"Admin: ingestion done → {result}")
        except Exception as e:
            logger.error(f"Admin: ingestion error: {e}")

        # ---- PROCESSING ----
        try:
            from backend.workers.processing import run_processing
            logger.info("Admin: starting processing in background…")
            result = await run_processing()
            logger.info(f"Admin: processing done → {result}")
        except Exception as e:
            logger.error(f"Admin: processing error: {e}")


@router.post("/ingest")
async def trigger_ingestion():
    """Manually trigger RSS/Telegram ingestion (non-blocking, runs in background)."""
    # Schedule on the running event loop — never blocks HTTP response
    asyncio.get_event_loop().create_task(_background_full_run())
    return {"status": "ok", "message": "Сбор и обработка запущены в фоне"}


@router.post("/process")
async def trigger_processing():
    """Manually trigger LLM processing (non-blocking, runs in background)."""
    asyncio.get_event_loop().create_task(_background_full_run())
    return {"status": "ok", "message": "Обработка запущена в фоне"}


@router.get("/status")
async def get_status():
    """Return scheduler status + last run timestamps."""
    from backend.workers.scheduler import get_scheduler_status
    status = get_scheduler_status()
    status["manual_run_active"] = _full_run_lock.locked()
    return status
