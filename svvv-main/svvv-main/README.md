# KSP SCRB — Intelligent Conversational AI

Full-stack hackathon build for the **Karnataka State Crime Records Bureau** problem statement.
Investigators ask questions in English or Kannada (text or voice) and the platform answers
from a synthetic crime database, with hotspot maps, criminal networks, trends, predictive
alerts, audit trails, and PDF export.

> **Data is 100% synthetic** (generated with Faker + seed=7). Not for real investigations.

---

## Features

### Core (problem-statement spec)
| | Feature | Where |
|---|---|---|
| ✅ | Natural-language chatbot (English + Kannada) | `Chat` page · `nl2sql.py` |
| ✅ | Voice in/out (Web Speech API + TTS) | `Chat`, `Patrol` pages |
| ✅ | Context-aware conversations (per session) | `chat_messages` table |
| ✅ | PDF export with FIR citations | `pdf_export.py` |
| ✅ | Criminal network graph (co-accused) | `Network` page · vis-network |
| ✅ | Crime trends & hotspot detection | `Trends`, `Hotspots` |
| ✅ | Predictive early-warning alerts | `Predict` · uplift model |
| ✅ | Explainable AI (SQL + rationale + data table) | inline in every chat reply |
| ✅ | Role-based access + audit log | `auth.py` · `Audit` page |

### Out-of-the-box differentiators (built for impact)
| | Feature | Where |
|---|---|---|
| 🕵️ | **AI Detective** — narrative → TF-IDF semantic search of all FIRs → ranked suspects from co-accused graph + MO synthesis | `Detective` page · `detective.py`, `semantic.py` |
| 📸 | **Vision Evidence** — upload CCTV/scene image → llama-3.2-vision extracts entities → auto-searches DB | `Vision` page · `vision.py` |
| 🎬 | **Time-Machine Hotspot Map** — scrubber + play-button replays crime spread month-by-month | `Hotspots` page · `timeline.py` |
| 📋 | **One-click Case-File PDF** — full 6-section investigative dossier per Person of Interest (profile, AI risk score, timeline, FIR citations, associates, similar offenders) | `Network` page → click node · `casefile.py` |
| 🧠 | **Multi-agent investigation pipeline** — Researcher → SQL-Executor → Network-Analyst → Predictor → Synthesizer, with visible reasoning trace | `Chat` page · `multi_agent.py` |
| 🔒 | **Tamper-evident audit chain** — SHA-256 chain over every audit row; `/api/audit/verify` proves integrity | `Audit` page · `audit_chain.py` |
| 🎙️ | **Hands-free "Hey KSP" patrol mode** — continuous wake-word listening, full Kannada conversation, hands on the wheel | `Patrol` page |
| 🚓 | **Predictive patrol-route optimizer** — nearest-neighbor TSP through predicted hotspots, opens in Google Maps | `PatrolRoute` page · `patrol.py` |
| 🎚️ | **What-If scenario simulator** — sliders for officers / CCTV / community programs → projected crime impact by category | `WhatIf` page · `whatif.py` |
| 🔔 | **Live anomaly notifications** — browser Notification API + audio beep when new risk uplifts detected | `AlertsToaster` component |
| 🗺️ | **Karnataka district choropleth** — Voronoi-tessellated districts coloured by intensity | `Dashboard` · `geo.py` |
| 🌳 | **Visible chain-of-thought** — multi-agent reply ships expandable trace of every agent step | `Chat` page |
| 🪪 | **Citation graph** — every PDF appends a referenced-FIR table with date/district/status | `pdf_export.py` |

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
python run.py
```

The first run seeds **~6,000 FIRs, 1,500 persons, 120 stations across 15 Karnataka districts**
into `ksp_crime.db` (SQLite). Backend listens on `http://localhost:8000` — docs at `/docs`.

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
| `inspector` | `inspector123` | investigator | Chat, network, hotspots, trends, predict, export |
| `analyst` | `analyst123` | analyst | Same as investigator |
| `viewer` | `viewer123` | viewer | Read-only: chat, hotspots, trends, export |

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
┌─────────────┐  HTTPS/JSON   ┌────────────────────────────┐
│  React UI   │ ────────────► │  FastAPI                   │
│  (Vite)     │ ◄──────────── │  ├─ /api/auth (JWT, RBAC)  │
│  Leaflet    │               │  ├─ /api/chat → NL→SQL     │
│  vis-network│               │  ├─ /api/{trends,hotspots, │
│  recharts   │               │  │     network,predict}    │
│  Web Speech │               │  ├─ /api/audit             │
└─────────────┘               │  └─ PDF export             │
                              │           │                │
                              │           ▼                │
                              │    SQLite (synthetic)      │
                              └────────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────────┐
                              │  LLM provider (auto):      │
                              │  OpenAI / Gemini / Claude  │
                              └────────────────────────────┘
```

### NL → SQL safety
- Model is constrained to a single `SELECT` (regex-rejects INSERT/UPDATE/DELETE/DROP/PRAGMA/ATTACH/semicolons).
- Every query, SQL, provider, role, and outcome lands in `audit_log` (admin view).
- Each chat reply ships the SQL + rationale + first 10 rows for explainability.

### Synthetic dataset highlights
- 15 districts × 8 stations = **120 police stations**
- ~**6,000 FIRs** spanning Jan 2022 – Jun 2026
- ~**1,500 persons** with realistic Indian names, occupation, education, district
- ~**18 crime categories** with IPC sections
- Repeat-offender bias → meaningful **co-accused networks**
- Hotspot bias to 4 districts → maps look realistic
- Recent 3-month uplift → **predictive alerts** trigger naturally

---

## File map

```
backend/
  app/
    main.py        ← FastAPI app + routes
    auth.py        ← JWT, bcrypt, RBAC
    db.py          ← SQLite schema + connection
    seed.py        ← synthetic data generator
    llm.py         ← provider-agnostic LLM client
    nl2sql.py      ← NL → SQL safety pipeline
    analytics.py   ← trends, hotspots, network, predict
    pdf_export.py  ← reportlab PDF builder
    config.py      ← env settings
  run.py           ← seeds + uvicorn
  requirements.txt
  .env.example

frontend/
  src/
    pages/
      Login.jsx, Dashboard.jsx, Chat.jsx,
      Hotspots.jsx, Trends.jsx, Network.jsx,
      Predict.jsx, Audit.jsx
    App.jsx, main.jsx, api.js, styles.css
  package.json, vite.config.js, index.html
```

---

## Try these queries (in the chat)

**English**
- *"Top 5 districts by murder count in the last 12 months"*
- *"Show all FIRs involving cybercrime where the accused is under 25"*
- *"Which weapon was most common in robberies in Bengaluru Urban?"*
- *"List repeat offenders with 5 or more FIRs"*

**Kannada**
- *"ಬೆಂಗಳೂರು ನಗರದಲ್ಲಿ ಕಳೆದ 6 ತಿಂಗಳ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು ಎಷ್ಟು?"*
- *"ಮೈಸೂರಿನಲ್ಲಿ ಯಾವ ಠಾಣೆಯಲ್ಲಿ ಅತಿ ಹೆಚ್ಚು ಪ್ರಕರಣಗಳು?"*

---

## License / disclaimer

Built for a hackathon. Data is **synthetic**. Do not use the codebase or the dataset as
operational input for real policing decisions.
