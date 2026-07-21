"""
FastAPI main application
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.workers.scheduler import start_scheduler, stop_scheduler
from backend.routers import articles, ask, digest, sources, admin, chats, memory, voice

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Diplomat Analytics backend…")
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()
    logger.info("Backend shut down.")


app = FastAPI(
    title="Diplomat Analytics API",
    description="Personal diplomatic/news analytics platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:5174",
        "http://localhost:7882",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://new-three-lemon-63.vercel.app",  # Vercel production
        "https://*.vercel.app",                    # any Vercel preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Optional Bearer-token auth middleware ─────────────────────────────────────
@app.middleware("http")
async def bearer_auth(request: Request, call_next):
    settings = get_settings()
    if not settings.access_token:
        # No token configured — open access
        return await call_next(request)

    # Skip auth for docs / health
    if request.url.path in ("/", "/docs", "/openapi.json", "/health"):
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {settings.access_token}":
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(articles.router)
app.include_router(ask.router)
app.include_router(digest.router)
app.include_router(sources.router)
app.include_router(admin.router)
app.include_router(chats.router)
app.include_router(memory.router)
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
