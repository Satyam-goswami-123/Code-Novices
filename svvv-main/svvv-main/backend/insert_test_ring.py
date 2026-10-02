import sqlite3
from datetime import datetime, timedelta

def insert_test_ring():
    conn = sqlite3.connect('c:\\Users\\satya\\Downloads\\Svvv-26\\svvv-main\\svvv-main\\backend\\abhedya_crime.db')
    c = conn.cursor()
    
    # 1. Insert Accounts
    accounts = [
        (1001, "ACC_VICTIM", "Victim Bank", "Priya Sharma (Victim)", 0.1, "HDFC0001"),
        (1002, "ACC_L1", "Mule Bank X", "Ravi Kumar (L1 Collector)", 0.9, "SBIN0001"),
        (1003, "ACC_L2_A", "Mule Bank Y", "Amit Singh (L2 Disperser)", 0.8, "ICIC0001"),
        (1004, "ACC_L2_B", "Mule Bank Z", "Rahul Verma (L2 Disperser)", 0.85, "AXIS0001"),
        (1005, "ACC_L2_C", "Mule Bank W", "Sneha Gupta (L2 Disperser)", 0.75, "KKBK0001"),
        (1006, "ACC_CASHOUT", "Crypto Exchange", "Binance P2P Escrow", 0.95, "YESB0001"),
    ]
    
    for acc in accounts:
        c.execute("INSERT OR REPLACE INTO accounts (id, account_number, bank_name, account_holder_name, risk_score, ifsc_code) VALUES (?, ?, ?, ?, ?, ?)", acc)
        
    # 2. Insert Transactions
    # Victim -> L1
    base_time = datetime.utcnow() - timedelta(days=1)
    
    txns = [
        # Victim -> L1 Collector
        ("TXN_SCAM_01", 1001, 1002, 500000, base_time.isoformat(), "IMPS", "192.168.1.1", "Desktop", "Urgent Medical"),
        
        # L1 -> L2s (happening 10 mins later)
        ("TXN_SCAM_02", 1002, 1003, 200000, (base_time + timedelta(minutes=10)).isoformat(), "UPI", "10.0.0.1", "Mobile", "Rent"),
        ("TXN_SCAM_03", 1002, 1004, 200000, (base_time + timedelta(minutes=12)).isoformat(), "UPI", "10.0.0.1", "Mobile", "Transfer"),
        ("TXN_SCAM_04", 1002, 1005, 100000, (base_time + timedelta(minutes=14)).isoformat(), "UPI", "10.0.0.1", "Mobile", "Loan Repay"),
        
        # L2_A -> Cash Out (happening 20 mins later)
        ("TXN_SCAM_05", 1003, 1006, 200000, (base_time + timedelta(minutes=30)).isoformat(), "RTGS", "10.0.0.2", "Mobile", "Crypto Buy"),
        # L2_B -> Cash Out
        ("TXN_SCAM_06", 1004, 1006, 200000, (base_time + timedelta(minutes=35)).isoformat(), "RTGS", "10.0.0.3", "Mobile", "USDT"),
    ]
    
    for t in txns:
        c.execute("INSERT OR REPLACE INTO transactions (txn_id, sender_account_id, receiver_account_id, amount, timestamp, payment_mode, ip_address, device_id, narration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", t)
        
    conn.commit()
    conn.close()
    print("Test ring inserted successfully. Try tracing TXN_SCAM_01")

if __name__ == '__main__':
    insert_test_ring()
