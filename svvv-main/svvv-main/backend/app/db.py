import sqlite3
from contextlib import contextmanager
from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin','investigator','analyst','viewer')),
    station_id INTEGER,
    email TEXT UNIQUE,
    mobile TEXT,
    rank TEXT,
    department TEXT,
    must_change_password BOOLEAN DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT UNIQUE NOT NULL,
    ifsc_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    risk_score REAL DEFAULT 0.0,
    is_frozen BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    txn_id TEXT UNIQUE NOT NULL,
    sender_account_id INTEGER NOT NULL,
    receiver_account_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    timestamp TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    ip_address TEXT,
    device_id TEXT,
    narration TEXT,
    is_flagged BOOLEAN DEFAULT 0,
    FOREIGN KEY(sender_account_id) REFERENCES accounts(id),
    FOREIGN KEY(receiver_account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS fraud_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT UNIQUE NOT NULL,
    victim_account_id INTEGER NOT NULL,
    initial_txn_id INTEGER NOT NULL,
    reported_at TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('open','under_investigation','frozen','closed')),
    FOREIGN KEY(victim_account_id) REFERENCES accounts(id),
    FOREIGN KEY(initial_txn_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS mule_links (
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    total_volume REAL DEFAULT 0.0,
    txn_count INTEGER DEFAULT 0,
    PRIMARY KEY(sender_id, receiver_id),
    FOREIGN KEY(sender_id) REFERENCES accounts(id),
    FOREIGN KEY(receiver_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    username TEXT,
    role TEXT,
    action TEXT,
    nl_query TEXT,
    sql_used TEXT,
    provider TEXT,
    success INTEGER,
    details TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    meta TEXT,
    ts TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id)
);

CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS active_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_jti TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    browser TEXT,
    device TEXT,
    login_time TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_txn_sender ON transactions(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_txn_receiver ON transactions(receiver_account_id);
CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_acc_number ON accounts(account_number);
"""

def get_conn():
    conn = sqlite3.connect(settings.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager
def conn_ctx():
    c = get_conn()
    try:
        yield c
        c.commit()
    finally:
        c.close()

def init_db():
    import os, shutil
    db_path = settings.DB_PATH
    if getattr(settings, "_in_catalyst", False) and getattr(settings, "DB_PATH", "").startswith("/tmp/"):
        # We are in Catalyst, and DB_PATH is in /tmp
        if not os.path.exists(db_path):
            bundled_db = os.path.join(os.path.dirname(__file__), "..", "abhedya_crime.db")
            if os.path.exists(bundled_db):
                try:
                    shutil.copy2(bundled_db, db_path)
                    print("Copied bundled database to /tmp")
                except Exception as e:
                    print("Failed to copy database:", e)
    
    # Run schema script to ensure tables exist in case it was an empty file
    with conn_ctx() as c:
        c.executescript(SCHEMA)
