from typing import Optional, List, Dict
"""AI Detective: narrative -> similar cases -> suspect ranking + MO analysis."""
from .llm import llm
from .semantic import search as semantic_search, rank_suspects
from .db import get_conn

MO_SYSTEM = """You are a senior crime-MO (modus operandi) analyst.

Output rules — READ CAREFULLY:
1. Return ONE JSON object only. No markdown fences. No prose before/after.
2. mo_signature MUST be a plain English sentence — NEVER a JSON object or stringified JSON.
3. common_traits and recommended_lines_of_inquiry MUST be arrays of plain English strings.
4. confidence is one of: low, medium, high.

Schema:
{"mo_signature":"<one short English sentence>",
 "common_traits":["<trait>","<trait>","<trait>"],
 "recommended_lines_of_inquiry":["<lead>","<lead>","<lead>"],
 "confidence":"low|medium|high"}

Task: Given a new crime narrative and 3-5 similar past cases, identify the common MO
(weapon, timing, victim profile, attack pattern, escape route, locality).
Be specific and action-oriented."""


def investigate(narrative: str, crime_type: Optional[str] = None,
                district_id: Optional[int] = None) -> dict:
    similar = semantic_search(narrative, top_k=5,
                              crime_type=crime_type, district_id=district_id)
    seed_ids = [r["id"] for r in similar]
    near_lat = similar[0]["lat"] if similar else None
    near_lng = similar[0]["lng"] if similar else None
    suspects = rank_suspects(seed_ids, top_k=6, near_lat=near_lat, near_lng=near_lng)

    # MO synthesis via LLM
    cases_brief = "\n".join(
        f"- FIR {c['fir_number']} | {c['crime_type']} | {c['district']} | "
        f"weapon: {c['weapon_used']} | motive: {c['motive']} | sim={c['similarity']} | {c['description'][:200]}"
        for c in similar
    )
    user = (f"NEW NARRATIVE:\n{narrative}\n\nSIMILAR PAST CASES:\n{cases_brief or '(none)'}\n\n"
            "Return JSON only.")
    import json, re
    def _parse_json_strict(text):
        # Strip markdown fences
        t = text.strip()
        t = re.sub(r"^```(?:json)?\s*", "", t)
        t = re.sub(r"\s*```$", "", t)
        try: return json.loads(t)
        except: pass
        m = re.search(r"\{.*\}", t, re.S)
        if not m: return None
        try: return json.loads(m.group(0))
        except: return None
    try:
        raw = llm.complete(MO_SYSTEM, user, json_mode=True, max_tokens=600)
        mo = _parse_json_strict(raw) or {"mo_signature": raw[:300]}
        # Unwrap double-encoded JSON (some models nest the response)
        for _ in range(2):
            if isinstance(mo.get("mo_signature"), str) and mo["mo_signature"].lstrip().startswith("{"):
                inner = _parse_json_strict(mo["mo_signature"])
                if inner: mo = inner
                else: break
            else: break
    except Exception as e:
        mo = {"mo_signature": "(MO synthesis failed)", "error": str(e)}

    return {
        "similar_cases": similar,
        "suspects": suspects,
        "mo": mo,
        "narrative": narrative,
    }
