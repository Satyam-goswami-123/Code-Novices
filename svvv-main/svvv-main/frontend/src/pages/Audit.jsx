import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function Audit(){
  const [rows,setRows] = useState([])
  const [verify,setVerify] = useState(null)
  const load = () => {
    api.audit().then(setRows).catch(()=>{})
    api.auditVerify().then(setVerify).catch(()=>{})
  }
  useEffect(load,[])

  return (
    <>
      <div className="topbar">
        <h1>🔒 Audit Log — Tamper-evident chain</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {verify && (
        <div className={`card`} style={{borderLeft:`3px solid ${verify.ok?'#22c55e':'#ef4444'}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <h3 style={{margin:0}}>
                Chain integrity:&nbsp;
                <span style={{color: verify.ok ? '#86efac' : '#fca5a5'}}>
                  {verify.ok ? '✓ INTACT' : '✗ TAMPERED'}
                </span>
              </h3>
              <div className="dim" style={{fontSize:12,marginTop:6}}>
                Verified {verify.verified_rows} entries · last hash <code>{verify.last_hash}</code>
              </div>
            </div>
            <div className="dim" style={{maxWidth:380,fontSize:12,textAlign:'right'}}>
              Each row hashed as SHA-256(prev_hash || row_data). Any edit breaks the chain.
            </div>
          </div>
          {!verify.ok && verify.tampered?.length>0 && (
            <div style={{marginTop:10,padding:10,background:'#3b1414',borderRadius:6,fontSize:12}}>
              <b>Tampered at id={verify.tampered[0].id}</b><br/>
              expected <code>{verify.tampered[0].expected}</code><br/>
              stored&nbsp;&nbsp;&nbsp;<code>{verify.tampered[0].stored}</code>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{padding:0,overflow:'auto',maxHeight:'calc(100vh - 280px)'}}>
        <table className="data">
          <thead><tr><th>ID</th><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Provider</th><th>OK</th><th>NL</th><th>SQL</th><th>Hash</th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.id}</td>
                <td className="dim">{r.ts}</td>
                <td>{r.username}</td>
                <td><span className="badge">{r.role}</span></td>
                <td>{r.action}</td>
                <td>{r.provider}</td>
                <td>{r.success?'✓':'✗'}</td>
                <td style={{maxWidth:200,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.nl_query}</td>
                <td style={{fontFamily:'monospace',fontSize:11,maxWidth:240,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.sql_used}</td>
                <td style={{fontFamily:'monospace',fontSize:10,color:'#86efac'}}>{(r.row_hash||'').slice(0,12)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
