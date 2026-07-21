"""
APScheduler — background scheduler for ingestion and processing tasks.
Uses asyncio locks to prevent concurrent runs and DB overload.
"""
import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from backend.config import get_settings

logger = logging.getLogger(__name__)

import threading

# Prevents simultaneous ingestion+processing from hammering the DB
_ingestion_lock = threading.Lock()
_processing_lock = threading.Lock()

# Track last run timestamps for status display
_last_ingestion_at: datetime | None = None
_last_processing_at: datetime | None = None
_last_ingestion_result: dict = {}
_last_processing_result: dict = {}

_scheduler = None


def _run_ingestion():
    global _last_ingestion_at, _last_ingestion_result
    if not _ingestion_lock.acquire(blocking=False):
        logger.info("Scheduler: ingestion already running, skipping")
        return
    try:
        from backend.workers.ingestion import run_ingestion
        # Run async function in a new event loop inside this thread
        result = asyncio.run(run_ingestion())
        _last_ingestion_at = datetime.now(timezone.utc)
        _last_ingestion_result = result or {}
        logger.info(f"Scheduler: ingestion done at {_last_ingestion_at.isoformat()}")
    except Exception as e:
        logger.error(f"Scheduler: ingestion error: {e}")
    finally:
        _ingestion_lock.release()


def _run_processing():
    global _last_processing_at, _last_processing_result
    if not _processing_lock.acquire(blocking=False):
        logger.info("Scheduler: processing already running, skipping")
        return
    try:
        from backend.workers.processing import run_processing
        # Run async function in a new event loop inside this thread
        result = asyncio.run(run_processing())
        _last_processing_at = datetime.now(timezone.utc)
        _last_processing_result = result or {}
        logger.info(f"Scheduler: processing done at {_last_processing_at.isoformat()}")
    except Exception as e:
        logger.error(f"Scheduler: processing error: {e}")
    finally:
        _processing_lock.release()


def get_scheduler_status() -> dict:
    """Return current scheduler status for the /api/admin/status endpoint."""
    return {
        "ingestion_running": _ingestion_lock.locked(),
        "processing_running": _processing_lock.locked(),
        "last_ingestion_at": _last_ingestion_at.isoformat() if _last_ingestion_at else None,
        "last_processing_at": _last_processing_at.isoformat() if _last_processing_at else None,
        "last_ingestion_result": _last_ingestion_result,
        "last_processing_result": _last_processing_result,
    }


def start_scheduler():
    global _scheduler
    s = get_settings()
    _scheduler = BackgroundScheduler()

    from datetime import timedelta
    # Delay first run by 30 seconds so server is ready
    start_delay = datetime.now(timezone.utc) + timedelta(seconds=30)

    _scheduler.add_job(
        _run_ingestion,
        trigger=IntervalTrigger(minutes=s.ingestion_interval_minutes),
        id="ingestion",
        replace_existing=True,
        next_run_time=start_delay,
    )
    _scheduler.add_job(
        _run_processing,
        trigger=IntervalTrigger(minutes=s.processing_interval_minutes),
        id="processing",
        replace_existing=True,
        next_run_time=start_delay + timedelta(minutes=1),
    )

    _scheduler.start()
    logger.info(
        f"Scheduler started: ingestion every {s.ingestion_interval_minutes}min, "
        f"processing every {s.processing_interval_minutes}min"
        f" (first run at {start_delay.strftime('%H:%M:%S')} UTC)"
    )


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
