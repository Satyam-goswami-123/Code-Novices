"""Generate PDF of a Section 91 CrPC Freeze Notice for an Account."""
from io import BytesIO
from datetime import datetime
from .db import get_conn

def get_account_data(account_id: int):
    conn = get_conn()
    try:
        acc = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
        if not acc: return None, [], []
        
        account = dict(acc)
        # incoming txns
        incoming = [dict(r) for r in conn.execute(
            "SELECT * FROM transactions WHERE receiver_account_id=? ORDER BY timestamp DESC LIMIT 50", 
            (account_id,)
        ).fetchall()]
        
        # outgoing txns
        outgoing = [dict(r) for r in conn.execute(
            "SELECT * FROM transactions WHERE sender_account_id=? ORDER BY timestamp DESC LIMIT 50", 
            (account_id,)
        ).fetchall()]
        
        return account, incoming, outgoing
    finally:
        conn.close()

def render_case_file_pdf(account_id: int) -> tuple[bytes, str]:
    account, incoming, outgoing = get_account_data(account_id)
    if not account:
        return None, ""
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                     TableStyle, PageBreak)
    
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=1.5*cm, bottomMargin=1.5*cm,
                            title=f"Freeze Notice - {account['account_number']}")
    
    styles = getSampleStyleSheet()
    h1 = styles["Title"]
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#7f1d1d"), spaceAfter=4)
    body = styles["BodyText"]
    small = ParagraphStyle("small", parent=body, fontSize=8, textColor=colors.grey)

    story = []
    
    # Header
    story.append(Paragraph("<b>NOTICE UNDER SECTION 91 CrPC</b>", h1))
    story.append(Paragraph("<b>SUBJECT: FREEZING OF SUSPECTED MONEY MULE ACCOUNT</b>", h2))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"<b>Date:</b> {datetime.utcnow().strftime('%Y-%m-%d')}", body))
    story.append(Paragraph("<b>To,</b><br/>The Nodal Officer / Branch Manager<br/>" + str(account['bank_name']), body))
    story.append(Spacer(1, 0.4*cm))
    
    story.append(Paragraph(
        "You are hereby directed under Section 91 of the Code of Criminal Procedure, 1973 "
        "to immediately FREEZE the below-mentioned bank account, as it has been flagged by the "
        "Abhedya-Chakra Engine for suspected high-velocity money laundering and mule activities.", 
        body
    ))
    story.append(Spacer(1, 0.5*cm))

    # 1. Profile
    story.append(Paragraph("1. Target Account Details", h2))
    profile = [
        ["Account Holder Name", account["account_holder_name"]],
        ["Account Number", account["account_number"]],
        ["IFSC Code", account["ifsc_code"]],
        ["Bank Name", account["bank_name"]],
        ["AI Risk Score", f"{account['risk_score']} / 1.0 (CRITICAL)"],
    ]
    t = Table(profile, colWidths=[5*cm, 12*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1),colors.HexColor("#fef2f2")),
        ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
        ("FONTSIZE",(0,0),(-1,-1),10),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))

    # 2. Incoming
    story.append(Paragraph(f"2. Recent Suspicious Incoming Transactions ({len(incoming)})", h2))
    if incoming:
        data = [["Txn ID","Date","Amount","Payment Mode","IP Address"]]
        for f in incoming[:20]:
            data.append([f["txn_id"], f["timestamp"][:10], str(f["amount"]),
                         f["payment_mode"], f["ip_address"]])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#7f1d1d")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),8),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("No recent incoming records found.", small))
    story.append(Spacer(1, 0.4*cm))

    # 3. Outgoing
    story.append(Paragraph(f"3. Recent Suspicious Outgoing Transactions ({len(outgoing)})", h2))
    if outgoing:
        data = [["Txn ID","Date","Amount","Payment Mode","IP Address"]]
        for f in outgoing[:20]:
            data.append([f["txn_id"], f["timestamp"][:10], str(f["amount"]),
                         f["payment_mode"], f["ip_address"]])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#7f1d1d")),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ("GRID",(0,0),(-1,-1),0.3,colors.lightgrey),
            ("FONTSIZE",(0,0),(-1,-1),8),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("No recent outgoing records found.", small))
    story.append(Spacer(1, 0.6*cm))

    # footer
    story.append(Paragraph(
        "<i>This Section 91 CrPC Notice was auto-generated by Voidhack Engine from the unified banking database. "
        "Failure to comply with this notice may attract provisions under relevant sections of law.</i>", small))
    doc.build(story)
    
    pdf_bytes = buf.getvalue()
    filename = f"freeze_notice_{account_id}_{account['account_number']}.pdf"
    return pdf_bytes, account["account_number"]
