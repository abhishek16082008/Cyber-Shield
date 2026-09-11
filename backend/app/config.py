"""Central configuration, loaded from environment variables (.env).

Nothing secret is hardcoded here. Provider keys and the JWT secret are read
from the environment. Missing provider keys are simply empty strings, which the
provider adapters treat as "not_configured" (never a false "safe" result).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve the file from this module so startup works from either the backend
# directory or the project root (for example, via npm run dev).
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


class Settings:
    # --- Auth / tokens ---
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-insecure-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "1440"))

    # --- CORS (which frontend origins may call this API) ---
    FRONTEND_ORIGINS: list[str] = _origins(
        os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:5174")
    )

    # --- Database ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cyber_shield.db")

    # --- Third-party provider keys (optional; empty => not_configured) ---
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
    GOOGLE_WEBRISK_API_KEY: str = os.getenv("GOOGLE_WEBRISK_API_KEY", "")
    ABUSEIPDB_API_KEY: str = os.getenv("ABUSEIPDB_API_KEY", "")
    MXTOOLBOX_API_KEY: str = os.getenv("MXTOOLBOX_API_KEY", "")
    MAXMIND_LICENSE_KEY: str = os.getenv("MAXMIND_LICENSE_KEY", "")
    # MaxMind IP lookups also need an account ID (the license key alone only
    # allows database downloads). Optional; empty => geolocation unavailable.
    MAXMIND_ACCOUNT_ID: str = os.getenv("MAXMIND_ACCOUNT_ID", "")


settings = Settings()
