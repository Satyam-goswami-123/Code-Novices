"""One-click investigative dossier for a Person of Interest."""
from io import BytesIO
from datetime import datetime
from .db import get_conn
from .db import get_conn


def person_dossier(person_id: int) -> tuple[dict, list, list, list, list]:
    conn = get_conn()
    try:
        p = conn.execute("""SELECT p.*, d.name AS district_name FROM persons p
                            LEFT JOIN districts d ON d.id=p.district_id WHERE p.id=?""",
                         (person_id,)).fetchone()
        if not p: return None, [], [], [], []
        person = dict(p)
        firs = [dict(r) for r in conn.execute("""
            SELECT f.id, f.fir_number, f.crime_type, f.ipc_sections, f.description,
                   f.occurred_at, f.status, f.severity, f.weapon_used, f.motive,
                   f.lat, f.lng, d.name AS district, s.name AS station, fa.role
            FROM fir_accused fa JOIN firs f ON f.id=fa.fir_id
            JOIN districts d ON d.id=f.district_id
            JOIN stations s ON s.id=f.station_id
            WHERE fa.person_id=? ORDER BY f.occurred_at DESC""",
            (person_id,)).fetchall()]
        associates = [dict(r) for r in conn.execute("""
            SELECT p2.id, p2.full_name, p2.age, p2.occupation, d.name AS district,
                   pa.strength
            FROM person_associations pa
            JOIN persons p2 ON p2.id =
                 CASE WHEN pa.person_a=? THEN pa.person_b ELSE pa.person_a END
            LEFT JOIN districts d ON d.id=p2.district_id
            WHERE pa.person_a=? OR pa.person_b=?
            ORDER BY pa.strength DESC LIMIT 12""",
            (person_id, person_id, person_id)).fetchall()]
        # crime type breakdown
        types = [dict(r) for r in conn.execute("""
            SELECT f.crime_type, COUNT(*) AS n FROM fir_accused fa JOIN firs f ON f.id=fa.fir_id
            WHERE fa.person_id=? GROUP BY f.crime_type ORDER BY n DESC""",
            (person_id,)).fetchall()]
        # similar offenders (same district + crime types)
        ctypes = [t["crime_type"] for t in types[:3]]
        similar = []
        if ctypes and person["district_id"]:
            ph = ",".join("?"*len(ctypes))
            similar = [dict(r) for r in conn.execute(f"""
                SELECT p.id, p.full_name, p.age, p.occupation,
                       COUNT(*) AS overlap FROM persons p
                JOIN fir_accused fa ON fa.person_id=p.id
                JOIN firs f ON f.id=fa.fir_id
                WHERE p.district_id=? AND f.crime_type IN ({ph}) AND p.id<>?
                GROUP BY p.id ORDER BY overlap DESC LIMIT 8""",
                [person["district_id"], *ctypes, person_id]).fetchall()]
        return person, firs, associates, types, similar
    finally:
        conn.close()


def risk_score(firs: list, associates: list) -> dict:
    if not firs: return {"score": 0, "band": "low", "reasons": ["no FIR history"]}
    recent = sum(1 for f in firs if f["occurred_at"] >= (datetime.utcnow().isoformat()[:7]+"-01"))
    # crude: # of recent + severity + associate strength
    avg_sev = sum(f["severity"] or 0 for f in firs) / len(firs)
    assoc_strength = sum(a["strength"] for a in associates[:5])
    score = min(100, round(len(firs)*4 + recent*8 + avg_sev*3 + assoc_strength*1.5))
    band = "low" if score < 30 else "medium" if score < 60 else "high" if score < 85 else "critical"
    reasons = [f"{len(firs)} total FIRs", f"avg severity {avg_sev:.1f}/10",
               f"top associates tie sum {assoc_strength:.0f}"]
    if recent: reasons.append(f"{recent} FIRs in last month")
    return {"score": score, "band": band, "reasons": reasons}


def _timeline_chart(firs: list):
    try:
        from reportlab.lib import colors
        from reportlab.graphics.shapes import Drawing, Rect, String, Line
    except ImportError:
        return None
    if not firs: return None
    d = Drawing(420, 80)
    d.add(Line(10, 20, 410, 20, strokeColor=colors.HexColor("#243456")))
    if firs:
        dates = sorted([f["occurred_at"][:10] for f in firs])
        d0 = datetime.fromisoformat(dates[0]); dN = datetime.fromisoformat(dates[-1])
        span = max((dN-d0).days, 1)
        for f in firs:
            try:
                t = datetime.fromisoformat(f["occurred_at"])
                x = 10 + ((t-d0).days/span)*400
                sev = (f["severity"] or 1)/10
                color = colors.HexColor("#ef4444") if sev>0.7 else colors.HexColor("#f59e0b") if sev>0.4 else colors.HexColor("#22c55e")
                d.add(Rect(x-2, 14, 4, 12, fillColor=color, strokeColor=color))
            except: pass
        d.add(String(10, 4, dates[0], fontSize=7, fillColor=colors.grey))
        d.add(String(380, 4, dates[-1], fontSize=7, fillColor=colors.grey))
        d.add(String(10, 60, "Crime timeline (color = severity)", fontSize=8, fillColor=colors.HexColor("#0b3d91")))
    return d


def render_case_file_pdf(person_id: int) -> tuple[bytes, str]:
    person, firs, associates, types, similar = person_dossier(person_id)
    if not person:
        return None, ""
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                     TableStyle, PageBreak, KeepTogether)
    risk = risk_score(firs, associates)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm,
                            title=f"Case file — {person['full_name']}")
    styles = getSampleStyleSheet()
    h1 = styles["Title"]
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#0b3d91"),
                        spaceAfter=4)
    body = styles["BodyText"]
    small = ParagraphStyle("small", parent=body, fontSize=8, textColor=colors.grey)

    band_colors = {"low":"#22c55e","medium":"#f59e0b","high":"#ef4444","critical":"#7f1d1d"}
    story = []
    story.append(Paragraph(f"INVESTIGATIVE DOSSIER — Person #{person_id}", h1))
    story.append(Paragraph(
        f"<b>Generated:</b> {datetime.utcnow().isoformat(timespec='seconds')}Z "
        f"&nbsp;|&nbsp; <b>Classification:</b> RESTRICTED — internal investigation use",
        small))
    story.append(Spacer(1, 0.3*cm))

    # 1. profile
    story.append(Paragraph("1. Subject profile", h2))
    profile = [
        ["Full name", person["full_name"]],
        ["Age / Gender", f"{person['age']} / {person['gender']}"],
        ["Occupation", person["occupation"] or "—"],
        ["Education", person["education"] or "—"],
        ["District", person["district_name"] or "—"],
        ["Address", person["address"] or "—"],
        ["Aliases", person["aliases"] or "—"],
    ]
    t = Table(profile, colWidths=[4*cm, 13*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1),colors.HexColor("#e8eefc")),
        ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
        ("FONTSIZE",(0,0),(-1,-1),9),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))

    # 2. risk score
    story.append(Paragraph("2. AI Risk Assessment", h2))
    rb = band_colors.get(risk["band"], "#888")
    story.append(Paragraph(
        f"<para><font color='{rb}' size=18><b>{risk['score']}/100 — {risk['band'].upper()}</b></font></para>",
        body))
    for r in risk["reasons"]:
        story.append(Paragraph(f"• {r}", body))
    story.append(Spacer(1, 0.4*cm))

    # 3. crime breakdown
    story.append(Paragraph("3. Crime type breakdown", h2))
    if types:
        data = [["Crime type","Count"]] + [[t["crime_type"], t["n"]] for t in types]
        tt = Table(data, colWidths=[10*cm, 3*cm])
        tt.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0b3d91")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),9),
        ]))
        story.append(tt)
    else:
        story.append(Paragraph("No prior offenses on record.", small))
    story.append(Spacer(1, 0.4*cm))

    # 4. timeline
    chart = _timeline_chart(firs)
    if chart:
        story.append(Paragraph("4. Activity timeline", h2))
        story.append(chart)
        story.append(Spacer(1, 0.2*cm))

    # 5. FIRs (CITATIONS)
    story.append(PageBreak())
    story.append(Paragraph("5. FIR history (citations)", h2))
    if firs:
        data = [["FIR number","Date","District","Type","Role","Status","Sev"]]
        for f in firs[:40]:
            data.append([f["fir_number"], f["occurred_at"][:10], f["district"],
                         f["crime_type"], f["role"] or "", f["status"], str(f["severity"] or "")])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0b3d91")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),8),
        ]))
        story.append(t)
    story.append(Spacer(1, 0.4*cm))

    # 6. associates
    story.append(Paragraph("6. Known associates (co-accused graph)", h2))
    if associates:
        data = [["Name","Age","Occupation","District","Tie strength"]]
        for a in associates:
            data.append([a["full_name"], str(a["age"] or ""), a["occupation"] or "",
                         a["district"] or "", str(int(a["strength"]))])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0b3d91")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),9),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("No known associates.", small))
    story.append(Spacer(1, 0.4*cm))

    # 7. similar offenders
    story.append(Paragraph("7. Similar offenders in district (recommended for cross-reference)", h2))
    if similar:
        data = [["Person #","Name","Age","Occupation","Overlap"]]
        for s in similar:
            data.append([str(s["id"]), s["full_name"], str(s["age"] or ""),
                         s["occupation"] or "", str(s["overlap"])])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0b3d91")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),9),
        ]))
        story.append(t)
    story.append(Spacer(1, 0.4*cm))

    # footer
    story.append(Paragraph(
        "<i>This dossier was auto-generated by SCRB AI from the unified crime database. "
        "All entries are citations — see FIR numbers in §5. For investigative use only — "
        "cross-verify before evidence submission.</i>", small))
    doc.build(story)
    
    pdf_bytes = buf.getvalue()
    filename = f"case_file_{person_id}_{person['full_name'].replace(' ', '_')}.pdf"
    
    # [NEW] Catalyst Cloud Scale: File Store Integration
    from .config import settings
    if getattr(settings, "_in_catalyst", False):
        try:
            import zcatalyst_sdk
            app = zcatalyst_sdk.init()
            # 1. Get the filestore instance
            filestore = app.filestore()
            # 2. Get the specific folder (user must create a folder named 'Case_Files' in console)
            folder = filestore.folder("Case_Files")
            # 3. Upload the file
            with BytesIO(pdf_bytes) as file_stream:
                file_stream.name = filename
                uploaded_file = folder.upload_file(file_stream)
                print(f"[Catalyst File Store] Successfully uploaded: {uploaded_file.file_name} (ID: {uploaded_file.id})")
        except Exception as e:
            print(f"[Catalyst File Store] Failed to upload to File Store: {e}")
            
    return pdf_bytes, person["full_name"]
