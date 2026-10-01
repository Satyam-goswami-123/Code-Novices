"""NL -> SQL pipeline with safety + explainability.

Supports English and Kannada. Returns: { sql, answer, rationale, citations }.
"""
import json, re
from typing import Optional
from .llm import llm
from .db import get_conn

SCHEMA_DOC = """
You are a senior crime-data analyst for Abhedya-Chakra Police (Abhedya).
You translate natural-language questions (English or Kannada) into SAFE READ-ONLY SQLite SQL
against this schema, and produce a short explanation.

TABLES:
  districts(id, name, lat, lng)
  stations(id, name, district_id, lat, lng)
  persons(id, full_name, age, gender, occupation, education, address, district_id, aliases)
  firs(id, fir_number, station_id, district_id, crime_type, ipc_sections, description,
       occurred_at TEXT ISO8601, reported_at TEXT, lat, lng,
       status IN ('open','under_investigation','chargesheeted','closed'),
       severity INTEGER 1-10, weapon_used, motive)
  fir_accused(fir_id, person_id, role)
  fir_victims(fir_id, person_id)
  person_associations(person_a, person_b, relation, strength)

CRIME TYPES: Theft, Burglary, Robbery, Dacoity, Assault, Murder, Attempt to Murder, Kidnapping,
  Cheating/Fraud, Cybercrime, Drug Trafficking, Vehicle Theft, POCSO, Domestic Violence,
  Riot, Arson, Counterfeiting, Extortion.

RULES:
- Output ONLY a JSON object: {"sql": "...", "answer": "...", "rationale": "..."}
- SQL MUST be a single SELECT (no INSERT/UPDATE/DELETE/DROP/PRAGMA/ATTACH).
- Use LIMIT 200 unless aggregating.
- For "last N months/years" use date('now','-N months') comparisons on occurred_at.
- ALWAYS give every selected column a clear, human-readable alias with AS, especially
  for aggregates (e.g., COUNT(*) AS total_cases, AVG(severity) AS avg_severity).
  Never leave a column named COUNT(...), SUM(...), or t.col — always alias it in snake_case.
- If the question is not data-related, set sql to null and explain in `answer`.
- If Kannada input, still produce SQL; answer in the same language as the question.
"""

FORBIDDEN = re.compile(r"\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace)\b", re.I)


def is_safe_sql(sql: str) -> bool:
    if not sql or not isinstance(sql, str): return False
    s = sql.strip().rstrip(";")
    if ";" in s: return False
    if not s.lower().startswith("select") and not s.lower().startswith("with"):
        return False
    if FORBIDDEN.search(s): return False
    return True


def run_sql(sql: str, limit_rows: int = 200):
    conn = get_conn()
    try:
        cur = conn.execute(sql)
        rows = [dict(r) for r in cur.fetchmany(limit_rows)]
        cols = [d[0] for d in cur.description] if cur.description else []
        return cols, rows
    finally:
        conn.close()


def answer_question(nl_query: str, history: Optional[list] = None) -> dict:
    history_text = ""
    if history:
        history_text = "\nPrior conversation (most recent last):\n" + "\n".join(
            f"{m['role']}: {m['content']}" for m in history[-6:]
        )
    user = f"Question: {nl_query}{history_text}\nReturn JSON only."
    raw = llm.complete(SCHEMA_DOC, user, json_mode=True, max_tokens=900)
    try:
        data = json.loads(raw)
    except Exception:
        # try to recover JSON block
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0)) if m else {"sql": None, "answer": raw, "rationale": ""}

    sql = data.get("sql")
    result = {"nl": nl_query, "sql": sql, "answer": data.get("answer",""),
              "rationale": data.get("rationale",""), "columns": [], "rows": [],
              "provider": llm.provider, "ok": True, "error": None}

    if sql and is_safe_sql(sql):
        try:
            cols, rows = run_sql(sql)
            result["columns"] = cols
            result["rows"] = rows
            # If model didn't write an answer, synthesize a brief one
            if not result["answer"]:
                result["answer"] = f"Returned {len(rows)} row(s)."
        except Exception as e:
            result["ok"] = False
            result["error"] = f"SQL execution failed: {e}"
    elif sql:
        result["ok"] = False
        result["error"] = "Generated SQL was unsafe and was rejected."
        result["sql"] = None
    return result
