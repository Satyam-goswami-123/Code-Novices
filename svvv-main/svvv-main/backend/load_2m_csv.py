import sqlite3
import csv
import os
import sys
from datetime import datetime

DB_PATH = 'C:\\Users\\satya\\Downloads\\Svvv-26\\svvv-main\\svvv-main\\backend\\abhedya_crime.db'
CSV_PATH = 'C:\\Users\\satya\\Downloads\\Svvv-26\\svvv-main\\VoidHacks8_MuleAccount_2M_Transactions.csv'

def get_bank_name(ifsc):
    if not ifsc: return "Unknown"
    return ifsc[:4]

def load_csv():
    if not os.path.exists(CSV_PATH):
        print(f"File not found: {CSV_PATH}")
        sys.exit(1)
        
    conn = sqlite3.connect(DB_PATH)
    # Removing PRAGMAS to prevent disk I/O error on large datasets
    c = conn.cursor()

    print("Wiping existing fake data...")
    c.execute("DELETE FROM transactions")
    c.execute("DELETE FROM accounts")
    c.execute("DELETE FROM mule_links")
    c.execute("DELETE FROM fraud_reports")
    conn.commit()

    print("Reading CSV and building accounts...")
    accounts_dict = {} # account_number -> id
    
    # Pass 1: Collect unique accounts
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            s_acc = row['Sender_Account']
            s_ifsc = row['Sender_IFSC']
            r_acc = row['Receiver_Account']
            r_ifsc = row['Receiver_IFSC']
            
            if s_acc and s_acc not in accounts_dict:
                accounts_dict[s_acc] = {"ifsc": s_ifsc, "bank": get_bank_name(s_ifsc)}
            if r_acc and r_acc not in accounts_dict:
                accounts_dict[r_acc] = {"ifsc": r_ifsc, "bank": get_bank_name(r_ifsc)}

    print(f"Found {len(accounts_dict)} unique accounts. Inserting into DB...")
    
    # Insert accounts and get their auto-incremented IDs
    account_db_mapping = {}
    
    # We will bulk insert
    acc_rows = []
    for acc_num, info in accounts_dict.items():
        acc_rows.append((acc_num, info['ifsc'], info['bank'], f"Holder {acc_num[-4:]}", 0.0))
        
    c.executemany("""
        INSERT INTO accounts (account_number, ifsc_code, bank_name, account_holder_name, risk_score)
        VALUES (?, ?, ?, ?, ?)
    """, acc_rows)
    conn.commit()
    
    # Read back IDs
    for row in c.execute("SELECT id, account_number FROM accounts"):
        account_db_mapping[row[1]] = row[0]
        
    print("Inserting transactions in chunks...")
    # Pass 2: Insert transactions
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        batch = []
        count = 0
        for row in reader:
            s_id = account_db_mapping.get(row['Sender_Account'])
            r_id = account_db_mapping.get(row['Receiver_Account'])
            
            if s_id and r_id:
                batch.append((
                    row['Transaction_ID'],
                    s_id,
                    r_id,
                    float(row['Amount']) if row['Amount'] else 0.0,
                    row['Timestamp'],
                    row['Payment_Mode'],
                    row['IP_Address'],
                    row['Device_Type'],
                    row['Narration']
                ))
            
            if len(batch) >= 50000:
                c.executemany("""
                    INSERT OR IGNORE INTO transactions (txn_id, sender_account_id, receiver_account_id, amount, timestamp, payment_mode, ip_address, device_id, narration)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()
                count += len(batch)
                print(f"Inserted {count} transactions...")
                batch = []
                
        if batch:
            c.executemany("""
                INSERT OR IGNORE INTO transactions (txn_id, sender_account_id, receiver_account_id, amount, timestamp, payment_mode, ip_address, device_id, narration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            conn.commit()
            count += len(batch)
            print(f"Inserted {count} transactions...")

    print("Building Mule Links summary table...")
    c.execute("""
        INSERT INTO mule_links (sender_id, receiver_id, total_volume, txn_count)
        SELECT sender_account_id, receiver_account_id, SUM(amount), COUNT(*)
        FROM transactions
        GROUP BY sender_account_id, receiver_account_id
    """)
    conn.commit()
    
    conn.close()
    print("Data loaded successfully!")

if __name__ == "__main__":
    load_csv()
