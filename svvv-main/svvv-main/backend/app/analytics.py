from typing import Optional, List, Dict
"""Analytics: trends, hotspots, networks, predictive (lightweight)."""
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import math
from .db import get_conn


def trends(crime_type: Optional[str] = None, months: int = 24):
    conn = get_conn()
    try:
        q = """
        SELECT strftime('%Y-%m', occurred_at) AS bucket,
               crime_type, COUNT(*) AS n
        FROM firs
        WHERE occurred_at >= date('now', ?)
        """
        params = [f"-{months} months"]
        if crime_type:
            q += " AND crime_type = ?"; params.append(crime_type)
        q += " GROUP BY bucket, crime_type ORDER BY bucket"
        rows = [dict(r) for r in conn.execute(q, params).fetchall()]
        return rows
    finally:
        conn.close()


def hotspots(months: int = 12, crime_type: Optional[str] = None, top: int = 200):
    conn = get_conn()
    try:
        q = """
        SELECT f.lat, f.lng, f.crime_type, f.severity, f.occurred_at,
               d.name AS district, s.name AS station
        FROM firs f
        JOIN districts d ON d.id=f.district_id
        JOIN stations s ON s.id=f.station_id
        WHERE f.occurred_at >= date('now', ?)
        """
        params = [f"-{months} months"]
        if crime_type:
            q += " AND f.crime_type = ?"; params.append(crime_type)
        q += " ORDER BY f.occurred_at DESC LIMIT ?"
        params.append(top * 10)
        rows = [dict(r) for r in conn.execute(q, params).fetchall()]
        # grid bucket for hotspot intensity
        buckets = defaultdict(lambda: {"count":0, "severity":0, "district":"", "samples":[]})
        for r in rows:
            if r["lat"] is None: continue
            key = (round(r["lat"], 2), round(r["lng"], 2))
            b = buckets[key]
            b["count"] += 1
            b["severity"] += r["severity"] or 0
            b["district"] = r["district"]
            if len(b["samples"]) < 3: b["samples"].append(r["crime_type"])
        out = [{"lat":k[0], "lng":k[1], **v, "intensity": v["count"]*max(1, v["severity"]/max(v["count"],1))}
               for k,v in buckets.items()]
        out.sort(key=lambda x: x["intensity"], reverse=True)
        return out[:top]
    finally:
        conn.close()


def network(person_id: Optional[int] = None, district_id: Optional[int] = None,
            min_strength: float = 1.0, limit: int = 80):
    """Return co-accused graph: nodes (persons), edges (associations)."""
    conn = get_conn()
    try:
        if person_id:
            seed_q = """SELECT DISTINCT person_a AS a, person_b AS b, strength FROM person_associations
                        WHERE (person_a=? OR person_b=?) AND strength>=?
                        ORDER BY strength DESC LIMIT ?"""
            edges = [dict(r) for r in conn.execute(seed_q,(person_id,person_id,min_strength,limit)).fetchall()]
        elif district_id:
            edges = [dict(r) for r in conn.execute("""
                SELECT pa.person_a a, pa.person_b b, pa.strength
                FROM person_associations pa
                JOIN persons p ON p.id=pa.person_a
                WHERE p.district_id=? AND pa.strength>=?
                ORDER BY pa.strength DESC LIMIT ?""",
                (district_id, min_strength, limit)).fetchall()]
        else:
            edges = [dict(r) for r in conn.execute("""
                SELECT person_a a, person_b b, strength FROM person_associations
                WHERE strength>=? ORDER BY strength DESC LIMIT ?""",
                (min_strength, limit)).fetchall()]

        ids = set()
        for e in edges: ids.add(e["a"]); ids.add(e["b"])
        if not ids:
            return {"nodes": [], "edges": []}
        qmarks = ",".join("?"*len(ids))
        people = [dict(r) for r in conn.execute(
            f"""SELECT p.id, p.full_name, p.age, p.gender, p.occupation, d.name AS district,
                       (SELECT COUNT(*) FROM fir_accused fa WHERE fa.person_id=p.id) AS fir_count
                FROM persons p LEFT JOIN districts d ON d.id=p.district_id
                WHERE p.id IN ({qmarks})""", tuple(ids)).fetchall()]
        nodes = [{"id":p["id"], "label":p["full_name"], "title":
                  f"{p['full_name']} | age {p['age']} | {p['occupation']} | {p['district']} | FIRs: {p['fir_count']}",
                  "value": p["fir_count"], "group": p["district"] or "?"} for p in people]
        edge_out = [{"from":e["a"], "to":e["b"], "value":e["strength"],
                     "title": f"co-accused in {int(e['strength'])} case(s)"} for e in edges]
        return {"nodes": nodes, "edges": edge_out}
    finally:
        conn.close()


def predict_risk():
    """Naive predictive: per district crime-type rate of last 3 months vs prior 12.
    Flags categories with significant increase as 'rising risk'."""
    conn = get_conn()
    try:
        recent = conn.execute("""
            SELECT d.name district, f.crime_type, COUNT(*) c
            FROM firs f JOIN districts d ON d.id=f.district_id
            WHERE f.occurred_at >= date('now','-3 months')
            GROUP BY d.name, f.crime_type
        """).fetchall()
        baseline = conn.execute("""
            SELECT d.name district, f.crime_type, COUNT(*) c
            FROM firs f JOIN districts d ON d.id=f.district_id
            WHERE f.occurred_at >= date('now','-15 months')
              AND f.occurred_at <  date('now','-3 months')
            GROUP BY d.name, f.crime_type
        """).fetchall()
        base = {(r["district"], r["crime_type"]): r["c"] for r in baseline}
        alerts = []
        for r in recent:
            key = (r["district"], r["crime_type"])
            b = base.get(key, 0) / 4.0  # 12 months => quarterly avg
            recent_q = r["c"]
            if b >= 2 and recent_q > b * 1.5:
                lift = (recent_q - b) / b * 100
                alerts.append({
                    "district": r["district"], "crime_type": r["crime_type"],
                    "recent_quarter": recent_q, "avg_prior_quarter": round(b,1),
                    "uplift_pct": round(lift,1),
                    "reason": f"{r['crime_type']} in {r['district']} is {lift:.0f}% above "
                              f"the prior 12-month quarterly average ({b:.1f})."
                })
        alerts.sort(key=lambda x: x["uplift_pct"], reverse=True)
        return alerts[:30]
    finally:
        conn.close()
