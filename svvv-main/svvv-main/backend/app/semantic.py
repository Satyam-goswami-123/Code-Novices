"""TF-IDF semantic search over FIR descriptions. Built once on startup, cached."""
import threading
from typing import Optional, List, Dict, Tuple
from .db import get_conn

# Lazy imports - loaded only when needed so server can start without them
TfidfVectorizer = None
cosine_similarity = None
np = None

def _ensure_ml_imports():
    global TfidfVectorizer, cosine_similarity, np
    if TfidfVectorizer is None:
        from sklearn.feature_extraction.text import TfidfVectorizer as _T
        from sklearn.metrics.pairwise import cosine_similarity as _cs
        import numpy as _np
        TfidfVectorizer = _T
        cosine_similarity = _cs
        np = _np

_lock = threading.Lock()
_idx = {"vec": None, "matrix": None, "ids": [], "rows": []}


def build_index():
    """(Re)build TF-IDF index over FIR descriptions."""
    _ensure_ml_imports()
    if TfidfVectorizer is None:
        print("sklearn not yet available, skipping index build", flush=True)
        return
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT f.id, f.fir_number, f.crime_type, f.ipc_sections, f.description,
                   f.weapon_used, f.motive, f.occurred_at, f.severity, f.lat, f.lng,
                   f.district_id, d.name AS district, s.name AS station, f.station_id
            FROM firs f
            JOIN districts d ON d.id=f.district_id
            JOIN stations s ON s.id=f.station_id
        """).fetchall()
        rows = [dict(r) for r in rows]
        docs = [f"{r['crime_type']} {r['weapon_used']} {r['motive']} {r['description']} {r['district']}"
                for r in rows]
        vec = TfidfVectorizer(stop_words="english", ngram_range=(1,2), max_features=8000,
                              min_df=2)
        M = vec.fit_transform(docs)
        with _lock:
            _idx["vec"] = vec
            _idx["matrix"] = M
            _idx["ids"] = [r["id"] for r in rows]
            _idx["rows"] = rows
    finally:
        conn.close()


def ensure_built():
    if _idx["matrix"] is None:
        build_index()


def search(query: str, top_k: int = 5,
           crime_type: Optional[str] = None,
           district_id: Optional[int] = None) -> List[Dict]:
    ensure_built()
    vec = _idx["vec"]; M = _idx["matrix"]; rows = _idx["rows"]
    qv = vec.transform([query])
    sims = cosine_similarity(qv, M).ravel()
    order = np.argsort(-sims)
    out = []
    for i in order:
        r = rows[i]
        if crime_type and r["crime_type"] != crime_type: continue
        if district_id and r["district_id"] != district_id: continue
        score = float(sims[i])
        if score < 0.01: break
        out.append({**r, "similarity": round(score, 4)})
        if len(out) >= top_k: break
    return out


def rank_suspects(seed_fir_ids: List[int], top_k: int = 5,
                  near_lat: Optional[float] = None, near_lng: Optional[float] = None,
                  exclude_person_id: Optional[int] = None) -> List[Dict]:
    """Given similar past cases, rank persons by:
      (a) appearance in those cases (case_links)
      (b) total FIR count (frequency)
      (c) proximity (their district hosts hotspots near point)
      (d) recency (FIRs in last 12 months)
    """
    if not seed_fir_ids:
        return []
    conn = get_conn()
    try:
        ph = ",".join("?" * len(seed_fir_ids))
        # persons in those FIRs
        acc = conn.execute(f"""
            SELECT p.id, p.full_name, p.age, p.gender, p.occupation, p.district_id,
                   d.name AS district, COUNT(*) AS case_links
            FROM fir_accused fa JOIN persons p ON p.id=fa.person_id
            LEFT JOIN districts d ON d.id=p.district_id
            WHERE fa.fir_id IN ({ph})
            GROUP BY p.id
        """, seed_fir_ids).fetchall()
        suspects = [dict(a) for a in acc]
        # frequency + recency
        for s in suspects:
            tot = conn.execute("SELECT COUNT(*) FROM fir_accused WHERE person_id=?",
                               (s["id"],)).fetchone()[0]
            rec = conn.execute("""SELECT COUNT(*) FROM fir_accused fa JOIN firs f ON f.id=fa.fir_id
                                  WHERE fa.person_id=? AND f.occurred_at >= date('now','-12 months')""",
                               (s["id"],)).fetchone()[0]
            s["total_firs"] = tot
            s["recent_firs"] = rec
        # add co-accused fan-out (people linked to those who appeared)
        seed_persons = {s["id"] for s in suspects}
        for pid in list(seed_persons):
            assoc = conn.execute("""
                SELECT CASE WHEN person_a=? THEN person_b ELSE person_a END AS pid, strength
                FROM person_associations
                WHERE (person_a=? OR person_b=?) ORDER BY strength DESC LIMIT 5""",
                (pid, pid, pid)).fetchall()
            for a in assoc:
                if a["pid"] in seed_persons: continue
                pr = conn.execute("""SELECT p.id, p.full_name, p.age, p.gender, p.occupation, p.district_id,
                                            d.name AS district
                                     FROM persons p LEFT JOIN districts d ON d.id=p.district_id
                                     WHERE p.id=?""", (a["pid"],)).fetchone()
                if not pr: continue
                tot = conn.execute("SELECT COUNT(*) FROM fir_accused WHERE person_id=?",
                                   (a["pid"],)).fetchone()[0]
                rec = conn.execute("""SELECT COUNT(*) FROM fir_accused fa JOIN firs f ON f.id=fa.fir_id
                                      WHERE fa.person_id=? AND f.occurred_at >= date('now','-12 months')""",
                                   (a["pid"],)).fetchone()[0]
                suspects.append({**dict(pr), "case_links": 0,
                                 "total_firs": tot, "recent_firs": rec,
                                 "associate_of": pid, "tie_strength": a["strength"]})
                seed_persons.add(a["pid"])
        # score
        for s in suspects:
            base = (s["case_links"] * 3
                    + min(s["total_firs"], 20) * 0.5
                    + s["recent_firs"] * 1.2)
            if "tie_strength" in s:
                base += s["tie_strength"] * 0.8
            # geo proximity bonus: same district as the hotspot point
            if near_lat is not None and near_lng is not None and s.get("district_id"):
                row = conn.execute("SELECT lat,lng FROM districts WHERE id=?",
                                   (s["district_id"],)).fetchone()
                if row and row["lat"]:
                    d = ((row["lat"]-near_lat)**2 + (row["lng"]-near_lng)**2) ** 0.5
                    base += max(0, 3 - d * 2)
            s["risk_score"] = round(base, 2)
        if exclude_person_id:
            suspects = [s for s in suspects if s["id"] != exclude_person_id]
        suspects.sort(key=lambda s: s["risk_score"], reverse=True)
        # reasons
        for s in suspects:
            reasons = []
            if s["case_links"]:
                reasons.append(f"appeared in {s['case_links']} similar past case(s)")
            if s["recent_firs"]:
                reasons.append(f"{s['recent_firs']} FIR(s) in last 12 months")
            if s["total_firs"] >= 5:
                reasons.append(f"{s['total_firs']} total FIRs (repeat offender)")
            if "associate_of" in s:
                reasons.append(f"associate (ties={int(s['tie_strength'])}) of a primary suspect")
            s["reasoning"] = "; ".join(reasons) or "weakly correlated"
        return suspects[:top_k]
    finally:
        conn.close()
