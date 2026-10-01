from typing import Optional, List, Dict
"""Time-machine hotspot data: per-bucket aggregated FIR locations."""
from collections import defaultdict
from .db import get_conn


def hotspot_timeline(months_back: int = 36, crime_type: Optional[str] = None):
    """Return dict bucket(YYYY-MM) -> list of {lat, lng, count, district, top_types}."""
    conn = get_conn()
    try:
        q = """SELECT strftime('%Y-%m', f.occurred_at) AS bucket,
                       f.lat, f.lng, f.crime_type, f.severity,
                       d.name AS district
                FROM firs f JOIN districts d ON d.id=f.district_id
                WHERE f.occurred_at >= date('now', ?)"""
        params = [f"-{months_back} months"]
        if crime_type:
            q += " AND f.crime_type = ?"; params.append(crime_type)
        rows = conn.execute(q, params).fetchall()
        by_bucket = defaultdict(lambda: defaultdict(lambda: {"count":0,"sev":0,
                                                              "district":"","types":[]}))
        for r in rows:
            if r["lat"] is None: continue
            key = (round(r["lat"],2), round(r["lng"],2))
            cell = by_bucket[r["bucket"]][key]
            cell["count"] += 1
            cell["sev"] += r["severity"] or 0
            cell["district"] = r["district"]
            if len(cell["types"]) < 3:
                cell["types"].append(r["crime_type"])
        result = {}
        for b, cells in by_bucket.items():
            arr = []
            for k, v in cells.items():
                arr.append({"lat":k[0], "lng":k[1], "count":v["count"],
                            "intensity": v["count"]*max(1, v["sev"]/max(v["count"],1)),
                            "district": v["district"], "types": v["types"]})
            arr.sort(key=lambda x: x["intensity"], reverse=True)
            result[b] = arr[:200]
        return dict(sorted(result.items()))
    finally:
        conn.close()
