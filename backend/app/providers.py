"""Provider adapters — the only place third-party APIs are called.

Each adapter reads its key from settings (loaded from .env). If a key is
missing it returns status "not_configured" — NEVER a false "safe" result.
Network/auth failures return "unavailable" or "error". Keys are never logged.
"""

import asyncio
from urllib.parse import urlparse

import httpx

from .config import settings

_TIMEOUT = httpx.Timeout(15.0)


def _domain(url: str) -> str:
    net = urlparse(url).netloc or url
    return net.split("@")[-1].split(":")[0]


# ---------------------------------------------------------------------------
# VirusTotal — domain reputation for the URLs found in the email.
# ---------------------------------------------------------------------------
async def virustotal(client: httpx.AsyncClient, urls: list[str]) -> dict:
    key = settings.VIRUSTOTAL_API_KEY
    if not key:
        return {"provider": "VirusTotal", "status": "not_configured", "score": 0,
                "summary": "API key not configured."}
    domains = list(dict.fromkeys(_domain(u) for u in urls if _domain(u)))[:3]
    if not domains:
        return {"provider": "VirusTotal", "status": "ok", "score": 0, "summary": "No URLs to check."}
    try:
        malicious = 0
        for d in domains:
            r = await client.get(f"https://www.virustotal.com/api/v3/domains/{d}",
                                 headers={"x-apikey": key})
            if r.status_code == 200:
                stats = r.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                malicious += int(stats.get("malicious", 0))
            elif r.status_code in (401, 403):
                return {"provider": "VirusTotal", "status": "unavailable", "score": 0,
                        "summary": "Access denied (check key/plan)."}
        score = min(40, malicious * 8)
        return {"provider": "VirusTotal", "status": "ok", "score": score,
                "summary": f"{malicious} malicious detection(s) across {len(domains)} domain(s)."}
    except Exception:
        return {"provider": "VirusTotal", "status": "unavailable", "score": 0,
                "summary": "Provider request failed."}


# ---------------------------------------------------------------------------
# Google Web Risk — malicious URL lookup.
# ---------------------------------------------------------------------------
async def web_risk(client: httpx.AsyncClient, urls: list[str]) -> dict:
    key = settings.GOOGLE_WEBRISK_API_KEY
    if not key:
        return {"provider": "Google Web Risk", "status": "not_configured", "score": 0,
                "summary": "API key not configured."}
    if not urls:
        return {"provider": "Google Web Risk", "status": "ok", "score": 0, "summary": "No URLs to check."}
    try:
        hits = 0
        for u in urls[:3]:
            r = await client.get(
                "https://webrisk.googleapis.com/v1/uris:search",
                params=[("key", key), ("uri", u),
                        ("threatTypes", "MALWARE"),
                        ("threatTypes", "SOCIAL_ENGINEERING")])
            if r.status_code == 200:
                if r.json().get("threat"):
                    hits += 1
            elif r.status_code in (401, 403):
                # e.g. billing disabled on the GCP project.
                return {"provider": "Google Web Risk", "status": "unavailable", "score": 0,
                        "summary": "Access denied (enable the API / billing)."}
        return {"provider": "Google Web Risk", "status": "ok", "score": 35 if hits else 0,
                "summary": f"{hits} URL(s) flagged." if hits else "No threats matched."}
    except Exception:
        return {"provider": "Google Web Risk", "status": "unavailable", "score": 0,
                "summary": "Provider request failed."}


# ---------------------------------------------------------------------------
# AbuseIPDB — sending-IP reputation.
# ---------------------------------------------------------------------------
async def abuseipdb(client: httpx.AsyncClient, ip: str | None) -> dict:
    key = settings.ABUSEIPDB_API_KEY
    if not key:
        return {"provider": "AbuseIPDB", "status": "not_configured", "score": 0,
                "summary": "API key not configured."}
    if not ip:
        return {"provider": "AbuseIPDB", "status": "ok", "score": 0, "summary": "No sending IP found."}
    try:
        r = await client.get("https://api.abuseipdb.com/api/v2/check",
                             params={"ipAddress": ip, "maxAgeInDays": 90},
                             headers={"Key": key, "Accept": "application/json"})
        if r.status_code in (401, 403):
            return {"provider": "AbuseIPDB", "status": "unavailable", "score": 0,
                    "summary": "Access denied (check key)."}
        data = r.json().get("data", {})
        confidence = int(data.get("abuseConfidenceScore", 0))
        return {"provider": "AbuseIPDB", "status": "ok", "score": round(confidence * 0.4),
                "summary": f"IP abuse confidence {confidence}%.",
                "abuse_score": confidence}
    except Exception:
        return {"provider": "AbuseIPDB", "status": "unavailable", "score": 0,
                "summary": "Provider request failed."}


# ---------------------------------------------------------------------------
# MaxMind GeoLite — IP geolocation / ASN. Needs account id + license key.
# ---------------------------------------------------------------------------
async def maxmind(client: httpx.AsyncClient, ip: str | None) -> dict:
    key = settings.MAXMIND_LICENSE_KEY
    account = settings.MAXMIND_ACCOUNT_ID
    if not key:
        return {"provider": "MaxMind GeoLite", "status": "not_configured", "score": 0,
                "summary": "License key not configured."}
    if not account:
        return {"provider": "MaxMind GeoLite", "status": "unavailable", "score": 0,
                "summary": "Set MAXMIND_ACCOUNT_ID to enable IP geolocation."}
    if not ip:
        return {"provider": "MaxMind GeoLite", "status": "ok", "score": 0, "summary": "No sending IP found."}
    try:
        r = await client.get(f"https://geolite.info/geoip/v2.1/city/{ip}",
                             auth=(account, key))
        if r.status_code in (401, 403):
            return {"provider": "MaxMind GeoLite", "status": "unavailable", "score": 0,
                    "summary": "Access denied (check account id / key)."}
        j = r.json()
        country = j.get("country", {}).get("iso_code")
        traits = j.get("traits", {})
        asn = traits.get("autonomous_system_number")
        isp = traits.get("isp") or traits.get("autonomous_system_organization")
        return {"provider": "MaxMind GeoLite", "status": "ok", "score": 0,
                "summary": f"Origin {country or '?'}.",
                "geo": {"country": country, "asn": f"AS{asn}" if asn else None, "isp": isp}}
    except Exception:
        return {"provider": "MaxMind GeoLite", "status": "unavailable", "score": 0,
                "summary": "Provider request failed."}


# ---------------------------------------------------------------------------
# MXToolbox — blacklist check for the sender domain.
# ---------------------------------------------------------------------------
async def mxtoolbox(client: httpx.AsyncClient, domain: str | None) -> dict:
    key = settings.MXTOOLBOX_API_KEY
    if not key:
        return {"provider": "MXToolbox", "status": "not_configured", "score": 0,
                "summary": "API key not configured."}
    if not domain:
        return {"provider": "MXToolbox", "status": "ok", "score": 0, "summary": "No domain to check."}
    try:
        r = await client.get(f"https://api.mxtoolbox.com/api/v1/lookup/blacklist/{domain}",
                             headers={"Authorization": key})
        if r.status_code in (401, 403):
            return {"provider": "MXToolbox", "status": "unavailable", "score": 0,
                    "summary": "Access denied (check key)."}
        failed = r.json().get("Failed", []) if r.headers.get("content-type", "").startswith("application/json") else []
        n = len(failed)
        return {"provider": "MXToolbox", "status": "ok", "score": min(20, n * 10),
                "summary": f"{n} blacklist hit(s)." if n else "Not blacklisted."}
    except Exception:
        return {"provider": "MXToolbox", "status": "unavailable", "score": 0,
                "summary": "Provider request failed."}


async def run_all(urls: list[str], sending_ip: str | None, sender_domain: str | None) -> list[dict]:
    """Run every provider concurrently and return their results in fixed order."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        results = await asyncio.gather(
            virustotal(client, urls),
            web_risk(client, urls),
            abuseipdb(client, sending_ip),
            maxmind(client, sending_ip),
            mxtoolbox(client, sender_domain),
        )
    return list(results)
