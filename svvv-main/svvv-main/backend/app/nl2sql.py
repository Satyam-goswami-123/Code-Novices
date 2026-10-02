"""NL -> SQL pipeline with safety + explainability.

Supports English and Kannada. Returns: { sql, answer, rationale, citations }.
"""
import json, re
from typing import Optional
from .llm import llm
from .db import get_conn

SCHEMA_DOC = """
You are a senior financial crime-data analyst for Abhedya-Chakra.
You translate natural-language questions into SAFE READ-ONLY SQL
against this schema, and produce a short explanation.

TABLES:
  accounts(id, account_number, ifsc_code, bank_name, account_holder_name, age, gender, address, city, state, risk_score, is_frozen)
  transactions(id, txn_id, sender_account_id, receiver_account_id, amount, currency, timestamp, payment_mode, ip_address, device_id, narration, is_flagged)
  fraud_reports(id, report_id, victim_account_id, initial_txn_id, reported_at, description, status)
  mule_links(sender_id, receiver_id, total_volume, txn_count)

RULES:
- Output ONLY a JSON object: {"sql": "...", "answer": "...", "rationale": "..."}
- SQL MUST be a single SELECT (no INSERT/UPDATE/DELETE).
- Use LIMIT 200 unless aggregating.
- ALWAYS give every selected column a clear, human-readable alias with AS.
- If the question is not data-related, set sql to null and explain in `answer`.
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
            if len(rows) > 0:
                # 2-step Text-to-SQL: Generate a natural language summary from the actual data!
                summary_prompt = (
                    f"User asked: {nl_query}\n\n"
                    f"Database results (JSON):\n{json.dumps(rows[:30])}\n\n"
                    f"Provide a clear, brief, simple, and understandable natural-language answer to the user based ONLY on the data above. Do not mention SQL or databases."
                )
                try:
                    # Request text-only response for the summary
                    final_answer = llm.complete("You are a helpful financial crime analyst.", summary_prompt, json_mode=False, max_tokens=300)
                    result["answer"] = final_answer
                except Exception:
                    result["answer"] = f"Returned {len(rows)} row(s)."
            else:
                result["answer"] = "No matching records found in the database."
        except Exception as e:
            result["ok"] = False
            result["error"] = f"SQL execution failed: {e}"
    elif sql:
        result["ok"] = False
        result["error"] = "Generated SQL was unsafe and was rejected."
        result["sql"] = None
    return result
