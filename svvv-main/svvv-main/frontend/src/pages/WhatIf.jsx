import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'

export default function WhatIf(){
  const [districts,setDistricts] = useState([])
  const [districtId,setDistrictId] = useState('')
  const [officers,setOfficers] = useState(20)
  const [cctv,setCctv] = useState(30)
  const [community,setCommunity] = useState(15)
  const [months,setMonths] = useState(12)
  const [result,setResult] = useState(null)
  const [busy,setBusy] = useState(false)
  useEffect(()=>{ api.districts().then(setDistricts) },[])

  const run = async () => {
    setBusy(true)
    try {
      setResult(await api.whatif({
        district_id: districtId? +districtId : null,
        officers_pct: officers, cctv_pct: cctv, community_pct: community, months
      }))
    } finally { setBusy(false) }
  }
  useEffect(()=>{ run() /* initial */ }, [])

  const top = result?.by_type?.slice(0, 8) || []

  return (
    <>
      <div className="topbar">
        <h1>🎚️ What-If Scenario Simulator</h1>
        <span className="pill warn">Linear elasticity model · transparent &amp; auditable</span>
      </div>

      <div className="card">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
          <div>
            <label>👮 Additional officers: <b>+{officers}%</b></label>
            <input type="range" min={0} max={100} value={officers} onChange={e=>setOfficers(+e.target.value)} style={{width:'100%'}}/>
          </div>
          <div>
            <label>📷 CCTV coverage: <b>+{cctv}%</b></label>
            <input type="range" min={0} max={100} value={cctv} onChange={e=>setCctv(+e.target.value)} style={{width:'100%'}}/>
          </div>
          <div>
            <label>🤝 Community programs: <b>+{community}%</b></label>
            <input type="range" min={0} max={100} value={community} onChange={e=>setCommunity(+e.target.value)} style={{width:'100%'}}/>
          </div>
        </div>
        <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}>
          <select value={districtId} onChange={e=>setDistrictId(e.target.value)}>
            <option value="">All Voidhack</option>
            {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <label className="dim">window
            <select value={months} onChange={e=>setMonths(+e.target.value)} style={{marginLeft:6}}>
              <option value={3}>3 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
          </label>
          <button className="primary" onClick={run} disabled={busy}>{busy?'Simulating…':'▶ Run simulation'}</button>
        </div>
      </div>

      {result && (
        <>
          <div className="kpis">
            <div className="kpi"><div className="l">Baseline crimes</div><div className="v">{result.baseline_total}</div></div>
            <div className="kpi"><div className="l">Projected</div><div className="v" style={{color:'#86efac'}}>{result.projected_total}</div></div>
            <div className="kpi"><div className="l">Expected prevented</div><div className="v" style={{color:'#86efac'}}>{result.expected_prevented}</div></div>
            <div className="kpi"><div className="l">% change</div><div className="v" style={{color:'#86efac'}}>{result.expected_pct_change}%</div></div>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Impact by crime type</h3>
            <div style={{height:340}}>
              <ResponsiveContainer>
                <BarChart data={top}>
                  <CartesianGrid stroke="#243456" strokeDasharray="3 3"/>
                  <XAxis dataKey="crime_type" stroke="#8da0c7" fontSize={11} angle={-15} textAnchor="end" height={70}/>
                  <YAxis stroke="#8da0c7" fontSize={11}/>
                  <Tooltip contentStyle={{background:'#162238',border:'1px solid #243456'}}/>
                  <Bar dataKey="baseline" fill="#4f8cff" name="Baseline"/>
                  <Bar dataKey="projected" fill="#22c55e" name="Projected"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="dim" style={{marginTop:8}}>{result.model_note}</div>
          </div>
        </>
      )}
    </>
  )
}
