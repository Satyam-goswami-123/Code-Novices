from typing import Optional, List, Dict
"""AI Detective: narrative -> similar cases -> suspect ranking + MO analysis."""
from .llm import llm
from .db import get_conn

MO_SYSTEM = """You are a senior financial fraud and Money Mule MO (modus operandi) analyst.

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

Task: Given a new fraud narrative and 3-5 similar past cases, identify the common MO
(phishing vector, typical hop count, cash-out patterns, IP anomalies).
Be specific and action-oriented."""


def investigate(narrative: str, crime_type: Optional[str] = None,
                district_id: Optional[int] = None) -> dict:
    
    # Financial/Cyber Rule-Based Mock Search
    conn = get_conn()
    try:
        # Search for similar fraud reports using basic LIKE 
        # (In a real system this would use embeddings on transaction narrations or reports)
        q_similar = """
            SELECT r.id, r.report_id as fir_number, 'Cyber Fraud' as crime_type, 
                   'Cyber Cell' as station, r.reported_at as occurred_at, 
                   r.description, 0.89 as similarity, 'Phishing' as motive, 'Digital' as weapon_used,
                   5 as severity, 'Bengaluru' as district
            FROM fraud_reports r
            WHERE r.description LIKE ? OR r.description LIKE ?
            LIMIT 5
        """
        keywords = narrative.split()
        kw1 = f"%{keywords[0] if keywords else ''}%"
        kw2 = f"%{keywords[len(keywords)//2] if len(keywords)>1 else ''}%"
        
        similar = [dict(r) for r in conn.execute(q_similar, (kw1, kw2)).fetchall()]
        
        # If no fraud reports match (or table is empty), create mock ones matching the dataset style
        if not similar:
            similar = [
                {"id": 101, "fir_number": "FR-2026-991", "crime_type": "Cyber Fraud", "station": "Cyber Cell", "occurred_at": "2026-09-28", "description": "Victim received a fake SMS about electricity bill update and transferred funds to a mule account.", "similarity": 0.92, "motive": "Financial Gain", "weapon_used": "Phishing Link", "severity": 8, "district": "Bengaluru Urban"},
                {"id": 102, "fir_number": "FR-2026-842", "crime_type": "Phishing", "station": "Cyber Cell", "occurred_at": "2026-09-15", "description": "Fake KYC update call resulted in unauthorized transfer. Funds immediately scattered.", "similarity": 0.85, "motive": "Financial Gain", "weapon_used": "Vishing", "severity": 7, "district": "Mysuru"}
            ]

        # Rank suspected mule accounts based on risk score
        q_suspects = """
            SELECT a.id, a.account_holder_name as full_name, a.age, a.gender, 
                   a.bank_name as occupation, 'High Risk' as district, 
                   a.risk_score, 'High volume of rapid pass-through transactions' as reasoning
            FROM accounts a
            WHERE a.risk_score >= 0.8
            ORDER BY a.risk_score DESC
            LIMIT 6
        """
        suspects = [dict(r) for r in conn.execute(q_suspects).fetchall()]
        
        if not suspects:
            suspects = [
                {"id": 999, "full_name": "Ravi Kumar (Suspected L1 Mule)", "age": 24, "gender": "M", "occupation": "Bank ABC", "district": "Hubballi", "risk_score": 0.95, "reasoning": "Account received 5 Lakhs and dispersed 95% within 15 mins to 4 different accounts."},
                {"id": 998, "full_name": "Priya S (Suspected L2 Mule)", "age": 29, "gender": "F", "occupation": "Bank XYZ", "district": "Mangaluru", "risk_score": 0.88, "reasoning": "Frequent low-value cash deposits followed by immediate UPI transfers out."}
            ]
            
    finally:
        conn.close()

    # MO synthesis via LLM
    cases_brief = "\n".join(
        f"- Report {c['fir_number']} | {c['crime_type']} | "
        f"vector: {c['weapon_used']} | sim={c['similarity']} | {c['description'][:200]}"
        for c in similar
    )
    user = (f"NEW NARRATIVE:\n{narrative}\n\nSIMILAR PAST CASES:\n{cases_brief or '(none)'}\n\n"
            "Return JSON only.")
    import json, re
    def _parse_json_strict(text):
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
