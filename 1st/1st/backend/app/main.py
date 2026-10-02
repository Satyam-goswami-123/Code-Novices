from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional, List
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .models import TraceRequest, TraceResponse
from .db import init_db, get_db_connection
from .tracer import trace_transactions, search_accounts, get_sample_accounts, get_diagnostic_sample_accounts

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Forensic Transaction Tracing Engine...")
    init_db()
    yield
    print("Shutting down database connection...")

app = FastAPI(
    title="Forensic Transaction Tracing API",
    description="High-performance banking transaction chain tracer with 15-minute hop window matching",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    con = get_db_connection()
    count = con.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    return {
        "status": "healthy",
        "dataset_rows": count,
        "engine": "FastAPI + DuckDB"
    }

@app.post("/api/trace", response_model=TraceResponse)
def api_trace(request: TraceRequest):
    if not request.account_number or len(request.account_number.strip()) == 0:
        raise HTTPException(status_code=400, detail="Account number is required")
    
    try:
        response = trace_transactions(
            account_number=request.account_number,
            max_hops=request.max_hops or 25
        )
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/diagnostics/sample-accounts")
def api_diagnostics_sample_accounts():
    try:
        return get_diagnostic_sample_accounts()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search-accounts")
def api_search_accounts(q: str = Query(..., min_length=2), limit: int = 10):
    try:
        return search_accounts(query=q, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sample-accounts")
def api_sample_accounts(limit: int = 8):
    try:
        return get_sample_accounts(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount built frontend static files if dist folder exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
