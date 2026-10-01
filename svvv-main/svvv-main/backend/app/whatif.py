from typing import Optional, List, Dict
"""Scenario simulator: project crime impact of policy changes.

Simple, transparent model (judges can audit it):
- expected_crimes = baseline * (1 - elasticity * policy_factor)
where elasticities come from criminology literature ballparks and are tunable.
"""
from .db import get_conn

ELASTICITY = {
    # crime_type : sensitivity to extra patrols (per +10% officers)
    "Theft": 0.07, "Burglary": 0.10, "Robbery": 0.12, "Vehicle Theft": 0.08,
    "Assault": 0.05, "Murder": 0.03, "Attempt to Murder": 0.04,
    "Dacoity": 0.09, "Riot": 0.06, "Arson": 0.05,
    "Cybercrime": 0.01,
    "Drug Trafficking": 0.04,
    "Cheating/Fraud": 0.02,
    "POCSO": 0.02, "Domestic Violence": 0.02, "Kidnapping": 0.05,
    "Counterfeiting": 0.04, "Extortion": 0.07,
}
CCTV_ELASTICITY_FACTOR = 0.6   # CCTV ~60% as effective as officers per equivalent unit
COMMUNITY_FACTOR = 0.4         # community programs


def simulate(district_id: Optional[int] = None,
             officers_pct: float = 0,      # e.g. +20 => 20% more
             cctv_pct: float = 0,
             community_pct: float = 0,
             months: int = 12) -> dict:
    conn = get_conn()
    try:
        q = """SELECT d.name district, f.crime_type, COUNT(*) baseline
               FROM firs f JOIN districts d ON d.id=f.district_id
               WHERE f.occurred_at >= date('now', ?)"""
        params = [f"-{months} months"]
        if district_id:
            q += " AND f.district_id=?"; params.append(district_id)
        q += " GROUP BY d.name, f.crime_type"
        rows = [dict(r) for r in conn.execute(q, params).fetchall()]
    finally:
        conn.close()

    total_baseline = 0
    total_projected = 0
    by_type = {}
    for r in rows:
        elast = ELASTICITY.get(r["crime_type"], 0.03)
        # combined policy factor in [0,1)
        impact = (officers_pct/100)*elast \
               + (cctv_pct/100)*elast*CCTV_ELASTICITY_FACTOR \
               + (community_pct/100)*elast*COMMUNITY_FACTOR
        # cap at 70% reduction
        impact = min(impact, 0.7)
        projected = r["baseline"] * (1 - impact)
        by_type.setdefault(r["crime_type"], {"baseline":0,"projected":0})
        by_type[r["crime_type"]]["baseline"] += r["baseline"]
        by_type[r["crime_type"]]["projected"] += projected
        total_baseline += r["baseline"]
        total_projected += projected

    type_list = [{"crime_type":k, **v,
                  "delta": round(v["projected"]-v["baseline"], 1),
                  "pct": round((v["projected"]-v["baseline"])/v["baseline"]*100, 1)
                          if v["baseline"] else 0}
                 for k,v in by_type.items()]
    type_list.sort(key=lambda x: x["baseline"], reverse=True)
    return {
        "inputs": {"officers_pct":officers_pct, "cctv_pct":cctv_pct,
                   "community_pct":community_pct, "months":months,
                   "district_id":district_id},
        "baseline_total": int(total_baseline),
        "projected_total": round(total_projected, 1),
        "expected_prevented": round(total_baseline-total_projected, 1),
        "expected_pct_change": round((total_projected-total_baseline)/max(total_baseline,1)*100, 1),
        "by_type": type_list,
        "model_note": "Linear elasticity model — tunable. Capped at -70% per category.",
    }
