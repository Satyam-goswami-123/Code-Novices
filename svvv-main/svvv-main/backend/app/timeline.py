from typing import Optional
from collections import defaultdict
import hashlib
from .db import get_conn

def get_geo_for_ifsc_or_ip(ifsc: str, ip: str):
    """
    Deterministically assign a realistic Indian lat/lng based on IFSC or IP
    so that the same branch/IP always maps to the same location.
    """
    # List of major Indian cities with approx lat/lng
    cities = [
        ("Mumbai", 19.0760, 72.8777),
        ("Delhi", 28.7041, 77.1025),
        ("Bengaluru", 12.9716, 77.5946),
        ("Hyderabad", 17.3850, 78.4867),
        ("Ahmedabad", 23.0225, 72.5714),
        ("Chennai", 13.0827, 80.2707),
        ("Kolkata", 22.5726, 88.3639),
        ("Surat", 21.1702, 72.8311),
        ("Pune", 18.5204, 73.8567),
        ("Jaipur", 26.9124, 75.7873),
        ("Lucknow", 26.8467, 80.9462),
        ("Kanpur", 26.4499, 80.3319),
        ("Nagpur", 21.1458, 79.0882),
        ("Indore", 22.7196, 75.8577),
        ("Thane", 19.2183, 72.9781),
        ("Bhopal", 23.2599, 77.4126),
        ("Visakhapatnam", 17.6868, 83.2185),
        ("Pimpri-Chinchwad", 18.6298, 73.7997),
        ("Patna", 25.5941, 85.1376),
        ("Vadodara", 22.3072, 73.1812),
        ("Ghaziabad", 28.6692, 77.4538),
        ("Ludhiana", 30.9010, 75.8573),
        ("Agra", 27.1767, 78.0081),
        ("Nashik", 20.0110, 73.7903),
        ("Ranchi", 23.3441, 85.3096),
        ("Guwahati", 26.1445, 91.7362),
        ("Chandigarh", 30.7333, 76.7794),
        ("Mysuru", 12.2958, 76.6394),
        ("Hubballi", 15.3647, 75.1240),
        ("Mangaluru", 12.9141, 74.8560)
    ]
    
    # Use IFSC first, fallback to IP, fallback to something random
    key_str = str(ifsc or ip or "UNKNOWN")
    h = int(hashlib.md5(key_str.encode()).hexdigest(), 16)
    
    city = cities[h % len(cities)]
    
    # Add a tiny bit of deterministic jitter based on hash so branches in same city aren't exactly on top
    jitter_lat = ((h % 100) - 50) / 1000.0
    jitter_lng = (((h // 100) % 100) - 50) / 1000.0
    
    return {
        "city": city[0],
        "lat": city[1] + jitter_lat,
        "lng": city[2] + jitter_lng
    }

def trace_hotspots(txn_id: str, max_hops: int = 3):
    """
    Traces the funds for a specific transaction ID and maps them geographically.
    Returns bucketed flows to animate over time.
    """
    conn = get_conn()
    try:
        # Find the initial transaction
        q_init = """SELECT t.txn_id, t.sender_account_id, t.receiver_account_id, t.amount, t.timestamp, 
                           t.payment_mode, t.ip_address,
                           sa.ifsc_code as s_ifsc, ra.ifsc_code as r_ifsc
                    FROM transactions t
                    JOIN accounts sa ON sa.id = t.sender_account_id
                    JOIN accounts ra ON ra.id = t.receiver_account_id
                    WHERE t.txn_id = ?"""
        init_txn = conn.execute(q_init, (txn_id,)).fetchone()
        
        if not init_txn:
            return {"error": "Transaction not found"}
            
        init_txn = dict(init_txn)
        
        flows = []
        current_layer = [(init_txn["receiver_account_id"], init_txn["timestamp"])]
        
        # Add initial flow
        s_geo = get_geo_for_ifsc_or_ip(init_txn["s_ifsc"], init_txn["ip_address"])
        r_geo = get_geo_for_ifsc_or_ip(init_txn["r_ifsc"], init_txn["ip_address"])
        
        flows.append({
            "bucket": init_txn["timestamp"][:16], # YYYY-MM-DD HH:MM
            "from_lat": s_geo["lat"],
            "from_lng": s_geo["lng"],
            "to_lat": r_geo["lat"],
            "to_lng": r_geo["lng"],
            "amount": init_txn["amount"],
            "from_city": s_geo["city"],
            "to_city": r_geo["city"],
            "txn_id": init_txn["txn_id"],
            "layer": 0
        })
        
        layer_num = 1
        
        while current_layer and layer_num <= max_hops:
            next_layer = []
            for acc_id, ts in current_layer:
                q_out = """SELECT t.txn_id, t.sender_account_id, t.receiver_account_id, t.amount, t.timestamp, 
                                  t.payment_mode, t.ip_address,
                                  sa.ifsc_code as s_ifsc, ra.ifsc_code as r_ifsc
                           FROM transactions t
                           JOIN accounts sa ON sa.id = t.sender_account_id
                           JOIN accounts ra ON ra.id = t.receiver_account_id
                           WHERE t.sender_account_id = ? AND t.timestamp >= ? 
                           ORDER BY t.timestamp ASC LIMIT 20"""
                out_txns = conn.execute(q_out, (acc_id, ts)).fetchall()
                
                for ot in out_txns:
                    ot = dict(ot)
                    s_g = get_geo_for_ifsc_or_ip(ot["s_ifsc"], ot["ip_address"])
                    r_g = get_geo_for_ifsc_or_ip(ot["r_ifsc"], ot["ip_address"])
                    
                    flows.append({
                        "bucket": ot["timestamp"][:16],
                        "from_lat": s_g["lat"],
                        "from_lng": s_g["lng"],
                        "to_lat": r_g["lat"],
                        "to_lng": r_g["lng"],
                        "amount": ot["amount"],
                        "from_city": s_g["city"],
                        "to_city": r_g["city"],
                        "txn_id": ot["txn_id"],
                        "layer": layer_num
                    })
                    
                    next_layer.append((ot["receiver_account_id"], ot["timestamp"]))
                    
            current_layer = next_layer
            layer_num += 1
            
        # Group by buckets for the frontend animation
        result = defaultdict(list)
        for f in flows:
            result[f["bucket"]].append(f)
            
        return dict(sorted(result.items()))
        
    finally:
        conn.close()

def hotspot_timeline(months_back: int = 36, crime_type: Optional[str] = None):
    """
    Fallback mock implementation if no TXN_ID is provided.
    """
    import random
    metros = [
        {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946},
        {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
        {"name": "Delhi", "lat": 28.7041, "lng": 77.1025},
    ]
    tier2 = [
        {"name": "Hubballi", "lat": 15.3647, "lng": 75.1240},
        {"name": "Mysuru", "lat": 12.2958, "lng": 76.6394},
        {"name": "Surat", "lat": 21.1702, "lng": 72.8311},
        {"name": "Patna", "lat": 25.5941, "lng": 85.1376},
    ]
    result = {}
    import datetime
    base = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    
    for i in range(30):
        current_date = (base + datetime.timedelta(days=i)).strftime('%Y-%m-%d %H:00')
        flows = []
        num_bursts = random.randint(1, 3)
        for _ in range(num_bursts):
            victim = random.choice(metros)
            num_mules = random.randint(2, 4)
            mules = random.sample(tier2, num_mules)
            base_amount = random.randint(50000, 500000)
            
            for m in mules:
                flows.append({
                    "from_lat": victim['lat'] + random.uniform(-0.05, 0.05),
                    "from_lng": victim['lng'] + random.uniform(-0.05, 0.05),
                    "to_lat": m['lat'] + random.uniform(-0.1, 0.1),
                    "to_lng": m['lng'] + random.uniform(-0.1, 0.1),
                    "amount": int(base_amount / num_mules),
                    "from_city": victim['name'],
                    "to_city": m['name']
                })
        result[current_date] = flows
    return dict(sorted(result.items()))
