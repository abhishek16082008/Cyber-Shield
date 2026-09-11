"""Scan endpoints: create (upload .eml), list, get, delete, and PDF export."""

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Scan, ScanReport, ScanIndicator
from ..schemas import ScanOut
from ..security import get_current_user, user_from_token_value
from ..analyzer import parse_eml, pattern_score, score_to_category
from ..providers import run_all
from ..pdf import build_report_pdf

router = APIRouter(prefix="/api/scans", tags=["scans"])

MAX_BYTES = 10 * 1024 * 1024


def _to_out(scan: Scan, include_report: bool = False) -> ScanOut:
    # Build explicitly so the ORM `report` relationship (a ScanReport object)
    # doesn't get mis-mapped onto the `report` dict field.
    return ScanOut(
        id=scan.id,
        user_id=scan.user_id,
        original_filename=scan.original_filename,
        file_hash=scan.file_hash,
        status=scan.status,
        overall_score=scan.overall_score,
        risk_category=scan.risk_category,
        sender_domain=scan.sender_domain,
        created_at=scan.created_at,
        completed_at=scan.completed_at,
        report=(scan.report.report_json if (include_report and scan.report is not None) else None),
    )


def _recommendations(score: int) -> list[str]:
    if score >= 55:
        return [
            "Do NOT click any links or open attachments in this email.",
            "Do NOT reply or provide any credentials or payment details.",
            "Report the email to your security/IT team.",
            "Delete the email after reporting.",
        ]
    if score >= 30:
        return [
            "Treat this email with caution; verify the sender through a known channel.",
            "Avoid clicking links; do not share credentials or payment details.",
            "When unsure, report to your security team.",
        ]
    return [
        "No strong threat signals detected, but stay alert.",
        "Verify unexpected requests independently.",
        "Never share passwords or one-time codes over email.",
    ]


@router.post("", response_model=ScanOut)
async def create_scan(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".eml"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only .eml files are accepted.")
    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File too large (max 10 MB).")
    raw = raw_bytes.decode("utf-8", errors="replace")
    file_hash = "sha256:" + hashlib.sha256(raw_bytes).hexdigest()[:24]

    # 1) Static, text-only parsing + patterns.
    parsed = parse_eml(raw)

    # 2) Provider intelligence (uses your API keys; missing => not_configured).
    net = await run_all(parsed["urls"], parsed["sending_ip"], parsed["sender_domain"])

    # 3) Score = content/auth patterns + network provider contributions.
    base = pattern_score(parsed["flags"], parsed["auth"])
    net_score = sum(p["score"] for p in net if p["status"] == "ok")
    total = max(0, min(100, base + net_score))
    category = score_to_category(total)

    # Enrichment from providers.
    abuse_score = next((p.get("abuse_score") for p in net if "abuse_score" in p), None)
    geo = next((p.get("geo") for p in net if "geo" in p), {}) or {}

    providers = [{"provider": p["provider"], "status": p["status"],
                  "score": p["score"], "summary": p["summary"]} for p in net]
    providers.append({"provider": "AI Pattern Scan", "status": "ok",
                      "score": min(40, base), "summary": "Heuristic content analysis."})

    # 4) Indicators (evidence rows).
    indicators = []

    def add(t, v, sev, src, finding):
        indicators.append({"type": t, "value": v, "severity": sev, "source": src, "finding": finding})

    f = parsed["flags"]
    if f["impersonation"]:
        add("pattern", "impersonation", "high", "AI Pattern Scan", "Sender name impersonates a known brand.")
    if f["mismatch"]:
        add("url", "link-mismatch", "high", "AI Pattern Scan", "Link text hides the true destination.")
    if f["urgency"]:
        add("pattern", "urgency", "medium", "AI Pattern Scan", "Uses pressure to force quick action.")
    if f["payment"]:
        add("pattern", "payment-request", "medium", "AI Pattern Scan", "Requests a financial action.")
    if f["credential"]:
        add("pattern", "credential-request", "medium", "AI Pattern Scan", "Requests login credentials.")
    if abuse_score and abuse_score > 50 and parsed["sending_ip"]:
        add("ip", parsed["sending_ip"], "high", "AbuseIPDB", f"Sending IP has {abuse_score}% abuse confidence.")
    if parsed["auth"]["dmarc"] != "pass":
        add("header", "dmarc", "medium", "Auth Check", "DMARC did not pass.")
    for p in net:
        if p["status"] == "ok" and p["score"] >= 20:
            add("provider", p["provider"], "high", p["provider"], p["summary"])
    if not indicators:
        add("info", "clean", "info", "AI Pattern Scan", "No strong threat indicators found.")

    report_json = {
        "overallScore": total,
        "riskCategory": category,
        "providers": providers,
        "auth": parsed["auth"],
        "ip": {
            "ip": parsed["sending_ip"],
            "country": geo.get("country"),
            "asn": geo.get("asn"),
            "isp": geo.get("isp"),
            "abuseScore": abuse_score if abuse_score is not None else 0,
        },
        "urls": [{"url": u, "domain": u.replace("https://", "").replace("http://", "").split("/")[0],
                  "verdict": "unknown", "note": "Listed only; never opened."} for u in parsed["urls"]],
        "patterns": parsed["patterns"],
        # Include indicators in the report so the frontend evidence table can
        # render them directly (they are also stored in the scan_indicators table).
        "indicators": [{"id": f"ind-{n}", **ind} for n, ind in enumerate(indicators)],
        "recommendations": _recommendations(total),
    }

    # 5) Persist scan + report + indicators.
    now = datetime.now(timezone.utc)
    scan = Scan(
        user_id=current.id,
        original_filename=file.filename,
        file_hash=file_hash,
        status="completed",
        overall_score=total,
        risk_category=category,
        sender_domain=parsed["sender_domain"],
        completed_at=now,
    )
    db.add(scan)
    db.flush()  # assigns scan.id

    db.add(ScanReport(scan_id=scan.id, report_json=report_json))
    for ind in indicators:
        db.add(ScanIndicator(scan_id=scan.id, **ind))
    db.commit()
    db.refresh(scan)

    return _to_out(scan, include_report=True)


@router.get("", response_model=list[ScanOut])
def list_scans(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    scans = (db.query(Scan)
             .filter(Scan.user_id == current.id)
             .order_by(Scan.created_at.desc())
             .all())
    return [_to_out(s) for s in scans]


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: str, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    scan = db.get(Scan, scan_id)
    if not scan or scan.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.")
    return _to_out(scan, include_report=True)


@router.delete("/{scan_id}", status_code=204)
def delete_scan(scan_id: str, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    scan = db.get(Scan, scan_id)
    if not scan or scan.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.")
    db.delete(scan)
    db.commit()
    return Response(status_code=204)


@router.get("/{scan_id}/report.pdf")
def report_pdf(scan_id: str, token: str, db: Session = Depends(get_db)):
    # PDF opens in a new browser tab, which can't send an Authorization header,
    # so the token is passed as a query parameter and validated here.
    user = user_from_token_value(token, db)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token.")
    scan = db.get(Scan, scan_id)
    if not scan or scan.user_id != user.id or scan.report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")
    pdf_bytes = build_report_pdf(scan, scan.report.report_json)
    filename = scan.original_filename.rsplit(".", 1)[0] + "-report.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{filename}"'})
