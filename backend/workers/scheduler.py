"""
APScheduler — background scheduler for ingestion and processing tasks.
"""
import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from backend.config import get_settings

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _run_ingestion():
    from backend.workers.ingestion import run_ingestion
    try:
        await run_ingestion()
    except Exception as e:
        logger.error(f"Scheduler: ingestion error: {e}")


async def _run_processing():
    from backend.workers.processing import run_processing
    try:
        await run_processing()
    except Exception as e:
        logger.error(f"Scheduler: processing error: {e}")


def start_scheduler():
    global _scheduler
    s = get_settings()
    _scheduler = AsyncIOScheduler()

    _scheduler.add_job(
        _run_ingestion,
        trigger=IntervalTrigger(minutes=s.ingestion_interval_minutes),
        id="ingestion",
        replace_existing=True,
    )
    _scheduler.add_job(
        _run_processing,
        trigger=IntervalTrigger(minutes=s.processing_interval_minutes),
        id="processing",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        f"Scheduler started: ingestion every {s.ingestion_interval_minutes}min, "
        f"processing every {s.processing_interval_minutes}min"
    )


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
