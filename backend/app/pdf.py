"""Generate a PDF forensic report with fpdf2 (pure Python, no system deps)."""

from fpdf import FPDF


def _cat_color(cat: str):
    return {
        "Critical": (185, 28, 28),
        "High Risk": (220, 38, 38),
        "Suspicious": (217, 119, 6),
    }.get(cat, (3, 105, 161))


def build_report_pdf(scan, report: dict) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(3, 105, 161)
    pdf.cell(0, 10, "Cyber Shield - Forensic Email Report", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 6, "AurixCyber Airlines - Defensive Email Protection", ln=True)
    pdf.ln(2)

    # Score
    score = report.get("overallScore", 0)
    cat = report.get("riskCategory", "Low Risk")
    pdf.set_font("Helvetica", "B", 30)
    r, g, b = _cat_color(cat)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 14, f"{score}/100  -  {cat}", ln=True)
    pdf.ln(1)

    def kv(label, value):
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B", 10); pdf.set_text_color(20, 20, 20)
        pdf.cell(45, 6, label)
        pdf.set_font("Helvetica", "", 10); pdf.set_text_color(60, 60, 60)
        # Explicit remaining width so the position can never collapse to zero.
        width = pdf.w - pdf.r_margin - pdf.get_x()
        pdf.multi_cell(width, 6, str(value))

    kv("File:", scan.original_filename)
    kv("Sender domain:", scan.sender_domain or "-")
    kv("Hash:", scan.file_hash or "-")
    auth = report.get("auth", {})
    kv("Authentication:", f"SPF={auth.get('spf')}  DKIM={auth.get('dkim')}  DMARC={auth.get('dmarc')}")
    ip = report.get("ip", {})
    kv("Sending IP:", f"{ip.get('ip')} ({ip.get('country')}, {ip.get('isp')}, abuse {ip.get('abuseScore')})")
    pdf.ln(3)

    # Evidence table
    pdf.set_font("Helvetica", "B", 12); pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 8, "Evidence", ln=True)
    pdf.set_font("Helvetica", "B", 8); pdf.set_fill_color(240, 244, 248); pdf.set_text_color(20, 20, 20)
    headers = [("Severity", 22), ("Signal", 30), ("Provider", 32), ("Finding", 106)]
    for h, w in headers:
        pdf.cell(w, 6, h, border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8); pdf.set_text_color(50, 50, 50)
    for ind in report.get("indicators", []):
        row = [(ind.get("severity", ""), 22), (ind.get("type", ""), 30),
               (ind.get("source", ""), 32), (ind.get("finding", ""), 106)]
        y = pdf.get_y()
        for text, w in row:
            pdf.cell(w, 6, str(text)[:60], border=1)
        pdf.ln()
    pdf.ln(3)

    # Recommendations
    pdf.set_font("Helvetica", "B", 12); pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 8, "Recommended safe actions", ln=True)
    pdf.set_font("Helvetica", "", 9); pdf.set_text_color(60, 60, 60)
    for rec in report.get("recommendations", []):
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, 6, f"- {rec}")

    out = pdf.output()
    return bytes(out)
