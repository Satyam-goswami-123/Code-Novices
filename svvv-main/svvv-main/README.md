# Operation Abhedya-Chakra — Financial Fraud & Money Mule Detection

Full-stack hackathon build for the **Void Hacks() 8.0** problem statement in association with the **Indore Police Commissionerate / 1930 Cyber Cell**.
Investigators ask questions in English or Kannada (text or voice) and the platform traces stolen funds across complex mule networks from a 2-million row banking dataset, featuring interactive transaction graphs, high-velocity anomaly alerts, audit trails, and automated Section 91 CrPC Freeze Notices.

> **Data is 100% synthetic** (generated with Faker + seed=7). Not for real investigations.

---

## Features

### Core (problem-statement spec)
| | Feature | Where |
|---|---|---|
| ✅ | High-throughput 2M+ row ingestion & normalization | `db.py` · `seed.py` |
| ✅ | **Rule-Based Graph Engine** (Deterministic tracing, no AI hallucination) | `analytics.py` |
| ✅ | Interactive Law Enforcement Flow Graph (Mule networks) | `Network` page · vis-network |
| ✅ | Automated Freeze Requisitions (Sec 91 CrPC / BNSS) | `pdf_export.py` · `casefile.py` |
| ✅ | Local AI Case Diary Generator (Summarizes rule-based findings) | `Chat` page · `multi_agent.py` |
| ✅ | Natural-language chatbot (English + Kannada) | `Chat` page · `nl2sql.py` |
| ✅ | Context-aware conversations (per session) | `chat_messages` table |
| ✅ | Explainable AI (Rule-based Graph logic + rationale + data table) | inline in every chat reply |
| ✅ | Role-based access + audit log | `auth.py` · `Audit` page |

### Out-of-the-box differentiators (built for impact)
| | Feature | Where |
|---|---|---|
| 🕵️ | **Hybrid Architecture** — deterministic rule-based algorithms catch the fraud rings; AI simply explains and formats the output | `analytics.py`, `detective.py` |
| 📸 | **Vision Evidence** — upload screenshot of fake payment app → llama-3.2-vision extracts IFSC/Accounts → auto-traces | `Vision` page · `vision.py` |
| 🎬 | **Temporal Flow Playback** — scrubber + play-button replays fund dissipation minute-by-minute across mules | `Temporal` page · `timeline.py` |
| 📋 | **One-click Case-File PDF** — full investigative dossier per account (profile, risk index, txn timeline, associations) | `Network` page → click node · `casefile.py` |
| 🧠 | **Multi-agent investigation pipeline** — Graph-Engine → Data-Formatter → Legal-Synthesizer | `Chat` page · `multi_agent.py` |
| 🔒 | **Tamper-evident audit chain** — SHA-256 chain over every query/freeze notice; `/api/audit/verify` proves integrity | `Audit` page · `audit_chain.py` |
| 🎙️ | **Voice UI** — continuous listening for hands-free queries (Web Speech API) | `Chat` page |
| 🚓 | **Investigation Workflow Optimizer** — ranks the highest-priority "Hub" accounts to freeze first | `Workflow` page · `patrol.py` |
| 🔔 | **Fraud Ring Alerts** — browser Notification API when sudden high-velocity fan-out/fan-in detected | `AlertsToaster` component |
| 🌳 | **Visible chain-of-thought** — multi-agent reply ships expandable trace of every tracing step | `Chat` page |

---

## Quick start (Windows / PowerShell)

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env and paste ONE of: OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY
python -m app.seed
python run.py
```

The first run seeds **2,000,000+ transactions, 5,000 accounts, and 50 layered fraud rings** into `ksp_crime.db` (SQLite/DuckDB). Backend listens on `http://localhost:8000` — docs at `/docs`.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173` (Vite proxies `/api` → backend).

---

## Demo accounts

| Username | Password | Role | What they can do |
|---|---|---|---|
| `admin` | `admin123` | admin | Everything + audit log + user mgmt |
| `investigator` | `investigator123` | investigator | Chat, network graph, temporal flow, alerts, freeze notices |
| `analyst` | `analyst123` | analyst | Same as investigator |
| `viewer` | `viewer123` | viewer | Read-only: chat, network graph, temporal flow |

---

## AI provider

The backend auto-picks the first available key in this order: **OpenAI → Gemini → Anthropic**.
You can override with `LLM_PROVIDER=openai|gemini|anthropic|mock` in `.env`.

Without any key, the app falls back to a deterministic **mock** — the UI still works, but
chat answers will explain that no key is configured.

### Where to paste your 3 keys

Open `backend/.env` and fill any/all of:

```ini
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Architecture

```
┌─────────────┐  HTTPS/JSON   ┌────────────────────────────────┐
│  React UI   │ ────────────► │  FastAPI                       │
│  (Vite)     │ ◄──────────── │  ├─ /api/chat → NL parsing     │
│             │               │  ├─ /api/graph → Rule Engine   │
│  vis-network│               │  ├─ /api/{network,predict}     │
│  recharts   │               │  ├─ /api/audit                 │
│  Web Speech │               │  └─ Sec 91 Freeze Notices      │
└─────────────┘               └────────────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────────────┐
                              │  Rule-Based Analytics Engine   │
                              │  (Deterministic Mule Scoring,  │
                              │  Velocity Tracing, SQL/DuckDB) │
                              └────────────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────────────┐
                              │  LLM provider (auto):          │
                              │  (Summarization & Formatting)  │
                              └────────────────────────────────┘
```

### Hybrid Engine & Safety
- **Detection is strictly Rule-Based:** Finding victims, tracing hops, calculating fan-out, and identifying mules is done via raw, deterministic SQL/Graph algorithms. We do *not* rely on AI for detection.
- **AI is constrained to UI/Formatting:** The AI only parses the natural language input into a function call, and later translates the raw graph output into human-readable Kannada/English and formats the Case Diary.
- Every query, rule trigger, role, and outcome lands in `audit_log` (admin view).
- Each chat reply ships the exact deterministic Graph logic + rationale + raw data to prevent LLM hallucinations.

### Synthetic dataset highlights
- **11 Exact Columns**: `Transaction_ID`, `Sender_Account`, `Receiver_Account`, `Sender_IFSC`, `Receiver_IFSC`, `Amount`, `Timestamp`, `Payment_Mode`, `Narration`, `IP_Address`, `Device_Type`.
- **2,000,000+ Transactions** spanning a 15-day high-density window.
- **50 Fraud Rings** featuring Collector Mules (L1), Distributor Mules (L2), and Cash-Out Nodes (L3).
- **Anomalies Injected**: Foreign IP proxy headers (`185.x.x.x`) and headless script user agents (`Linux_Script`).

---

## File map

```text
backend/
  app/
    main.py        ← FastAPI app + routes
    auth.py        ← JWT, bcrypt, RBAC
    db.py          ← SQLite schema + connection (11-column flat tables)
    seed.py        ← 2,000,000 row synthetic data generator
    llm.py         ← provider-agnostic LLM client
    nl2sql.py      ← NL → Graph/SQL safety pipeline
    analytics.py   ← temporal flow, network topology, mule scoring
    pdf_export.py  ← Sec 91 CrPC reportlab PDF builder
    config.py      ← env settings
  run.py           ← seeds + uvicorn
  requirements.txt
  .env.example

frontend/
  src/
    pages/
      Login.jsx, Dashboard.jsx, Chat.jsx,
      Temporal.jsx, Trends.jsx, Network.jsx,
      Predict.jsx, Workflow.jsx, Audit.jsx
    App.jsx, main.jsx, api.js, styles.css
  package.json, vite.config.js, index.html
```

---

## Try these queries (in the chat)

**English**
- *"Trace the funds from victim account 5432112345 to the final cash-out nodes."*
- *"Identify all Layer 1 collector mules that received more than ₹50,000 today."*
- *"Show me all transactions involving foreign IP addresses or Linux script emulators."*
- *"Generate a Section 91 freeze notice for all accounts linked to transaction TXN20240510."*

---

## License / disclaimer

Built for Void Hacks() 8.0. Data is **synthetic**. Do not use the codebase or the dataset as operational input for real law enforcement decisions without adapting to real CCTNS/1930 data.
