import csv
import io
import time
from fastapi import UploadFile
from .db import get_conn, conn_ctx

def ingest_csv(file: UploadFile):
    """
    Ingests a massive CSV file into the database.
    Schema expected:
    Transaction_ID, Sender_Account, Receiver_Account, Sender_IFSC, Receiver_IFSC, Amount, Timestamp, Payment_Mode, Narration, IP_Address, Device_Type
    """
    start_time = time.time()
    
    # We will read line by line directly from the file spool
    # using a batched approach for sqlite inserts
    
    accounts_to_insert = {}
    transactions_batch = []
    mule_links_batch = {}
    
    # Empty existing data
    with conn_ctx() as c:
        c.execute("DELETE FROM transactions")
        c.execute("DELETE FROM mule_links")
        c.execute("DELETE FROM accounts")
        
    inserted_rows = 0
    
    # Read the file line by line
    header_read = False
    headers = []
    
    def process_batch(tx_batch, acc_batch, ml_batch):
        with conn_ctx() as c:
            # Insert accounts
            acc_list = []
            for acc_num, data in acc_batch.items():
                acc_list.append((acc_num, data['ifsc'], data['bank'], data['holder'], data['risk']))
            
            c.executemany("""
                INSERT OR IGNORE INTO accounts 
                (account_number, ifsc_code, bank_name, account_holder_name, risk_score)
                VALUES (?, ?, ?, ?, ?)
            """, acc_list)
            
            # We need the inserted IDs for transactions
            acc_ids = {row['account_number']: row['id'] for row in c.execute("SELECT id, account_number FROM accounts").fetchall()}
            
            # Map tx_batch
            tx_insert = []
            for tx in tx_batch:
                sender_id = acc_ids.get(tx['sender'])
                receiver_id = acc_ids.get(tx['receiver'])
                if sender_id and receiver_id:
                    tx_insert.append((
                        tx['txn_id'], sender_id, receiver_id, tx['amount'], tx['timestamp'],
                        tx['payment_mode'], tx['ip_address'], 'Desktop', tx['narration']
                    ))
            
            c.executemany("""
                INSERT OR IGNORE INTO transactions
                (txn_id, sender_account_id, receiver_account_id, amount, timestamp, payment_mode, ip_address, device_id, narration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, tx_insert)
            
            # Insert Mule links
            ml_insert = []
            for (sender, receiver), stats in ml_batch.items():
                s_id = acc_ids.get(sender)
                r_id = acc_ids.get(receiver)
                if s_id and r_id:
                    ml_insert.append((s_id, r_id, stats['volume'], stats['count'], stats['volume'], stats['count']))
            
            c.executemany("""
                INSERT INTO mule_links (sender_id, receiver_id, total_volume, txn_count)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(sender_id, receiver_id) DO UPDATE SET
                total_volume = total_volume + ?,
                txn_count = txn_count + ?
            """, ml_insert)

    import codecs
    reader = csv.reader(codecs.iterdecode(file.file, 'utf-8'))
    
    try:
        for row in reader:
            if not header_read:
                headers = [h.strip() for h in row]
                header_read = True
                continue
                
            if not row or len(row) < 10:
                continue
                
            # Map standard columns based on typical VoidHacks 8.0 schema
            try:
                txn_id = row[0]
                sender = row[1]
                receiver = row[2]
                sender_ifsc = row[3]
                receiver_ifsc = row[4]
                amount = float(row[5])
                timestamp = row[6]
                payment_mode = row[7]
                narration = row[8]
                ip_address = row[9]
                
                # Mock risk/bank
                accounts_to_insert[sender] = {'ifsc': sender_ifsc, 'bank': f"Bank {sender_ifsc[:4]}", 'holder': f"User {sender[-4:]}", 'risk': 0.1}
                accounts_to_insert[receiver] = {'ifsc': receiver_ifsc, 'bank': f"Bank {receiver_ifsc[:4]}", 'holder': f"User {receiver[-4:]}", 'risk': 0.9 if amount > 50000 else 0.3}
                
                transactions_batch.append({
                    'txn_id': txn_id, 'sender': sender, 'receiver': receiver,
                    'amount': amount, 'timestamp': timestamp, 'payment_mode': payment_mode,
                    'narration': narration, 'ip_address': ip_address
                })
                
                link_key = (sender, receiver)
                if link_key not in mule_links_batch:
                    mule_links_batch[link_key] = {'volume': 0, 'count': 0}
                mule_links_batch[link_key]['volume'] += amount
                mule_links_batch[link_key]['count'] += 1
                
                inserted_rows += 1
                
                if len(transactions_batch) >= 10000:
                    process_batch(transactions_batch, accounts_to_insert, mule_links_batch)
                    transactions_batch = []
                    accounts_to_insert = {}
                    mule_links_batch = {}
                    
            except Exception as e:
                pass # skip malformed row
                
        # Final batch
        if transactions_batch:
            process_batch(transactions_batch, accounts_to_insert, mule_links_batch)
            
    finally:
        file.file.close()

    end_time = time.time()
    return {
        "success": True,
        "filename": file.filename,
        "rows_indexed": inserted_rows,
        "ingest_time": f"{(end_time - start_time):.2f}s"
    }
