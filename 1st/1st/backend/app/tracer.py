import time
from typing import Dict, List, Set, Tuple, Any
from .db import get_db_connection
from .models import Node, Edge, TraceSummary, TraceResponse, Verdict

def trace_transactions(account_number: str, max_hops: int = 25) -> TraceResponse:
    start_time = time.time()
    con = get_db_connection()
    
    account_number = str(account_number).strip()
    max_hops = 25  # Failsafe circuit breaker cap for unlimited recursive BFS
    max_nodes_limit = 2000
    
    nodes_map: Dict[str, Dict[str, Any]] = {}
    edges_map: Dict[str, Dict[str, Any]] = {}
    visited_tx_ids: Set[str] = set()
    
    # Root Node Setup
    cursor = con.cursor()
    root_ifsc_query = cursor.execute("""
        SELECT Sender_IFSC FROM transactions WHERE Sender_Account = ? LIMIT 1
    """, [account_number]).fetchone()
    
    root_ifsc = root_ifsc_query[0] if root_ifsc_query else "UNKNOWN"
    
    nodes_map[account_number] = {
        "id": account_number,
        "label": account_number,
        "role": "root",
        "ifsc": root_ifsc,
        "in_degree": 0,
        "out_degree": 0,
        "total_received": 0.0,
        "total_sent": 0.0,
        "layer_level": 0,
        "is_cash_out": False,
        "is_mule": False
    }
    
    # Active frontier tuples: (incoming_node, tx_id, timestamp_obj, current_hop_level, branch_path_tuple)
    frontier: List[Tuple[str, str, Any, int, Tuple[str, ...]]] = []
    
    # Hop 1 Query - Outgoing transfers from Root
    hop1_txs = cursor.execute("""
        SELECT 
            Transaction_ID,
            Sender_Account,
            Receiver_Account,
            Sender_IFSC,
            Receiver_IFSC,
            Amount,
            strftime(Timestamp, '%Y-%m-%d %H:%M:%S') AS Timestamp_str,
            Timestamp,
            Payment_Mode,
            Narration,
            IP_Address,
            Device_Type
        FROM transactions
        WHERE Sender_Account = ?
        ORDER BY Timestamp ASC
        LIMIT 300
    """, [account_number]).fetchall()
    
    for row in hop1_txs:
        if len(row) < 12:
            print(f"Skipping malformed row: {row}")
            continue
        tx_id, sender, receiver, s_ifsc, r_ifsc, amount, ts_str, ts_obj, mode, narration, ip, device = row[:12]
        
        visited_tx_ids.add(tx_id)
        
        if receiver not in nodes_map:
            nodes_map[receiver] = {
                "id": receiver,
                "label": receiver,
                "role": "terminal",
                "ifsc": r_ifsc,
                "in_degree": 0,
                "out_degree": 0,
                "total_received": 0.0,
                "total_sent": 0.0,
                "layer_level": 1,
                "is_cash_out": False,
                "is_mule": False
            }
        
        nodes_map[sender]["out_degree"] += 1
        nodes_map[sender]["total_sent"] += float(amount)
        nodes_map[receiver]["in_degree"] += 1
        nodes_map[receiver]["total_received"] += float(amount)
        
        edges_map[tx_id] = {
            "id": tx_id,
            "source": sender,
            "target": receiver,
            "amount": float(amount),
            "timestamp": ts_str,
            "payment_mode": mode,
            "narration": narration,
            "ip_address": ip,
            "device_type": device,
            "hop_level": 1,
            "time_diff_minutes": 0.0,
            "prev_transaction_id": None,
            "raw_ts": ts_obj
        }
        
        if receiver != sender:
            frontier.append((receiver, tx_id, ts_obj, 1, (sender, receiver)))
            
    current_hop = 1
    
    # Unlimited Recursive BFS Traversal Loop
    while current_hop < max_hops and frontier and len(nodes_map) < max_nodes_limit:
        next_frontier: List[Tuple[str, str, Any, int, Tuple[str, ...]]] = []
        current_hop += 1
        
        for prev_node, prev_tx_id, prev_ts, hop_lvl, branch_path in frontier:
            if len(nodes_map) >= max_nodes_limit:
                break
                
            out_txs = cursor.execute("""
                SELECT 
                    Transaction_ID,
                    Sender_Account,
                    Receiver_Account,
                    Sender_IFSC,
                    Receiver_IFSC,
                    Amount,
                    strftime(Timestamp, '%Y-%m-%d %H:%M:%S') AS Timestamp_str,
                    Timestamp,
                    Payment_Mode,
                    Narration,
                    IP_Address,
                    Device_Type,
                    epoch(Timestamp - ?) / 60.0 AS time_diff_minutes
                FROM transactions
                WHERE Sender_Account = ?
                  AND Timestamp >= ?
                  AND Timestamp <= ? + INTERVAL 15 MINUTE
                ORDER BY Timestamp ASC
                LIMIT 50
            """, [prev_ts, prev_node, prev_ts, prev_ts]).fetchall()
            
            for row in out_txs:
                if len(row) < 13:
                    continue
                tx_id, sender, receiver, s_ifsc, r_ifsc, amount, ts_str, ts_obj, mode, narration, ip, device, time_diff = row[:13]
                
                # Strict temporal chaining filter (0 <= time_diff <= 15 minutes)
                if time_diff is None or float(time_diff) < 0.0 or float(time_diff) > 15.0:
                    continue

                if tx_id in visited_tx_ids:
                    continue
                visited_tx_ids.add(tx_id)
                
                cycle_detected = receiver in branch_path
                
                if receiver not in nodes_map:
                    nodes_map[receiver] = {
                        "id": receiver,
                        "label": receiver,
                        "role": "terminal",
                        "ifsc": r_ifsc,
                        "in_degree": 0,
                        "out_degree": 0,
                        "total_received": 0.0,
                        "total_sent": 0.0,
                        "layer_level": current_hop,
                        "is_cash_out": False,
                        "is_mule": False
                    }
                else:
                    nodes_map[receiver]["layer_level"] = min(nodes_map[receiver]["layer_level"], current_hop)
                
                nodes_map[sender]["out_degree"] += 1
                nodes_map[sender]["total_sent"] += float(amount)
                nodes_map[receiver]["in_degree"] += 1
                nodes_map[receiver]["total_received"] += float(amount)
                
                if sender != account_number:
                    nodes_map[sender]["role"] = "intermediate"
                    nodes_map[sender]["is_mule"] = True
                
                edges_map[tx_id] = {
                    "id": tx_id,
                    "source": sender,
                    "target": receiver,
                    "amount": float(amount),
                    "timestamp": ts_str,
                    "payment_mode": mode,
                    "narration": narration,
                    "ip_address": ip,
                    "device_type": device,
                    "hop_level": current_hop,
                    "time_diff_minutes": round(float(time_diff), 2),
                    "prev_transaction_id": prev_tx_id,
                    "raw_ts": ts_obj
                }
                
                if not cycle_detected and current_hop < max_hops:
                    next_frontier.append((receiver, tx_id, ts_obj, current_hop, branch_path + (receiver,)))
                    
        frontier = next_frontier[:500]

    # Analyze Graph Topology Metrics
    max_depth_reached = max((e["hop_level"] for e in edges_map.values()), default=1)
    
    # Layer 1 receivers and Layer 2+ terminal receivers
    l1_nodes = [n_id for n_id, n_data in nodes_map.items() if n_data["layer_level"] == 1]
    l2_plus_receivers = [n_id for n_id, n_data in nodes_map.items() if n_data["layer_level"] >= 2]
    
    # Check Structural Reconvergence (Tree -> Aggregation):
    # Must have: Root -> Fan-Out (2+ accounts at L1) AND Downstream Funneling into 1 or 2 common collection accounts (L2+)
    terminal_cashout_nodes = [n_id for n_id, n_data in nodes_map.items() if n_data["out_degree"] == 0 and n_data["layer_level"] >= 2]
    
    has_fanout = len(l1_nodes) >= 2
    has_reconvergence = len(l2_plus_receivers) > 0 and (len(terminal_cashout_nodes) <= 2 or any(n_data["in_degree"] >= 2 for n_id, n_data in nodes_map.items() if n_id != account_number))
    is_structural_reconvergence = has_fanout and has_reconvergence and max_depth_reached >= 2

    has_multi_hop_pass_through = max_depth_reached >= 2 and not is_structural_reconvergence

    # Node Role Assignment
    for n_id, n_data in nodes_map.items():
        if n_id == account_number:
            n_data["role"] = "root"
        elif n_data["out_degree"] > 0:
            n_data["role"] = "intermediate"
            n_data["is_mule"] = True
        else:
            n_data["role"] = "terminal"
            if max_depth_reached >= 2 and is_structural_reconvergence:
                n_data["is_cash_out"] = True
            else:
                n_data["is_cash_out"] = False

    # Strict Topology-First Risk Scoring per Edge
    for tx_id, edge in edges_map.items():
        factors: List[str] = []
        
        if is_structural_reconvergence:
            # HIGH RISK (>70%) - Structural Reconvergence verified!
            score = 75.0
            factors.append("Verified Structural Reconvergence (Tree -> Aggregation)")
            
            if edge["time_diff_minutes"] <= 5.0 and edge["hop_level"] > 1:
                score += 15.0
                factors.append("Rapid Velocity <= 5m (+15%)")
            if edge["ip_address"].startswith("185.") or edge["ip_address"].startswith("194."):
                score += 10.0
                factors.append("Foreign IP Header (+10%)")
            if edge["device_type"] in ["Web_Emulator", "Linux_Script"]:
                score += 10.0
                factors.append("Automated Script/Emulator Agent (+10%)")
                
            final_score = min(100.0, round(score, 1))
            edge_level = "HIGH"
        elif has_multi_hop_pass_through:
            # MEDIUM RISK (35% - 70%) - Rapid Pass-Through without full Reconvergence
            score = 45.0
            factors.append("Multi-Hop Pass-Through Transfer (No Terminal Reconvergence)")
            
            if edge["time_diff_minutes"] <= 5.0:
                score += 15.0
                factors.append("Velocity <= 5m (+15%)")
            if nodes_map[edge["source"]]["out_degree"] >= 2:
                score += 10.0
                factors.append("Fan-Out Dispersal (+10%)")
                
            final_score = min(70.0, round(score, 1))
            edge_level = "MEDIUM"
        else:
            # LOW RISK / CLEAN (<35%) - 1-Hop Disbursement with NO downstream movement (e.g., AIRP10000498)
            score = 20.0
            factors.append("Single-Hop Transfer (No Downstream Flow Detected within 15m)")
            
            final_score = round(score, 1)
            edge_level = "LOW"
            
        edge["risk_score"] = final_score
        edge["risk_level"] = edge_level
        edge["risk_factors"] = factors

    # Verdict Classification Engine
    root_node = nodes_map[account_number]
    total_siphoned = root_node["total_sent"]
    flagged_txs = sum(1 for e in edges_map.values() if e["risk_score"] >= 70.0)
    
    # Layer Breakdown Count
    layer_counts: Dict[str, int] = {}
    for n in nodes_map.values():
        l_key = f"L{n['layer_level']}"
        if n["is_cash_out"]:
            l_key = "L3_Cashout" if n['layer_level'] >= 3 else f"L{n['layer_level']}_Cashout"
        layer_counts[l_key] = layer_counts.get(l_key, 0) + 1

    if is_structural_reconvergence:
        verdict_type = "CONFIRMED VICTIM"
        victim_prob = min(98.5, round(85.0 + (len(edges_map) * 0.5), 1))
        fraud_assoc = round(100.0 - victim_prob, 1)
        mule_count = sum(1 for n in nodes_map.values() if n["is_mule"])
        pattern_str = f"Multi-Tier Smurfing & Aggregation Tree ({mule_count} Mules Re-converging Across {max_depth_reached} Hops)"
    elif has_multi_hop_pass_through:
        verdict_type = "MULE / SUSPECT"
        fraud_assoc = 65.0
        victim_prob = 35.0
        pattern_str = f"Multi-Hop Pass-Through Chain ({max_depth_reached} Hops without Single Reconvergence)"
    else:
        # Single-Hop Case (e.g. AIRP10000498)
        verdict_type = "LEGITIMATE / LOW RISK"
        victim_prob = 15.0
        fraud_assoc = 5.0
        pattern_str = "Single-Hop Disbursement (No Downstream Flow Detected)"

    verdict = Verdict(
        verdict_type=verdict_type,
        victim_probability=victim_prob,
        fraud_association=fraud_assoc,
        pattern_detected=pattern_str,
        siphoned_amount=round(total_siphoned, 2),
        layer_breakdown=layer_counts,
        flagged_tx_count=flagged_txs
    )

    formatted_nodes = [
        Node(
            id=nd["id"],
            label=nd["label"],
            role=nd["role"],
            ifsc=nd["ifsc"],
            in_degree=nd["in_degree"],
            out_degree=nd["out_degree"],
            total_received=round(nd["total_received"], 2),
            total_sent=round(nd["total_sent"], 2),
            layer_level=nd["layer_level"],
            is_cash_out=nd["is_cash_out"],
            is_mule=nd["is_mule"]
        )
        for nd in nodes_map.values()
    ]

    formatted_edges = [
        Edge(
            id=ed["id"],
            source=ed["source"],
            target=ed["target"],
            amount=ed["amount"],
            timestamp=ed["timestamp"],
            payment_mode=ed["payment_mode"],
            narration=ed["narration"],
            ip_address=ed["ip_address"],
            device_type=ed["device_type"],
            hop_level=ed["hop_level"],
            time_diff_minutes=ed["time_diff_minutes"],
            prev_transaction_id=ed["prev_transaction_id"],
            risk_score=ed["risk_score"],
            risk_level=ed["risk_level"],
            risk_factors=ed["risk_factors"]
        )
        for ed in edges_map.values()
    ]

    total_vol = sum(e.amount for e in formatted_edges)
    exec_time = (time.time() - start_time) * 1000.0

    summary = TraceSummary(
        root_account=account_number,
        max_hops=max_depth_reached,
        total_nodes=len(formatted_nodes),
        total_edges=len(formatted_edges),
        total_volume_traced=round(total_vol, 2),
        max_depth_reached=max_depth_reached,
        execution_time_ms=round(exec_time, 2)
    )

    return TraceResponse(
        nodes=formatted_nodes,
        edges=formatted_edges,
        summary=summary,
        verdict=verdict
    )

def get_diagnostic_sample_accounts() -> Dict[str, List[Dict[str, Any]]]:
    """Execute diagnostic SQL queries on DuckDB dataset to find verified test IDs for High, Medium, and Low risk scenarios."""
    con = get_db_connection()
    
    # 1. High Risk Candidate: 1 sender -> splits -> reconverges into shared terminal accounts within 15m
    query_high = """
        WITH hop1 AS (
            SELECT Sender_Account AS root, Receiver_Account AS l1, Timestamp AS t1
            FROM transactions
        ),
        hop2 AS (
            SELECT h1.root, h1.l1, t.Receiver_Account AS l2, t.Timestamp AS t2
            FROM hop1 h1
            JOIN transactions t ON h1.l1 = t.Sender_Account
            WHERE t.Timestamp >= h1.t1 AND t.Timestamp <= h1.t1 + INTERVAL 15 MINUTE
        )
        SELECT root, COUNT(DISTINCT l1) as split_count, COUNT(DISTINCT l2) as merged_count
        FROM hop2
        GROUP BY root
        HAVING COUNT(DISTINCT l1) >= 3 AND COUNT(DISTINCT l2) <= 3
        ORDER BY split_count DESC
        LIMIT 5;
    """
    
    # 2. Medium Risk Candidate: 2 hops pass-through, but no single convergence
    query_medium = """
        SELECT t1.Sender_Account AS root
        FROM transactions t1
        JOIN transactions t2 ON t1.Receiver_Account = t2.Sender_Account
        WHERE t2.Timestamp >= t1.Timestamp AND t2.Timestamp <= t1.Timestamp + INTERVAL 15 MINUTE
        GROUP BY t1.Sender_Account
        HAVING COUNT(DISTINCT t2.Receiver_Account) > 1
        LIMIT 5;
    """
    
    # 3. Low Risk Candidate: Root sends funds, but recipient has NO outgoing tx in 15 mins
    query_low = """
        SELECT t1.Sender_Account AS root
        FROM transactions t1
        LEFT JOIN transactions t2 ON t1.Receiver_Account = t2.Sender_Account 
          AND t2.Timestamp >= t1.Timestamp AND t2.Timestamp <= t1.Timestamp + INTERVAL 15 MINUTE
        WHERE t2.Sender_Account IS NULL
        GROUP BY t1.Sender_Account
        LIMIT 5;
    """
    
    cursor = con.cursor()
    high_res = cursor.execute(query_high).fetchall()
    med_res = cursor.execute(query_medium).fetchall()
    low_res = cursor.execute(query_low).fetchall()
    
    # Static fallbacks if DB returns empty
    high_list = [{"account_number": r[0], "label": "🔴 High Risk Reconverging Demo"} for r in high_res] if high_res else [{"account_number": "HDFC10000336", "label": "🔴 High Risk Reconverging Demo"}, {"account_number": "KKBK10000308", "label": "🔴 High Risk Reconverging Demo"}]
    med_list = [{"account_number": r[0], "label": "🟧 Medium Risk Multi-Hop Demo"} for r in med_res] if med_res else [{"account_number": "BARB10014314", "label": "🟧 Medium Risk Multi-Hop Demo"}]
    low_list = [{"account_number": r[0], "label": "🟢 Low Risk / Clean Demo"} for r in low_res] if low_res else [{"account_number": "AIRP10000498", "label": "🟢 Low Risk / Clean Demo"}]
    
    return {
        "high_risk": high_list,
        "medium_risk": med_list,
        "low_risk": low_list
    }


def search_accounts(query: str, limit: int = 10) -> List[Dict[str, str]]:
    con = get_db_connection()
    q = f"%{query.strip()}%"
    cursor = con.cursor()
    res = cursor.execute("""
        SELECT DISTINCT Sender_Account, Sender_IFSC 
        FROM transactions 
        WHERE Sender_Account LIKE ? 
        LIMIT ?
    """, [q, limit]).fetchall()
    return [{"account_number": r[0], "ifsc": r[1]} for r in res]

def get_sample_accounts(limit: int = 8) -> List[Dict[str, Any]]:
    con = get_db_connection()
    cursor = con.cursor()
    res = cursor.execute("""
        SELECT Sender_Account, COUNT(*) as tx_count, SUM(Amount) as total_amt
        FROM transactions 
        GROUP BY Sender_Account 
        HAVING COUNT(*) >= 5
        ORDER BY tx_count DESC
        LIMIT ?
    """, [limit]).fetchall()
    return [{"account_number": r[0], "tx_count": r[1], "total_amount": round(r[2], 2)} for r in res]
