import React, { useEffect, useState } from 'react'
import { api, downloadAuthed } from '../api'
import { Search } from 'lucide-react';


const EXAMPLES = [
  "Two armed men on a motorcycle robbed a jewellery shop in Bengaluru Urban around midnight and fled south on the highway.",
  "A college student was found dead in his hostel room in Mysuru. Signs of strangulation and missing laptop.",
  "Multiple businessmen received phishing emails impersonating their bank; lost over ₹15 lakh through cyber transfer in Mangaluru.",
  "Three young men broke into a closed pharmacy in Hubballi at 2am and stole prescription drugs.",
]

export default function Detective(){
  const [narrative,setNarrative] = useState(EXAMPLES[0])
  const [crimeType,setCrimeType] = useState('')
  const [districts,setDistricts] = useState([])
  const [districtId,setDistrictId] = useState('')
  const [types,setTypes] = useState([])
  const [busy,setBusy] = useState(false)
  const [result,setResult] = useState(null)
  useEffect(()=>{ api.crimeTypes().then(setTypes); api.districts().then(setDistricts) },[])

  const run = async () => {
    setBusy(true); setResult(null)
    try { setResult(await api.detective(narrative, crimeType||undefined, districtId? +districtId : undefined)) }
    catch(e){ setResult({error:e.message}) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div className="topbar">
        <h1><Search size={24} style={{marginRight:8}} /> AI Detective</h1>
        <span className="pill warn">Semantic FIR search · Co-accused graph · MO synthesis</span>
      </div>

      <div className="card">
        <h3 style={{marginTop:0}}>New crime narrative</h3>
        <textarea value={narrative} onChange={e=>setNarrative(e.target.value)}
          rows={4} style={{width:'100%',resize:'vertical'}}/>
        <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
          {EXAMPLES.map((ex,i)=>(<button key={i} onClick={()=>setNarrative(ex)}
            style={{fontSize:11}}>Example {i+1}</button>))}
        </div>
        <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <select value={crimeType} onChange={e=>setCrimeType(e.target.value)}>
            <option value="">(any crime type filter)</option>
            {types.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select value={districtId} onChange={e=>setDistrictId(e.target.value)}>
            <option value="">(any district filter)</option>
            {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="primary" disabled={busy} onClick={run}>
            {busy?'Investigating…':'🔍 Investigate'}
          </button>
        </div>
      </div>

      {result && result.error && <div className="alert">{result.error}</div>}

      {result && !result.error && (
        <>
          <div className="card">
            <h3 style={{marginTop:0}}>🎯 MO Signature</h3>
            <div style={{fontSize:15,marginBottom:8}}><b>{result.mo?.mo_signature || '—'}</b></div>
            <div className="dim" style={{marginBottom:4}}>Confidence: <span className="badge">{result.mo?.confidence||'?'}</span></div>
            {result.mo?.common_traits && (
              <div style={{marginTop:8}}><b>Common traits:</b>
                <ul style={{margin:'4px 0 0 18px'}}>
                  {result.mo.common_traits.map((t,i)=><li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
            {result.mo?.recommended_lines_of_inquiry && (
              <div style={{marginTop:8}}><b>Recommended lines of inquiry:</b>
                <ul style={{margin:'4px 0 0 18px'}}>
                  {result.mo.recommended_lines_of_inquiry.map((t,i)=><li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="row">
            <div className="card col">
              <h3 style={{marginTop:0}}>🔁 Similar past cases ({result.similar_cases.length})</h3>
              <div style={{maxHeight:520,overflow:'auto'}}>
                {result.similar_cases.map(c=>(
                  <div key={c.id} style={{padding:10,border:'1px solid var(--line)',borderRadius:8,marginBottom:8,background:'var(--panel2)'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <b>{c.fir_number}</b>
                      <span className="badge">{(c.similarity*100).toFixed(0)}% match</span>
                    </div>
                    <div style={{fontSize:13,color:'var(--muted)'}}>
                      {c.crime_type} · {c.district} · {c.station} · sev {c.severity}
                    </div>
                    <div style={{fontSize:13,marginTop:6}}>{c.description}</div>
                    <div className="dim" style={{fontSize:11,marginTop:4}}>
                      weapon: {c.weapon_used} | motive: {c.motive} | occurred {c.occurred_at?.slice(0,16)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card col">
              <h3 style={{marginTop:0}}>👤 Ranked suspects ({result.suspects.length})</h3>
              <div style={{maxHeight:520,overflow:'auto'}}>
                {result.suspects.map(s=>(
                  <div key={s.id} style={{padding:10,border:'1px solid var(--line)',borderRadius:8,marginBottom:8,background:'var(--panel2)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <b>#{s.id} — {s.full_name}</b>
                      <span className="badge" style={{color:'#fca5a5',borderColor:'#7f1d1d'}}>
                        risk {s.risk_score}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>
                      age {s.age} · {s.gender} · {s.occupation} · {s.district}
                    </div>
                    <div style={{fontSize:13,marginTop:6}}>{s.reasoning}</div>
                    <div style={{marginTop:8,display:'flex',gap:6}}>
                      <button onClick={()=>downloadAuthed(api.caseFileUrl(s.id), `case_file_${s.id}.pdf`)}>
                        📋 Case file PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
