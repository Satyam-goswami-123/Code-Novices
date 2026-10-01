"""Seed synthetic Abhedya-Chakra financial data."""
import random
from datetime import datetime, timedelta
from faker import Faker
from passlib.context import CryptContext
from .db import conn_ctx, init_db

fake = Faker("en_IN")
random.seed(7); Faker.seed(7)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BoB", "Canara", "Union", "IndusInd"]
CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat"]
PAYMENT_MODES = ["IMPS", "NEFT", "RTGS", "UPI", "Card"]
NARRATIONS = ["Salary", "Rent", "Groceries", "Food", "Bill Payment", "Transfer", "Investment", "Loan EMI", "Medical", "Travel"]
FRAUD_NARRATIONS = ["Crypto Purchase", "Investment Return", "Lottery Fee", "Customs Clearance", "Tech Support", "P2P Transfer", "Wallet Load"]

def seed(n_accounts=5000, n_txns=20000, n_fraud_rings=50):
    init_db()
    with conn_ctx() as c:
        if c.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] > 0:
            print("Already seeded."); return

        # users
        users = [
            ("admin","admin123","Admin Officer","admin",None),
            ("investigator","investigator123","Insp. Rakesh Kumar","investigator",1),
            ("analyst","analyst123","Anita Rao","analyst",None),
            ("viewer","viewer123","Public Viewer","viewer",None),
        ]
        for u,p,n,r,s in users:
            c.execute("INSERT INTO users(username,password_hash,full_name,role,station_id) VALUES (?,?,?,?,?)",
                      (u, pwd.hash(p), n, r, s))

        # accounts
        account_ids = []
        for _ in range(n_accounts):
            acc_num = f"{random.randint(10000000000, 99999999999)}"
            bank = random.choice(BANKS)
            ifsc = f"{bank[:4].upper()}000{random.randint(1000,9999)}"
            gender = random.choice(["M","M","M","F","F","Other"])
            name = fake.name_male() if gender=="M" else fake.name_female() if gender=="F" else fake.name()
            c.execute("""INSERT INTO accounts(account_number,ifsc_code,bank_name,account_holder_name,age,gender,address,city,state,risk_score)
                         VALUES (?,?,?,?,?,?,?,?,?,?)""",
                      (acc_num, ifsc, bank, name, random.randint(18,70), gender,
                       fake.address().replace("\n",", "), random.choice(CITIES), "State", 0.0))
            account_ids.append(c.execute("SELECT last_insert_rowid()").fetchone()[0])

        start = datetime(2023,1,1)
        end = datetime(2026,6,1)
        span = (end-start).days

        # normal transactions
        for i in range(n_txns):
            sender = random.choice(account_ids)
            receiver = random.choice(account_ids)
            while receiver == sender: receiver = random.choice(account_ids)
            
            amount = round(random.uniform(100, 50000), 2)
            ts = start + timedelta(days=random.randint(0,span), hours=random.randint(0,23), minutes=random.randint(0,59))
            mode = random.choice(PAYMENT_MODES)
            ip = fake.ipv4() if random.random() > 0.5 else None
            device = f"DEV-{random.randint(1000,9999)}" if ip else None
            narration = random.choice(NARRATIONS)
            
            c.execute("""INSERT INTO transactions(txn_id,sender_account_id,receiver_account_id,amount,timestamp,payment_mode,ip_address,device_id,narration)
                         VALUES (?,?,?,?,?,?,?,?,?)""",
                      (f"TXN{ts.strftime('%Y%m%d%H%M%S')}{i}", sender, receiver, amount, ts.isoformat(), mode, ip, device, narration))

        # create fraud rings (layered laundering)
        # Victim -> L1 Mule -> (split) L2 Mules -> (split) L3 Mules / Cash out
        fraud_reports_count = 0
        for ring in range(n_fraud_rings):
            victim = random.choice(account_ids)
            l1_mule = random.choice(account_ids)
            while l1_mule == victim: l1_mule = random.choice(account_ids)
            
            l2_mules = [random.choice(account_ids) for _ in range(random.randint(2,5))]
            
            ts = start + timedelta(days=random.randint(0,span), hours=random.randint(0,23))
            
            # Victim to L1
            amount = round(random.uniform(50000, 500000), 2)
            ip = fake.ipv4() # attacker IP
            device = "ATTACK-DEV"
            txn_id = f"FRD{ts.strftime('%Y%m%d%H%M%S')}{ring}V"
            narration = random.choice(FRAUD_NARRATIONS)
            c.execute("""INSERT INTO transactions(txn_id,sender_account_id,receiver_account_id,amount,timestamp,payment_mode,ip_address,device_id,narration,is_flagged)
                         VALUES (?,?,?,?,?,?,?,?,?,?)""",
                      (txn_id, victim, l1_mule, amount, ts.isoformat(), "IMPS", ip, device, narration, 1))
            initial_txn = c.execute("SELECT last_insert_rowid()").fetchone()[0]
            
            # file fraud report
            c.execute("""INSERT INTO fraud_reports(report_id,victim_account_id,initial_txn_id,reported_at,description,status)
                         VALUES (?,?,?,?,?,?)""",
                      (f"RPT{ring}", victim, initial_txn, (ts + timedelta(hours=2)).isoformat(), f"Victim reported unauthorized {narration} transfer.", "open"))
            fraud_reports_count += 1
            
            # L1 to L2
            split_amount = amount / len(l2_mules)
            ts = ts + timedelta(minutes=random.randint(5,30))
            for i, l2 in enumerate(l2_mules):
                txn_id = f"FRD{ts.strftime('%Y%m%d%H%M%S')}{ring}L2{i}"
                c.execute("""INSERT INTO transactions(txn_id,sender_account_id,receiver_account_id,amount,timestamp,payment_mode,ip_address,device_id,narration,is_flagged)
                             VALUES (?,?,?,?,?,?,?,?,?,?)""",
                          (txn_id, l1_mule, l2, split_amount, ts.isoformat(), "UPI", ip, device, "P2P", 1))
                
                # L2 to Cash-out (Exchange or ATM)
                l3 = random.choice(account_ids)
                ts_l3 = ts + timedelta(minutes=random.randint(2,15))
                c.execute("""INSERT INTO transactions(txn_id,sender_account_id,receiver_account_id,amount,timestamp,payment_mode,ip_address,device_id,narration,is_flagged)
                             VALUES (?,?,?,?,?,?,?,?,?,?)""",
                          (f"FRD{ts_l3.strftime('%Y%m%d%H%M%S')}{ring}L3{i}", l2, l3, split_amount*0.95, ts_l3.isoformat(), "IMPS", ip, device, "Crypto Buy", 1))

        # build mule_links
        rows = c.execute("""SELECT sender_account_id, receiver_account_id, SUM(amount) vol, COUNT(*) cnt
                            FROM transactions GROUP BY sender_account_id, receiver_account_id""").fetchall()
        for r in rows:
            c.execute("""INSERT INTO mule_links(sender_id,receiver_id,total_volume,txn_count)
                         VALUES (?,?,?,?)""", (r[0], r[1], float(r[2]), r[3]))

        print(f"Seeded {n_accounts} accounts, {n_txns} background txns, {n_fraud_rings} fraud rings.")


if __name__ == "__main__":
    seed()
