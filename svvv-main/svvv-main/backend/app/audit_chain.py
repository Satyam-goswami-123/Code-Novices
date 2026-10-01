"""SHA-256 hash chain over audit_log for tamper-evidence.

Each row's hash = SHA256(prev_hash || canonical_serialization(row)).
Verification re-computes the chain and reports first divergence.
"""
import hashlib, json
from .db import get_conn, conn_ctx


def ensure_columns():
    """Add hash columns if missing, and rebuild the entire chain from scratch
    so any partial state from earlier runs is reconciled."""
    conn = get_conn()
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(audit_log)").fetchall()}
        if "row_hash" not in cols:
            conn.execute("ALTER TABLE audit_log ADD COLUMN row_hash TEXT")
        if "prev_hash" not in cols:
            conn.execute("ALTER TABLE audit_log ADD COLUMN prev_hash TEXT")
        conn.commit()
        # Rebuild chain
        rows = conn.execute("SELECT * FROM audit_log ORDER BY id").fetchall()
        prev_h = ""
        for r in rows:
            d = dict(r)
            h = _hash(prev_h, d)
            conn.execute("UPDATE audit_log SET row_hash=?, prev_hash=? WHERE id=?",
                         (h, prev_h, d["id"]))
            prev_h = h
        conn.commit()
    finally:
        conn.close()


def _row_payload(r: dict) -> str:
    keep = {k: r.get(k) for k in
            ["id","ts","user_id","username","role","action","nl_query","sql_used",
             "provider","success","details"]}
    return json.dumps(keep, sort_keys=True, default=str)


def _hash(prev_hash: str, row: dict) -> str:
    h = hashlib.sha256()
    h.update((prev_hash or "").encode())
    h.update(_row_payload(row).encode())
    return h.hexdigest()


def append_hash(audit_id: int):
    """Compute & store hash for the row at `audit_id` based on the previous row."""
    with conn_ctx() as c:
        prev = c.execute("""SELECT row_hash FROM audit_log
                            WHERE id<? AND row_hash IS NOT NULL
                            ORDER BY id DESC LIMIT 1""", (audit_id,)).fetchone()
        prev_h = prev["row_hash"] if prev else ""
        row = c.execute("SELECT * FROM audit_log WHERE id=?", (audit_id,)).fetchone()
        if not row: return
        h = _hash(prev_h, dict(row))
        c.execute("UPDATE audit_log SET row_hash=?, prev_hash=? WHERE id=?",
                  (h, prev_h, audit_id))


def verify_chain():
    conn = get_conn()
    try:
        rows = [dict(r) for r in conn.execute(
            "SELECT * FROM audit_log ORDER BY id").fetchall()]
    finally:
        conn.close()
    prev_h = ""
    bad = []
    for r in rows:
        expected = _hash(prev_h, r)
        if r.get("row_hash") and r["row_hash"] != expected:
            bad.append({"id": r["id"], "expected": expected, "stored": r["row_hash"]})
            break
        prev_h = r.get("row_hash") or expected
    return {"verified_rows": len(rows), "tampered": bad,
            "ok": len(bad) == 0, "last_hash": prev_h[:32] + "…" if prev_h else ""}
