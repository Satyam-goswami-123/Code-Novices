import React, { useRef, useState } from 'react'
import { api } from '../api'

export default function Vision(){
  const fileRef = useRef(null)
  const [preview,setPreview] = useState(null)
  const [busy,setBusy] = useState(false)
  const [result,setResult] = useState(null)

  const onFile = e => {
    const f = e.target.files[0]
    if(!f) return
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }
  const analyze = async () => {
    const f = fileRef.current?.files?.[0]
    if(!f){ alert('Pick an image first'); return }
    setBusy(true)
    try { setResult(await api.vision(f)) }
    catch(e){ setResult({error: e.message}) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="topbar">
        <h1>📸 Vision Evidence Analysis</h1>
        <span className="pill warn">OpenRouter · llama-3.2-vision</span>
      </div>

      <div className="card">
        <p className="dim" style={{marginTop:0}}>
          Upload a CCTV still, crime-scene photo, or evidence image. The vision model extracts
          weapons, vehicles, persons, and location clues, then searches the FIR database for
          matching past incidents.
        </p>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile}/>
        <button className="primary" style={{marginLeft:8}} onClick={analyze} disabled={busy}>
          {busy?'Analyzing…':'🔍 Analyze image'}
        </button>
      </div>

      {preview && (
        <div className="row">
          <div className="card col">
            <h3 style={{marginTop:0}}>Evidence</h3>
            <img src={preview} alt="evidence" style={{maxWidth:'100%',borderRadius:8,border:'1px solid var(--line)'}}/>
          </div>
          <div className="card col">
            <h3 style={{marginTop:0}}>Extracted entities</h3>
            {!result && <div className="dim">Click analyze to extract.</div>}
            {result?.error && <div className="alert">{result.error}</div>}
            {result?.extracted && (
              <div>
                <div style={{marginBottom:8}}><b>Scene:</b> {result.extracted.scene_summary}</div>
                <div className="dim" style={{marginBottom:8}}>Confidence: <span className="badge">{result.extracted.confidence}</span></div>
                {result.extracted.weapons?.length>0 && <div><b>🔫 Weapons:</b> {result.extracted.weapons.join(', ')}</div>}
                {result.extracted.vehicles?.length>0 && (
                  <div><b>🚗 Vehicles:</b>
                    <ul style={{margin:'4px 0 8px 18px'}}>
                      {result.extracted.vehicles.map((v,i)=><li key={i}>
                        {v.type} {v.color && `(${v.color})`} {v.plate && ` plate:${v.plate}`}
                      </li>)}
                    </ul>
                  </div>
                )}
                {result.extracted.persons?.length>0 && (
                  <div><b>👥 Persons:</b>
                    <ul style={{margin:'4px 0 8px 18px'}}>
                      {result.extracted.persons.map((p,i)=><li key={i}>{p.description} (×{p.count})</li>)}
                    </ul>
                  </div>
                )}
                {result.extracted.location_clues?.length>0 && (
                  <div><b>📍 Location clues:</b> {result.extracted.location_clues.join('; ')}</div>
                )}
                {result.extracted.suspected_crime_categories?.length>0 && (
                  <div style={{marginTop:6}}><b>Likely crime:</b> {result.extracted.suspected_crime_categories.map(c=><span key={c} className="badge" style={{marginRight:4}}>{c}</span>)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {result?.matches?.length > 0 && (
        <div className="card">
          <h3 style={{marginTop:0}}>🎯 Matching FIRs ({result.matches.length})</h3>
          <div className="dim" style={{marginBottom:8}}>Search query: <i>{result.query}</i></div>
          {result.matches.map(m=>(
            <div key={m.id} style={{padding:10,border:'1px solid var(--line)',borderRadius:8,marginBottom:8,background:'var(--panel2)'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <b>{m.fir_number}</b>
                <span className="badge">{(m.similarity*100).toFixed(0)}% match</span>
              </div>
              <div className="dim" style={{fontSize:12}}>{m.crime_type} · {m.district} · {m.station} · {m.occurred_at?.slice(0,10)}</div>
              <div style={{fontSize:13,marginTop:4}}>{m.description}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
