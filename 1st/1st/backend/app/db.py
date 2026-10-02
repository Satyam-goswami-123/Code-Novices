import duckdb
import os
import time

DB_FILE = "transactions.duckdb"
CSV_FILE = "../VoidHacks8_MuleAccount_2M_Transactions - Copy.csv"

con = None

def get_db_connection():
    global con
    if con is None:
        init_db()
    return con

def init_db():
    global con
    start_time = time.time()
    db_exists = os.path.exists(DB_FILE)
    
    print(f"Connecting to DuckDB database ({DB_FILE})...")
    con = duckdb.connect(DB_FILE)
    
    # Check if table already exists
    table_check = con.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'transactions'").fetchone()[0]
    
    if table_check == 0:
        print(f"Loading 2M+ transactions dataset from {CSV_FILE} into DuckDB...")
        # Create table with explicit type casting and timestamp parsing
        con.execute(f"""
            CREATE TABLE transactions AS 
            SELECT 
                CAST(Transaction_ID AS VARCHAR) AS Transaction_ID,
                CAST(Sender_Account AS VARCHAR) AS Sender_Account,
                CAST(Receiver_Account AS VARCHAR) AS Receiver_Account,
                CAST(Sender_IFSC AS VARCHAR) AS Sender_IFSC,
                CAST(Receiver_IFSC AS VARCHAR) AS Receiver_IFSC,
                CAST(Amount AS DOUBLE) AS Amount,
                CAST(Timestamp AS TIMESTAMP) AS Timestamp,
                CAST(Payment_Mode AS VARCHAR) AS Payment_Mode,
                CAST(Narration AS VARCHAR) AS Narration,
                CAST(IP_Address AS VARCHAR) AS IP_Address,
                CAST(Device_Type AS VARCHAR) AS Device_Type
            FROM read_csv_auto('{CSV_FILE}', header=True)
        """)
        
        print("Creating indexes on Sender_Account, Receiver_Account, and Timestamp...")
        con.execute("CREATE INDEX idx_sender ON transactions(Sender_Account)")
        con.execute("CREATE INDEX idx_receiver ON transactions(Receiver_Account)")
        con.execute("CREATE INDEX idx_timestamp ON transactions(Timestamp)")
        
        row_count = con.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        print(f"Dataset initialized successfully! {row_count:,} rows loaded in {time.time() - start_time:.2f}s.")
    else:
        row_count = con.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
        print(f"Loaded existing DuckDB database with {row_count:,} records in {time.time() - start_time:.2f}s.")
