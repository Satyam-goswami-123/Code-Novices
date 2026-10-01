import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'abhedya_crime.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("PRAGMA foreign_keys=off;")
    c.execute("BEGIN TRANSACTION;")
    c.execute("ALTER TABLE users RENAME TO users_old;")
    
    c.execute('''
    CREATE TABLE users (
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
    )
    ''')
    
    c.execute('''
    INSERT INTO users (id, username, password_hash, full_name, role, station_id, created_at)
    SELECT id, username, password_hash, full_name, role, station_id, created_at
    FROM users_old
    ''')
    
    c.execute("DROP TABLE users_old;")
    
    c.execute('''
    CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')
    
    c.execute('''
    CREATE TABLE IF NOT EXISTS active_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_jti TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        browser TEXT,
        device TEXT,
        login_time TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')
    
    c.execute("UPDATE users SET email='admin@abhedya.gov.in', mobile='9876543210', rank='DGP', department='Headquarters' WHERE username='admin'")
    c.execute("UPDATE users SET email='inspector@abhedya.gov.in', mobile='9876543211', rank='Inspector', department='Crime Branch' WHERE username='inspector'")
    c.execute("UPDATE users SET email='analyst@abhedya.gov.in', mobile='9876543212', rank='Analyst', department='Intelligence' WHERE username='analyst'")
    c.execute("UPDATE users SET email='viewer@abhedya.gov.in', mobile='9876543213', rank='Sub-Inspector', department='General' WHERE username='viewer'")
    
    conn.commit()
    c.execute("PRAGMA foreign_keys=on;")
    print("Database migrated successfully.")
except Exception as e:
    conn.rollback()
    print("Error migrating database:", e)
finally:
    conn.close()
