from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TraceRequest(BaseModel):
    account_number: str
    max_hops: int = 20  # Failsafe circuit breaker (default: 20 hops for unlimited traversal)

class Node(BaseModel):
    id: str
    label: str
    role: str  # "root", "intermediate", "terminal"
    ifsc: Optional[str] = None
    in_degree: int = 0
    out_degree: int = 0
    total_received: float = 0.0
    total_sent: float = 0.0
    layer_level: int = 0  # L0, L1, L2, L3...
    is_cash_out: bool = False
    is_mule: bool = False

class Edge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    timestamp: str
    payment_mode: str
    narration: str
    ip_address: str
    device_type: str
    hop_level: int
    time_diff_minutes: float
    prev_transaction_id: Optional[str] = None
    risk_score: float = 0.0  # 0.0 to 100.0%
    risk_level: str = "LOW"  # "HIGH", "MEDIUM", "LOW"
    risk_factors: List[str] = []

class Verdict(BaseModel):
    verdict_type: str  # "CONFIRMED VICTIM", "MULE / SUSPECT", "LEGITIMATE / LOW RISK"
    victim_probability: float  # 0 - 100%
    fraud_association: float  # 0 - 100%
    pattern_detected: str  # e.g., "Multi-Tier Smurfing & Aggregation Tree (L1 -> L2 -> L3)"
    siphoned_amount: float
    layer_breakdown: Dict[str, int]  # e.g., {"L1": 3, "L2": 5, "L3_Cashout": 2}
    flagged_tx_count: int

class TraceSummary(BaseModel):
    root_account: str
    max_hops: int
    total_nodes: int
    total_edges: int
    total_volume_traced: float
    max_depth_reached: int
    execution_time_ms: float

class TraceResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    summary: TraceSummary
    verdict: Verdict
