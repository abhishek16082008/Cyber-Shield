"""Safe, text-only .eml analysis.

Parses headers/URLs/IPs and detects suspicious patterns. It NEVER opens URLs
or executes attachments — it only reads the file as text. Network intelligence
(reputation, geolocation, blacklists) is added separately by providers.py.
"""

import re

URGENCY = ["urgent", "immediately", "act now", "final notice", "account suspended",
           "verify now", "within 24 hours", "your account will be"]
PAYMENT = ["wire transfer", "invoice", "payment", "gift card", "bank details", "bitcoin", "iban"]
CREDENTIAL = ["password", "login", "sign in", "confirm your identity", "update your credentials"]


def _header(raw: str, name: str) -> str:
    m = re.search(rf"^{name}:\s*(.*)$", raw, re.IGNORECASE | re.MULTILINE)
    return m.group(1).strip() if m else ""


def score_to_category(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 55:
        return "High Risk"
    if score >= 30:
        return "Suspicious"
    return "Low Risk"


def parse_eml(raw: str) -> dict:
    """Extract the static (non-network) facts and patterns from the email text."""
    lower = raw.lower()
    frm = _header(raw, "From")
    m = re.search(r"@([\w.-]+)", frm)
    sender_domain = m.group(1).lower() if m else None

    urls = list(dict.fromkeys(
        u.rstrip(".,") for u in re.findall(r"https?://[^\s\"'<>)]+", raw, re.IGNORECASE)
    ))[:10]
    ips = list(dict.fromkeys(re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", raw)))[:5]

    has_urgency = any(w in lower for w in URGENCY)
    has_payment = any(w in lower for w in PAYMENT)
    has_credential = any(w in lower for w in CREDENTIAL)

    # URL mismatch: anchor href domain != visible text domain.
    mismatch = re.search(
        r'<a\s+[^>]*href=["\']https?://([\w.-]+)[^>]*>\s*(?:https?://)?([\w.-]+)',
        raw, re.IGNORECASE)
    has_mismatch = bool(mismatch and mismatch.group(1) != mismatch.group(2))

    brand = re.search(r"(paypal|microsoft|apple|amazon|bank|google)", frm, re.IGNORECASE)
    has_impersonation = bool(brand and sender_domain and brand.group(1).lower() not in sender_domain)

    auth = {
        "spf": "pass" if "spf=pass" in lower else "fail" if "spf=fail" in lower else ("softfail" if has_impersonation else "none"),
        "dkim": "pass" if "dkim=pass" in lower else "fail" if "dkim=fail" in lower else ("fail" if has_impersonation else "none"),
        "dmarc": "pass" if "dmarc=pass" in lower else "fail" if "dmarc=fail" in lower else ("fail" if (has_impersonation or has_mismatch) else "none"),
    }

    patterns = [
        {"type": "urgency", "detected": has_urgency,
         "detail": "Pressuring / time-limited language detected." if has_urgency else "No urgency language found."},
        {"type": "payment_request", "detected": has_payment,
         "detail": "Requests payment, invoice, or financial action." if has_payment else "No payment request found."},
        {"type": "impersonation", "detected": has_impersonation,
         "detail": f"Display name references a brand not matching {sender_domain}." if has_impersonation else "No brand impersonation detected."},
        {"type": "url_mismatch", "detected": has_mismatch,
         "detail": "Visible link text does not match the real destination." if has_mismatch else "No link text/destination mismatch."},
        {"type": "credential_request", "detected": has_credential,
         "detail": "Asks to sign in or confirm credentials." if has_credential else "No credential request detected."},
    ]

    return {
        "sender_domain": sender_domain,
        "urls": urls,
        "ips": ips,
        "sending_ip": ips[0] if ips else None,
        "auth": auth,
        "patterns": patterns,
        "flags": {
            "urgency": has_urgency,
            "payment": has_payment,
            "credential": has_credential,
            "mismatch": has_mismatch,
            "impersonation": has_impersonation,
        },
    }


def pattern_score(flags: dict, auth: dict) -> int:
    """Score contribution from content patterns + failed authentication."""
    s = 0
    if flags["urgency"]:
        s += 14
    if flags["payment"]:
        s += 16
    if flags["impersonation"]:
        s += 24
    if flags["mismatch"]:
        s += 18
    if flags["credential"]:
        s += 14
    if auth["spf"] != "pass":
        s += 8
    if auth["dkim"] != "pass":
        s += 8
    if auth["dmarc"] != "pass":
        s += 10
    return s
