"""
/api/ingest & /api/process — manual trigger endpoints
"""
from fastapi import APIRouter, BackgroundTasks
from backend.workers.ingestion import run_ingestion
from backend.workers.processing import run_processing

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/ingest")
async def trigger_ingestion(background_tasks: BackgroundTasks):
    """Manually trigger RSS/Telegram ingestion."""
    from starlette.concurrency import run_in_threadpool
    import asyncio

    def _run_ingest_thread():
        # Run the async ingestion in a new event loop inside the thread
        asyncio.run(run_ingestion())

    background_tasks.add_task(run_in_threadpool, _run_ingest_thread)
    return {"status": "ok", "message": "Процесс сбора запущен в фоне (без блокировки БД)"}


@router.post("/process")
async def trigger_processing(background_tasks: BackgroundTasks):
    """Manually trigger LLM processing of raw articles."""
    from starlette.concurrency import run_in_threadpool
    import asyncio

    def _run_process_thread():
        # Run the async processing in a new event loop inside the thread
        asyncio.run(run_processing())

    background_tasks.add_task(run_in_threadpool, _run_process_thread)
    return {"status": "ok", "message": "Обработка LLM запущена в фоне (без блокировки БД)"}

