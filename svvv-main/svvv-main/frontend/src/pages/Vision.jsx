import React, { useRef, useState } from 'react'
import { api } from '../api'

export default function Vision(){
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const analyze = async () => {
    const f = fileRef.current?.files?.[0]
    if(!f){ alert('Pick a CSV file first'); return }
    setBusy(true)
    
    try {
      const res = await api.ingest(f)
      setResult({
        success: true,
        filename: f.name,
        size: (f.size / (1024*1024)).toFixed(2),
        rows_indexed: res.rows_indexed,
        ingest_time: res.ingest_time,
      })
    } catch (e) {
      alert("Ingestion failed: " + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>📊 High-Throughput Data Ingestion</h1>
        <span className="pill ok">DuckDB / SQLite Engine</span>
      </div>

      <div className="card">
        <p className="dim" style={{marginTop:0}}>
          Upload a raw multi-bank transaction export (e.g., <b>VoidHacks8_MuleAccount_2M_Transactions.csv</b>). 
          The backend engine will instantly parse, normalize, and index the millions of rows into the 
          Rule-Based Graph database, automatically mapping IFCS codes, IPs, and Mule topologies.
        </p>
        <input ref={fileRef} type="file" accept=".csv" />
        <button className="primary" style={{marginLeft:8}} onClick={analyze} disabled={busy}>
          {busy ? 'Indexing Data (Please Wait)...' : '⚙️ Upload & Index CSV'}
        </button>
      </div>

      {busy && (
        <div className="card" style={{textAlign: 'center', padding: 40}}>
          <h3>Streaming into Graph Engine...</h3>
          <div className="dim">Parsing entities, calculating degree centrality, and evaluating L1/L2 Mule Risks.</div>
          <div style={{marginTop: 20, width: '100%', height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden'}}>
            <div style={{width: '50%', height: '100%', background: 'var(--accent)', animation: 'pulse 1s infinite alternate'}} />
          </div>
        </div>
      )}

      {result?.success && (
        <div className="card" style={{border: '1px solid #10b981', background: '#ecfdf5'}}>
          <h3 style={{marginTop:0, color: '#065f46'}}>✅ Ingestion Complete</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, color: '#064e3b'}}>
            <div>
              <div className="dim" style={{color: '#047857'}}>Filename</div>
              <div style={{fontWeight: 600}}>{result.filename}</div>
            </div>
            <div>
              <div className="dim" style={{color: '#047857'}}>File Size</div>
              <div style={{fontWeight: 600}}>{result.size} MB</div>
            </div>
            <div>
              <div className="dim" style={{color: '#047857'}}>Total Rows Indexed</div>
              <div style={{fontWeight: 600, fontSize: 18}}>{result.rows_indexed.toLocaleString()}</div>
            </div>
            <div>
              <div className="dim" style={{color: '#047857'}}>Ingestion Speed</div>
              <div style={{fontWeight: 600}}>{result.ingest_time}</div>
            </div>
          </div>
          <div style={{marginTop: 16, paddingTop: 16, borderTop: '1px solid #a7f3d0'}}>
            <p style={{margin: 0, fontSize: 13, color: '#047857'}}>
              The data has been successfully mapped to the Graph Engine. 
              You can now navigate to the <b>Money Mule Network</b> tab to trace transactions, 
              or the <b>Conversational AI</b> tab to query the dataset.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
