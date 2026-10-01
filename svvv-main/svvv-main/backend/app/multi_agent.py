"""Multi-agent investigation pipeline.

4 specialist agents collaborate; trace is returned to the UI:
  1. Researcher     — NL -> SQL -> data
  2. NetworkAnalyst — co-accused & associations
  3. Predictor      — trend / risk uplift relevant to query
  4. Synthesizer    — composes the final briefing
"""
import json, re, time
from .llm import llm
from .nl2sql import answer_question
from . import analytics


RESEARCHER_SYS = """You are the RESEARCHER agent. Reformulate the user's question into
1-3 narrower sub-questions a SQL analyst would actually run, focused on Voidhack SCRB data.
Return JSON: {"subquestions":[...]}"""

NETWORK_SYS = """You are the NETWORK-ANALYST agent. Given recent results, identify if a
co-accused/criminal-network angle is relevant. Return JSON:
{"investigate_network": true|false, "person_id_or_district": null|number, "reason":"..."}"""

PREDICTOR_SYS = """You are the PREDICTOR agent. Given recent results, identify if a predictive/
trend angle adds value. Return JSON: {"check_predictions": true|false, "reason":"..."}"""

SYNTHESIZER_SYS = """You are the SYNTHESIZER agent — chief of staff.
You receive (a) sub-question SQL results, (b) network insights, (c) predictive alerts.
Compose a CONCISE briefing answer (4-8 lines, max 1 short paragraph + 2-4 bullets).
Cite specific FIR numbers / person names from the data when present.
End with a 1-line 'Recommended next action:'."""


def _jload(raw: str, default):
    try: return json.loads(raw)
    except:
        m = re.search(r"\{.*\}", raw, re.S)
        return json.loads(m.group(0)) if m else default


def run(nl_query: str) -> dict:
    trace = []
    t0 = time.time()

    # 1. Researcher
    r_raw = llm.complete(RESEARCHER_SYS, f"User question: {nl_query}",
                        json_mode=True, max_tokens=300)
    plan = _jload(r_raw, {"subquestions":[nl_query]})
    subs = plan.get("subquestions") or [nl_query]
    trace.append({"agent":"Researcher", "output": plan, "ms": int((time.time()-t0)*1000)})

    # 2. Run each sub-question via NL2SQL
    sub_results = []
    for q in subs[:3]:
        r = answer_question(q)
        sub_results.append({"q": q, "sql": r["sql"], "rows": r["rows"][:8],
                            "answer": r["answer"], "ok": r["ok"]})
    trace.append({"agent":"SQL-Executor", "output": sub_results})

    # 3. NetworkAnalyst
    n_raw = llm.complete(NETWORK_SYS,
        f"Question: {nl_query}\nResults preview: {json.dumps(sub_results, default=str)[:2000]}",
        json_mode=True, max_tokens=200)
    net_plan = _jload(n_raw, {"investigate_network": False})
    net_data = None
    if net_plan.get("investigate_network"):
        params = {}
        v = net_plan.get("person_id_or_district")
        try:
            v = int(v) if v else None
        except: v = None
        if v: params = {"person_id": v} if v < 100000 else {"district_id": v}
        try:
            net_data = analytics.network(**params, min_strength=1.0, limit=30)
            net_data = {"nodes_count": len(net_data["nodes"]),
                        "edges_count": len(net_data["edges"]),
                        "top_nodes": net_data["nodes"][:5]}
        except Exception as e:
            net_data = {"error": str(e)}
    trace.append({"agent":"NetworkAnalyst", "decision": net_plan, "data": net_data})

    # 4. Predictor
    p_raw = llm.complete(PREDICTOR_SYS,
        f"Question: {nl_query}\nResults preview: {json.dumps(sub_results, default=str)[:1500]}",
        json_mode=True, max_tokens=200)
    pred_plan = _jload(p_raw, {"check_predictions": False})
    pred_data = None
    if pred_plan.get("check_predictions"):
        try:
            pred_data = analytics.predict_risk()[:5]
        except Exception as e:
            pred_data = {"error": str(e)}
    trace.append({"agent":"Predictor", "decision": pred_plan, "data": pred_data})

    # 5. Synthesizer
    final_user = (
        f"USER QUESTION: {nl_query}\n\n"
        f"SUB-QUESTION RESULTS:\n{json.dumps(sub_results, default=str)[:3000]}\n\n"
        f"NETWORK DATA:\n{json.dumps(net_data, default=str)[:1000]}\n\n"
        f"PREDICTIVE ALERTS:\n{json.dumps(pred_data, default=str)[:1000]}\n"
    )
    final = llm.complete(SYNTHESIZER_SYS, final_user, json_mode=False, max_tokens=600)
    trace.append({"agent":"Synthesizer", "output": final})

    return {
        "answer": final,
        "trace": trace,
        "sub_results": sub_results,
        "elapsed_ms": int((time.time()-t0)*1000),
    }
