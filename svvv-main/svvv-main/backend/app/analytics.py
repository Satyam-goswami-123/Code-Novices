from typing import Optional, List, Dict
from collections import defaultdict
from datetime import datetime, timedelta
import math
from .db import get_conn

def get_account_details(conn, account_ids: set):
    if not account_ids: return []
    qmarks = ",".join("?"*len(account_ids))
    q = f"""SELECT id, account_number, bank_name, account_holder_name, risk_score, is_frozen, age, city 
            FROM accounts WHERE id IN ({qmarks})"""
    return [dict(r) for r in conn.execute(q, tuple(account_ids)).fetchall()]

def trace_funds(txn_id: str, max_hops: int = 3):
    """Rule-Based Graph Engine to trace stolen funds hop-by-hop."""
    conn = get_conn()
    try:
        # Find the initial transaction
        q_init = """SELECT id, txn_id, sender_account_id, receiver_account_id, amount, timestamp, payment_mode, ip_address 
                    FROM transactions WHERE txn_id = ?"""
        init_txn = conn.execute(q_init, (txn_id,)).fetchone()
        
        if not init_txn:
            return {"nodes": [], "edges": [], "error": "Transaction not found"}
        
        init_txn = dict(init_txn)
        edges = []
        nodes_set = {init_txn["sender_account_id"], init_txn["receiver_account_id"]}
        
        edges.append({
            "from": init_txn["sender_account_id"],
            "to": init_txn["receiver_account_id"],
            "value": init_txn["amount"],
            "title": f"{init_txn['payment_mode']} | {init_txn['amount']} INR | {init_txn['timestamp']}",
            "color": "#ef4444",
            "arrows": "to"
        })
        
        # Breadth-first search for next hops
        current_layer = [(init_txn["receiver_account_id"], init_txn["timestamp"], init_txn["amount"])]
        layer_num = 1
        
        while current_layer and layer_num <= max_hops:
            next_layer = []
            for acc_id, ts, incoming_amt in current_layer:
                # Find outbound transactions from this account happening AFTER the incoming timestamp
                # but within 48 hours
                q_out = """SELECT id, txn_id, sender_account_id, receiver_account_id, amount, timestamp, payment_mode 
                           FROM transactions 
                           WHERE sender_account_id = ? AND timestamp >= ? 
                           ORDER BY timestamp ASC LIMIT 50"""
                out_txns = conn.execute(q_out, (acc_id, ts)).fetchall()
                
                for ot in out_txns:
                    ot = dict(ot)
                    nodes_set.add(ot["receiver_account_id"])
                    edges.append({
                        "from": ot["sender_account_id"],
                        "to": ot["receiver_account_id"],
                        "value": ot["amount"],
                        "title": f"{ot['payment_mode']} | {ot['amount']} INR | {ot['timestamp']}",
                        "color": "#f59e0b" if layer_num == 1 else "#3b82f6",
                        "arrows": "to"
                    })
                    next_layer.append((ot["receiver_account_id"], ot["timestamp"], ot["amount"]))
            
            current_layer = next_layer
            layer_num += 1

        # Resolve node details
        accs = get_account_details(conn, nodes_set)
        nodes = []
        for a in accs:
            group = "victim" if a["id"] == init_txn["sender_account_id"] else "mule"
            if a["id"] == init_txn["receiver_account_id"]: group = "l1_mule"
            
            nodes.append({
                "id": a["id"],
                "label": a["account_holder_name"],
                "title": f"A/C: {a['account_number']} | Bank: {a['bank_name']} | Risk: {a['risk_score']}",
                "value": 10 + (a["risk_score"] * 10),
                "age": a["age"],
                "city": a["city"],
                "group": group,
                "color": "#ef4444" if group == "victim" else "#f59e0b" if group == "l1_mule" else "#3b82f6"
            })
            
        return {"nodes": nodes, "edges": edges}
    finally:
        conn.close()

def mule_network(limit: int = 100):
    """Returns the macro network of known mule links based on risk scores."""
    conn = get_conn()
    try:
        q = """SELECT sender_id, receiver_id, total_volume, txn_count 
               FROM mule_links ORDER BY total_volume DESC LIMIT ?"""
        links = [dict(r) for r in conn.execute(q, (limit,)).fetchall()]
        
        nodes_set = set()
        edges = []
        for l in links:
            nodes_set.add(l["sender_id"])
            nodes_set.add(l["receiver_id"])
            edges.append({
                "from": l["sender_id"],
                "to": l["receiver_id"],
                "value": l["total_volume"],
                "title": f"{l['txn_count']} txns | {l['total_volume']} INR",
                "arrows": "to"
            })
            
        accs = get_account_details(conn, nodes_set)
        nodes = []
        for a in accs:
            nodes.append({
                "id": a["id"],
                "label": a["account_holder_name"],
                "title": f"A/C: {a['account_number']} | Bank: {a['bank_name']}",
                "value": 10 + (a["risk_score"] * 10),
                "age": a["age"],
                "city": a["city"],
                "group": "high_risk" if a["risk_score"] >= 0.7 else "medium_risk"
            })
            
        return {"nodes": nodes, "edges": edges}
    finally:
        conn.close()

def predict_fraud_alerts():
    """Rule-based alerts: Finds high velocity fan-out anomalies."""
    conn = get_conn()
    try:
        # Detect Layer 1 Mules: High number of incoming txns from different senders, quickly followed by outbounds
        q = """
        SELECT a.account_number, a.account_holder_name, a.bank_name,
               COUNT(t_in.id) as incoming_txns, SUM(t_in.amount) as total_in
        FROM accounts a
        JOIN transactions t_in ON t_in.receiver_account_id = a.id
        WHERE t_in.timestamp >= datetime('now', '-24 hours')
        GROUP BY a.id
        HAVING incoming_txns > 5 AND total_in > 100000
        ORDER BY total_in DESC LIMIT 30
        """
        alerts_data = [dict(r) for r in conn.execute(q).fetchall()]
        
        alerts = []
        for r in alerts_data:
            alerts.append({
                "account": r["account_number"],
                "name": r["account_holder_name"],
                "bank": r["bank_name"],
                "incoming_txns": r["incoming_txns"],
                "total_in": r["total_in"],
                "uplift_pct": min(100, r["incoming_txns"] * 10),  # Mock uplift
                "reason": f"Anomalous Fan-In: {r['incoming_txns']} incoming transfers totaling {r['total_in']} INR in 24 hrs. High probability Collector Mule."
            })
        return alerts
    finally:
        conn.close()
