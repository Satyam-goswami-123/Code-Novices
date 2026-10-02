# AegisTrace 🛡️ — Forensic Financial Trail Intelligence Engine

**AegisTrace** is a high-performance, graph-first web application designed for forensic transaction tracing and automated mule ring detection on large datasets (**2,000,000+ banking transactions**).

Powered by **FastAPI**, **DuckDB in-memory analytical query engine**, and a high-contrast **Vis.js Network Force-Graph UI**, AegisTrace executes recursive temporal chain traversal over 2M records with sub-second query response times.

---

## 🌟 Key Capabilities & Features

1. **Strict Linked 15-Minute Temporal Chaining**:
   - Every downstream transaction ($T_{\text{out}}$) must satisfy:
     $$0 \le (\text{Timestamp}_{\text{out}} - \text{Timestamp}_{\text{in}}) \le 15 \text{ MINUTES} \quad (900 \text{ seconds})$$
   - All disconnected, delayed ($>15$ min), or loose historical transfers are strictly dropped.
2. **Topology-First Fraud Pattern Recognition**:
   - **🔴 High Risk (>70%)**: Triggered ONLY when verified **Structural Reconvergence** occurs (Root $\rightarrow$ Fan-Out 2+ $\rightarrow$ Downstream Funneling into 1–2 shared collection accounts).
   - **🟧 Medium Risk (35%–70%)**: Multi-hop pass-through transfers ($Root \rightarrow A \rightarrow B$ within 15 min) without single-point reconvergence.
   - **🟢 Low Risk (<35%)**: Single-hop disbursements where recipients have NO onward transfers within 15 minutes (e.g. `AIRP10000498`). Nodes render in Emerald Green.
3. **Automated Victim vs. Fraudster Verdict Classifier**:
   - Classifies queried accounts into `CONFIRMED VICTIM`, `MULE / SUSPECT`, or `LEGITIMATE / LOW RISK`.
   - Generates confidence probability scores and structural pattern descriptions.
4. **Distraction-Free, Graph-First UI**:
   - Expands graph canvas to **85%+ of viewport** with deep slate dot grid background (`#0B0F17`).
   - Smooth circular glowing nodes (Blue, Amber, Red, Green).
   - Curved Bezier edge flows labeled concisely (`₹50,000 • +3m`).
   - Off-canvas drawer sliding open ONLY when a user clicks a node or edge.
5. **Direct DuckDB Diagnostic API Route (`GET /api/diagnostics/sample-accounts`)**:
   - Executes targeted SQL queries directly on the loaded dataset to find verified test IDs for 🔴 High Risk, 🟧 Medium Risk, and 🟢 Low Risk scenarios with 1-click test buttons on the navbar.

---

## 📂 Expected Repository Structure

```text
aegistrace/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point & API routes
│   │   ├── tracer.py          # DuckDB queries, recursive 15-min traversal, risk heuristics
│   │   ├── db.py              # DuckDB database manager & indexing
│   │   └── models.py          # Pydantic schemas for graph response & verdicts
│   ├── run.py                 # Backend server launcher
│   └── requirements.txt       # fastapi, uvicorn, duckdb, pydantic, pandas
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, GraphCanvas, DetailsDrawer, LegendModal
│   │   ├── App.jsx            # Main application layout
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Tailwind & canvas dot grid styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── data/
│   ├── .gitkeep
│   └── sample_demo.csv        # Mock CSV showing exact column schema
├── .gitignore                 # Configured to exclude *.csv, *.parquet, *.duckdb, node_modules/
├── README.md                  # System architecture & execution guide
└── run.bat                    # Single-command launcher script for Windows
```

---

## 📊 Dataset Placement Guide

Place your full 2,000,000+ records CSV file in the project root directory or `data/` directory named:
```text
VoidHacks8_MuleAccount_2M_Transactions - Copy.csv
```
*(or update the `CSV_FILE` path in `backend/app/db.py` to point to `data/transactions.csv`)*.

### Expected CSV Column Schema:
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `Transaction_ID` | String | Unique transaction reference ID (e.g., `TXN401119292`) |
| `Sender_Account` | String/Int | Originating account ID |
| `Receiver_Account` | String/Int | Destination account ID |
| `Sender_IFSC` | String | Sender bank IFSC code |
| `Receiver_IFSC` | String | Receiver bank IFSC code |
| `Amount` | Numeric | Transaction amount in INR ($\text{₹}$) |
| `Timestamp` | Datetime | Format: `YYYY-MM-DD HH:MM:SS` |
| `Payment_Mode` | String | Payment rail: `UPI`, `IMPS`, `NEFT`, `RTGS` |
| `Narration` | String | Transfer remark / narration string |
| `IP_Address` | String | Client IPv4 address |
| `Device_Type` | String | Client device header (e.g. `Android`, `Web_Emulator`, `Linux_Script`) |

---

## 🚀 Setup & Quick Start Instructions

### Prerequisites
- **Python 3.9+**
- **Node.js 18+** & **npm 9+**

---

### Option 1: Unified Single-Command Startup (Recommended)

Run the backend server script, which automatically initializes DuckDB, loads the dataset, and serves both the API and pre-built frontend interface:

```bash
python backend/run.py
```
Open your browser at **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

---

### Option 2: Manual Development Setup

#### 1. Backend Setup:
```bash
# Create & activate virtual environment (optional)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Launch FastAPI server
python backend/run.py
```

#### 2. Frontend Development Setup:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing Risk Scenarios & Diagnostic Endpoints

Click the quick scenario pills on the top navigation bar or submit these test account IDs:

1. 🔴 **High-Risk Reconverging Mule Ring**:
   - Test ID: `HDFC10000336` or `KKBK10000308`
   - *Result*: Red edges ($>70\%$ Risk), `CONFIRMED VICTIM` Verdict, `Multi-Tier Smurfing & Aggregation Tree`.
2. 🟧 **Medium-Risk Multi-Hop Pass-Through**:
   - Test ID: `BARB10014314` or `PUNB10000306`
   - *Result*: Amber edges ($35\% - 70\%$ Risk), `MULE / SUSPECT` Verdict.
3. 🟢 **Low-Risk Clean Disbursement**:
   - Test ID: `AIRP10000498` or `BARB10022992`
   - *Result*: Green nodes & edges ($20\%$ Risk), `LEGITIMATE / LOW RISK` Verdict, `Normal / Low Risk Activity` Header.
