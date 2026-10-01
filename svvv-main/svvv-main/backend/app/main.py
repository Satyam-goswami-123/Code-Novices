from typing import Optional, List, Dict
import json, time
from fastapi import FastAPI, Depends, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from .config import settings
from .db import init_db, get_conn, conn_ctx
from .auth import authenticate, create_token, current_user, require, hash_password, verify_password
from . import analytics
from .nl2sql import answer_question
from .pdf_export import render_session_pdf
from .casefile import render_case_file_pdf
from .llm import llm
from . import detective as detective_mod
from . import vision as vision_mod
from . import timeline as timeline_mod
from . import multi_agent
from . import audit_chain
from . import patrol as patrol_mod
from . import whatif as whatif_mod
from . import geo as geo_mod
from .semantic import build_index, ensure_built

app = FastAPI(title="Abhedya-Chakra Conversational AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else [],
    allow_origin_regex=".*" if settings.CORS_ORIGINS == ["*"] else None,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# In-memory event bus for live notifications (last N risk-uplift alerts)
LIVE_ALERTS = {"last_alert_ids": set(), "events": []}


@app.on_event("startup")
def _startup():
    init_db()
    audit_chain.ensure_columns()
    try: build_index()
    except Exception as e: print("Semantic index build failed:", e)


def audit(user: dict, action: str, success: bool, nl: str = "", sql: str = "",
          details: str = ""):
    with conn_ctx() as c:
        c.execute("""INSERT INTO audit_log(user_id,username,role,action,nl_query,sql_used,
                     provider,success,details) VALUES (?,?,?,?,?,?,?,?,?)""",
                  (user["id"], user["username"], user["role"], action, nl, sql,
                   llm.provider, 1 if success else 0, details))
        aid = c.execute("SELECT last_insert_rowid()").fetchone()[0]
    audit_chain.append_hash(aid)

    # [NEW] Catalyst Cloud Scale: Data Store Integration for highly scalable audit logging
    from .config import settings
    if getattr(settings, "_in_catalyst", False):
        try:
            import zcatalyst_sdk
            app = zcatalyst_sdk.init()
            # 1. Get datastore instance
            datastore = app.datastore()
            # 2. Get the table (user must create 'Audit_Logs' table in Catalyst Console)
            table = datastore.table("Audit_Logs")
            # 3. Insert row
            table.insert_row({
                "user_id": user["id"],
                "username": user["username"],
                "action": action,
                "nl_query": nl,
                "success": bool(success)
            })
            print(f"[Catalyst Data Store] Pushed audit log for {user['username']}")
        except Exception as e:
            print(f"[Catalyst Data Store] Failed to push audit log: {e}")


# --------- auth ---------
@app.post("/api/auth/login")
def login(username: str = Form(...), password: str = Form(...)):
    u = authenticate(username, password)
    if not u: raise HTTPException(401, "Invalid credentials")
    
    with conn_ctx() as c:
        c.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (u["id"],))
        # Log active session (simulated IP/browser for prototype)
        import uuid
        jti = str(uuid.uuid4())
        try:
            c.execute("INSERT INTO active_sessions (user_id, token_jti, ip_address, browser, device) VALUES (?, ?, '192.168.1.45', 'Chrome 115', 'Windows 11')", (u["id"], jti))
        except Exception:
            pass  # session logging is non-critical
    
    # We will pass must_change_password flag to frontend
    must_change = bool(u.get("must_change_password"))
    
    audit({"id": u["id"], "username": u["username"], "role": u["role"]}, "login", True, details="User logged in")
    
    return {"access_token": create_token(u), "token_type": "bearer",
            "user": {"id":u["id"],"username":u["username"],"full_name":u["full_name"],
                     "role":u["role"], "must_change_password": must_change, "last_login": u.get("last_login")}}

@app.get("/api/auth/me")
def me(user = Depends(current_user)): return user

class ForgotPasswordRequest(BaseModel):
    username: str
    email: str

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    import random, string, time
    from datetime import datetime, timedelta, timezone
    with conn_ctx() as c:
        user = c.execute("SELECT id FROM users WHERE username=? AND email=?", (req.username, req.email)).fetchone()
        if not user:
            # Return success anyway to prevent username enumeration
            return {"status": "success", "message": "If the account exists, an OTP was sent."}
        
        otp = "".join(random.choice(string.digits) for _ in range(6))
        exp = datetime.now(timezone.utc) + timedelta(minutes=10)
        c.execute("INSERT INTO otps(user_id, otp_code, expires_at) VALUES (?,?,?)", 
                  (user["id"], otp, exp.isoformat()))
        
        # MOCK EMAIL
        print(f"\n{'='*40}")
        print(f"Abhedya-Chakra Notification")
        print(f"✔ OTP Generated: {otp}")
        print(f"Email sent successfully to: {req.email} (Prototype mode)")
        print(f"{'='*40}\n", flush=True)
        
    return {"status": "success", "message": "If the account exists, an OTP was sent."}

class ResetPasswordRequest(BaseModel):
    username: str
    otp: str
    new_password: str

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    from datetime import datetime, timezone
    with conn_ctx() as c:
        user = c.execute("SELECT id FROM users WHERE username=?", (req.username,)).fetchone()
        if not user: raise HTTPException(400, "Invalid OTP or User")
        
        # Verify OTP
        otp_row = c.execute("SELECT id, expires_at FROM otps WHERE user_id=? AND otp_code=? ORDER BY id DESC LIMIT 1", 
                            (user["id"], req.otp)).fetchone()
        if not otp_row: raise HTTPException(400, "Invalid OTP")
        
        exp = datetime.fromisoformat(otp_row["expires_at"])
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(400, "OTP Expired")
        
        c.execute("UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?", 
                  (hash_password(req.new_password), user["id"]))
        c.execute("DELETE FROM otps WHERE user_id=?", (user["id"],))
        
        audit({"id": user["id"], "username": req.username, "role": "system"}, "reset_password", True, details="Password reset via OTP")
    return {"status": "success"}

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, user = Depends(current_user)):
    with conn_ctx() as c:
        row = c.execute("SELECT password_hash FROM users WHERE id=?", (user["id"],)).fetchone()
        if not row or not verify_password(req.old_password, row["password_hash"]):
            raise HTTPException(400, "Incorrect old password")
        
        c.execute("UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?", 
                  (hash_password(req.new_password), user["id"]))
        
        audit({"id": user["id"], "username": user["username"], "role": user["role"]}, "change_password", True, details="Password changed by user")
    return {"status": "success"}


# --------- chat ---------
class ChatIn(BaseModel):
    message: str
    session_id: Optional[int] = None
    language: Optional[str] = "en"
    multi_agent: Optional[bool] = False

@app.post("/api/chat")
def chat(payload: ChatIn, user = Depends(require("chat"))):
    with conn_ctx() as c:
        sid = payload.session_id
        if not sid:
            c.execute("INSERT INTO chat_sessions(user_id,title) VALUES (?,?)",
                      (user["id"], payload.message[:60]))
            sid = c.execute("SELECT last_insert_rowid()").fetchone()[0]
        history = [dict(r) for r in c.execute(
            "SELECT role,content FROM chat_messages WHERE session_id=? ORDER BY id DESC LIMIT 10",
            (sid,)).fetchall()][::-1]
        c.execute("INSERT INTO chat_messages(session_id,role,content) VALUES (?,?,?)",
                  (sid, "user", payload.message))

    if payload.multi_agent:
        ma = multi_agent.run(payload.message)
        meta = {"trace": ma["trace"], "sub_results": ma["sub_results"],
                "elapsed_ms": ma["elapsed_ms"], "provider": llm.provider,
                "mode": "multi_agent"}
        answer = ma["answer"]
        sql_for_audit = "; ".join([s.get("sql") or "" for s in ma["sub_results"] if s.get("sql")])
        ok = True; err = None
    else:
        result = answer_question(payload.message, history=history)
        meta = {"sql": result["sql"], "rationale": result["rationale"],
                "rows": result["rows"][:20], "columns": result["columns"],
                "provider": result["provider"], "error": result["error"],
                "mode": "single"}
        answer = result["answer"]
        sql_for_audit = result["sql"] or ""
        ok = result["ok"]; err = result["error"]

    with conn_ctx() as c:
        c.execute("INSERT INTO chat_messages(session_id,role,content,meta) VALUES (?,?,?,?)",
                  (sid, "assistant", answer, json.dumps(meta, default=str)))
    audit(user, "chat_multi" if payload.multi_agent else "chat", ok, payload.message,
          sql_for_audit, err or "")
    return {"session_id": sid, "answer": answer, **meta}


@app.get("/api/chat/sessions")
def list_sessions(user = Depends(current_user)):
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT id,title,created_at FROM chat_sessions WHERE user_id=? ORDER BY id DESC",
            (user["id"],)).fetchall()
        return [dict(r) for r in rows]
    finally: conn.close()


@app.get("/api/chat/sessions/{sid}")
def get_session(sid: int, user = Depends(current_user)):
    conn = get_conn()
    try:
        s = conn.execute("SELECT * FROM chat_sessions WHERE id=? AND user_id=?",
                         (sid, user["id"])).fetchone()
        if not s: raise HTTPException(404)
        msgs = conn.execute(
            "SELECT role,content,meta,ts FROM chat_messages WHERE session_id=? ORDER BY id",
            (sid,)).fetchall()
        out = []
        for m in msgs:
            d = dict(m)
            try: d["meta"] = json.loads(d["meta"]) if d["meta"] else None
            except: d["meta"] = None
            out.append(d)
        return {"session": dict(s), "messages": out}
    finally: conn.close()


@app.get("/api/chat/sessions/{sid}/pdf")
def export_pdf(sid: int, user = Depends(require("export"))):
    data = get_session(sid, user)
    s = data["session"]
    meta = {"title": s["title"], "username": user["username"], "role": user["role"]}
    pdf = render_session_pdf(meta, data["messages"])
    audit(user, "pdf_export", True, details=f"session {sid}")
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="abhedya_chat_{sid}.pdf"'})


# --------- analytics ---------
@app.get("/api/trends")
def trends(crime_type: Optional[str] = None, months: int = 24,
           user = Depends(require("trends"))):
    return analytics.trends(crime_type, months)

@app.get("/api/hotspots")
def hotspots(months: int = 12, crime_type: Optional[str] = None, top: int = 200,
             user = Depends(require("hotspots"))):
    return analytics.hotspots(months, crime_type, top)

@app.get("/api/hotspots/timeline")
def hotspots_timeline(months: int = 36, crime_type: Optional[str] = None,
                      user = Depends(require("hotspots"))):
    return timeline_mod.hotspot_timeline(months, crime_type)

@app.get("/api/network")
def network(person_id: Optional[int] = None, district_id: Optional[int] = None,
            min_strength: float = 1.0, limit: int = 80,
            user = Depends(require("networks"))):
    return analytics.network(person_id, district_id, min_strength, limit)

@app.get("/api/predict")
def predict(user = Depends(require("predict"))):
    alerts = analytics.predict_risk()
    # Track new alerts for live notifications
    keys = {(a["district"], a["crime_type"]) for a in alerts}
    new = keys - LIVE_ALERTS["last_alert_ids"]
    if new and LIVE_ALERTS["last_alert_ids"]:
        for k in new:
            for a in alerts:
                if (a["district"], a["crime_type"]) == k:
                    LIVE_ALERTS["events"].append({"ts": time.time(), **a})
                    break
    LIVE_ALERTS["last_alert_ids"] = keys
    LIVE_ALERTS["events"] = LIVE_ALERTS["events"][-20:]
    return alerts


@app.get("/api/predict/stream")
def predict_stream(user = Depends(require("predict"))):
    """Poll endpoint: returns events since (clears after each call)."""
    ev = LIVE_ALERTS["events"][:]
    LIVE_ALERTS["events"] = []
    return ev


# --------- AI Detective ---------
class DetectiveIn(BaseModel):
    narrative: str
    crime_type: Optional[str] = None
    district_id: Optional[int] = None

@app.post("/api/detective/investigate")
def detective(payload: DetectiveIn, user = Depends(require("networks"))):
    out = detective_mod.investigate(payload.narrative, payload.crime_type, payload.district_id)
    audit(user, "detective", True, payload.narrative[:200], "",
          f"similar={len(out['similar_cases'])} suspects={len(out['suspects'])}")
    return out


# --------- Vision ---------
@app.post("/api/vision/analyze")
async def vision_analyze(file: UploadFile = File(...), user = Depends(require("networks"))):
    content = await file.read()
    if len(content) > 8_000_000:
        raise HTTPException(413, "image too large (>8MB)")
    out = vision_mod.analyze(content, file.content_type or "image/jpeg")
    audit(user, "vision", True, "(image)", "",
          f"summary={out['extracted'].get('scene_summary','')[:120]}")
    return out


# --------- Case File ---------
@app.get("/api/persons/{pid}/case-file")
def case_file(pid: int, user = Depends(require("export"))):
    pdf, name = render_case_file_pdf(pid)
    if not pdf: raise HTTPException(404, "person not found")
    audit(user, "case_file_pdf", True, "", "", f"person={pid} ({name})")
    safe = "".join(c if c.isalnum() else "_" for c in name)
    return Response(content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="case_file_{pid}_{safe}.pdf"'})


@app.get("/api/persons")
def list_persons(q: Optional[str] = None, district_id: Optional[int] = None, limit: int = 50,
                 user = Depends(current_user)):
    conn = get_conn()
    try:
        sql = """SELECT p.id, p.full_name, p.age, p.gender, p.occupation,
                        d.name AS district,
                        (SELECT COUNT(*) FROM fir_accused fa WHERE fa.person_id=p.id) AS fir_count
                 FROM persons p LEFT JOIN districts d ON d.id=p.district_id
                 WHERE 1=1"""
        params = []
        if q:
            sql += " AND (p.full_name LIKE ? OR p.aliases LIKE ?)"
            params += [f"%{q}%", f"%{q}%"]
        if district_id:
            sql += " AND p.district_id=?"; params.append(district_id)
        sql += " ORDER BY fir_count DESC LIMIT ?"; params.append(limit)
        return [dict(r) for r in conn.execute(sql, params).fetchall()]
    finally: conn.close()


# --------- Patrol & WhatIf ---------
@app.get("/api/patrol/route")
def patrol_route(station_id: Optional[int] = None, district_id: Optional[int] = None,
                 months: int = 3, max_waypoints: int = 6,
                 crime_type: Optional[str] = None,
                 user = Depends(require("predict"))):
    return patrol_mod.route_for_station(station_id, district_id, months,
                                        max_waypoints, crime_type)


class WhatIfIn(BaseModel):
    district_id: Optional[int] = None
    officers_pct: float = 0
    cctv_pct: float = 0
    community_pct: float = 0
    months: int = 12

@app.post("/api/whatif")
def whatif(payload: WhatIfIn, user = Depends(require("predict"))):
    return whatif_mod.simulate(payload.district_id, payload.officers_pct,
                                payload.cctv_pct, payload.community_pct, payload.months)


# --------- reference data ---------
@app.get("/api/meta/districts")
def districts(user = Depends(current_user)):
    conn = get_conn()
    try:
        return [dict(r) for r in conn.execute(
            "SELECT id,name,lat,lng FROM districts ORDER BY name")]
    finally: conn.close()


@app.get("/api/meta/stations")
def stations(district_id: Optional[int] = None, user = Depends(current_user)):
    conn = get_conn()
    try:
        if district_id:
            rows = conn.execute(
                "SELECT id,name,district_id FROM stations WHERE district_id=? ORDER BY name",
                (district_id,)).fetchall()
        else:
            rows = conn.execute(
                "SELECT id,name,district_id FROM stations ORDER BY name LIMIT 200").fetchall()
        return [dict(r) for r in rows]
    finally: conn.close()


@app.get("/api/meta/crime-types")
def crime_types(user = Depends(current_user)):
    conn = get_conn()
    try:
        return [r[0] for r in conn.execute("SELECT DISTINCT crime_type FROM firs ORDER BY crime_type")]
    finally: conn.close()


@app.get("/api/meta/stats")
def stats(user = Depends(current_user)):
    conn = get_conn()
    try:
        return {
            "firs": conn.execute("SELECT COUNT(*) FROM firs").fetchone()[0],
            "persons": conn.execute("SELECT COUNT(*) FROM persons").fetchone()[0],
            "stations": conn.execute("SELECT COUNT(*) FROM stations").fetchone()[0],
            "districts": conn.execute("SELECT COUNT(*) FROM districts").fetchone()[0],
            "provider": llm.provider,
        }
    finally: conn.close()


@app.get("/api/meta/districts/geojson")
def districts_geojson(user = Depends(current_user)):
    return geo_mod.districts_geojson()


@app.get("/api/meta/districts/crime-intensity")
def district_intensity(months: int = 12, user = Depends(current_user)):
    """For choropleth: per-district crime count + intensity score."""
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT d.id, d.name, d.lat, d.lng, COUNT(f.id) AS n,
                   AVG(f.severity) AS avg_sev
            FROM districts d LEFT JOIN firs f
              ON f.district_id=d.id AND f.occurred_at >= date('now', ?)
            GROUP BY d.id ORDER BY n DESC""", (f"-{months} months",)).fetchall()
        out = [dict(r) for r in rows]
        max_n = max([r["n"] for r in out] + [1])
        for r in out:
            r["intensity"] = round((r["n"] / max_n) * (r["avg_sev"] or 5)/10, 3)
        return out
    finally: conn.close()


# --------- audit ---------
@app.get("/api/audit")
def audit_list(limit: int = 200, user = Depends(require("audit"))):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?",
                            (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally: conn.close()


@app.get("/api/audit/verify")
def audit_verify(user = Depends(require("audit"))):
    return audit_chain.verify_chain()


@app.get("/api")
def root(): return {"service":"Abhedya-Chakra API","provider":llm.provider,"docs":"/docs"}

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend_dist")
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path == "docs" or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="Not Found")
        
        file_path = os.path.join(frontend_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        return FileResponse(os.path.join(frontend_path, "index.html"))
