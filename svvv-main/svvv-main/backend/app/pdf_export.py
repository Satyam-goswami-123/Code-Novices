"""Generate PDF of a chat session conversation history with citations."""
import re
from io import BytesIO
from datetime import datetime
from .db import get_conn
from .db import get_conn


FIR_RE = re.compile(r"FIR/\d{4}/\d{4}/\d{5}")


def _extract_citations(messages: list) -> list[str]:
    """Collect every distinct FIR number referenced in answers or row tables."""
    refs = set()
    for m in messages:
        if not isinstance(m, dict): continue
        refs.update(FIR_RE.findall(m.get("content","") or ""))
        meta = m.get("meta") or {}
        for r in (meta.get("rows") or []):
            for v in r.values():
                if isinstance(v, str): refs.update(FIR_RE.findall(v))
    return sorted(refs)


def _resolve_firs(fir_numbers: list[str]) -> list[dict]:
    if not fir_numbers: return []
    conn = get_conn()
    try:
        ph = ",".join("?" * len(fir_numbers))
        rows = conn.execute(f"""
            SELECT f.fir_number, f.crime_type, f.occurred_at, f.status,
                   d.name AS district, s.name AS station
            FROM firs f JOIN districts d ON d.id=f.district_id
            JOIN stations s ON s.id=f.station_id
            WHERE f.fir_number IN ({ph})
            ORDER BY f.occurred_at DESC""", fir_numbers).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def render_session_pdf(meta: dict, messages: list) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                     TableStyle, PageBreak)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm,
                            title=meta.get("title","Abhedya Chat Session"))
    styles = getSampleStyleSheet()
    h1 = styles["Title"]
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#0b3d91"))
    body = styles["BodyText"]
    small = ParagraphStyle("small", parent=body, fontSize=8, textColor=colors.grey)
    code = ParagraphStyle("code", parent=small, fontName="Courier", fontSize=8,
                          textColor=colors.HexColor("#333"))

    story = []
    story.append(Paragraph("Abhedya-Chakra — Conversational AI Session Report", h1))
    story.append(Paragraph(f"Session: <b>{meta.get('title','(untitled)')}</b>", body))
    story.append(Paragraph(f"User: {meta.get('username','?')} ({meta.get('role','?')})", body))
    story.append(Paragraph(f"Generated: {datetime.utcnow().isoformat(timespec='seconds')}Z", small))
    story.append(Spacer(1, 0.4*cm))

    for m in messages:
        role = m["role"].upper()
        color = "#0b3d91" if role=="USER" else "#1f7a3a"
        story.append(Paragraph(f"<font color='{color}'><b>{role}</b></font> &nbsp; "
                               f"<font color='#666' size=8>{m.get('ts','')}</font>", body))
        story.append(Paragraph((m["content"] or "").replace("\n","<br/>"), body))
        meta_obj = m.get("meta") or {}
        if meta_obj.get("mode") == "multi_agent" and meta_obj.get("trace"):
            story.append(Paragraph("<b>Multi-agent reasoning trace:</b>", small))
            for step in meta_obj["trace"]:
                story.append(Paragraph(f"• <b>{step.get('agent','?')}</b>", small))
        if meta_obj.get("sql"):
            story.append(Paragraph("<b>SQL used (explainability):</b>", small))
            story.append(Paragraph(meta_obj["sql"], code))
        if meta_obj.get("rationale"):
            story.append(Paragraph(f"<i>Rationale:</i> {meta_obj['rationale']}", small))
        if meta_obj.get("rows"):
            rows = meta_obj["rows"][:10]
            if rows:
                cols = list(rows[0].keys())
                data = [cols] + [[str(r.get(c,""))[:60] for c in cols] for r in rows]
                t = Table(data, repeatRows=1)
                t.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#e8eefc")),
                    ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
                    ("FONTSIZE",(0,0),(-1,-1),7),
                ]))
                story.append(t)
        story.append(Spacer(1, 0.3*cm))

    # citations appendix
    citations = _extract_citations(messages)
    firs = _resolve_firs(citations)
    story.append(PageBreak())
    story.append(Paragraph("Appendix A — FIR Citations", h2))
    if firs:
        story.append(Paragraph(
            f"This report references <b>{len(firs)}</b> FIR(s) from the SCRB database. "
            "Every claim above can be traced back to one or more of these source records.",
            small))
        story.append(Spacer(1,0.2*cm))
        data = [["FIR number","Date","District","Station","Type","Status"]]
        for r in firs:
            data.append([r["fir_number"], r["occurred_at"][:10], r["district"],
                         r["station"], r["crime_type"], r["status"]])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0b3d91")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),8),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("No specific FIR records were cited in this conversation.", small))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Appendix B — Audit &amp; Disclaimer", h2))
    story.append(Paragraph(
        "This report was generated by an AI assistant from the SCRB crime database. "
        "All SQL queries shown above were validated as read-only by the safety pipeline. "
        "Every action in this session is recorded in the tamper-evident audit chain. "
        "Cross-verify before evidentiary use. © Abhedya-Chakra Police — SCRB.", small))
    doc.build(story)
    return buf.getvalue()
