import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function Predict(){
  const [alerts,setAlerts] = useState([])
  const [busy,setBusy] = useState(true)
  useEffect(()=>{ api.predict().then(setAlerts).finally(()=>setBusy(false)) },[])
  return (
    <>
      <div className="topbar">
        <h1>Predictive Early-Warning Alerts</h1>
        <span className="pill warn">model: quarterly uplift vs 12mo baseline</span>
      </div>
      {busy && <div className="dim">Computing…</div>}
      {!busy && alerts.length===0 && <div className="card">No significant risk uplifts detected.</div>}
      <div className="card" style={{padding:0}}>
        <table className="data">
          <thead><tr><th>District</th><th>Crime type</th><th>Recent qtr</th><th>Baseline</th><th>Uplift</th><th>Rationale</th></tr></thead>
          <tbody>
            {alerts.map((a,i)=>(
              <tr key={i}>
                <td><b>{a.district}</b></td>
                <td>{a.crime_type}</td>
                <td>{a.recent_quarter}</td>
                <td>{a.avg_prior_quarter}</td>
                <td><span className="badge" style={{color:'#fca5a5',borderColor:'#7f1d1d'}}>+{a.uplift_pct}%</span></td>
                <td className="dim">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
