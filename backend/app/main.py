"""FastAPI application entry point.

Run locally:
    cd backend
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Interactive API docs: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from . import models  # noqa: F401  (ensures models are registered before create_all)
from .routers import auth, scans

# Create tables on startup (for production use Alembic migrations instead).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cyber Shield API", version="1.0.0")

# Allow the frontend origins to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(scans.router)


@app.get("/api/health")
def health():
    """Simple health check + which providers have a key configured."""
    return {
        "status": "ok",
        "providers_configured": {
            "virustotal": bool(settings.VIRUSTOTAL_API_KEY),
            "google_web_risk": bool(settings.GOOGLE_WEBRISK_API_KEY),
            "abuseipdb": bool(settings.ABUSEIPDB_API_KEY),
            "mxtoolbox": bool(settings.MXTOOLBOX_API_KEY),
            "maxmind": bool(settings.MAXMIND_LICENSE_KEY and settings.MAXMIND_ACCOUNT_ID),
        },
    }
