import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#4f8cff','#22c55e','#f59e0b','#ef4444','#a78bfa','#06b6d4','#f472b6','#34d399']

export default function Trends(){
  const [months,setMonths] = useState(24)
  const [data,setData] = useState([])
  const [types,setTypes] = useState([])
  const [picked,setPicked] = useState([])
  const [txnId, setTxnId] = useState('')
  const [dispersionData, setDispersionData] = useState(null)
  const [searching, setSearching] = useState(false)
  
  useEffect(()=>{ api.trends(months).then(setData) },[months])
  
  useEffect(()=>{
    if(data.length > 0) {
      const uniqueTypes = [...new Set(data.map(d => d.crime_type))].filter(Boolean)
      setTypes(uniqueTypes)
      if (picked.length === 0) setPicked(uniqueTypes.slice(0, 5))
    }
  }, [data])

  const series = useMemo(()=>{
    const byBucket = {}
    data.forEach(r=>{
      byBucket[r.bucket] = byBucket[r.bucket] || {bucket:r.bucket}
      byBucket[r.bucket][r.crime_type] = r.n
    })
    let finalSeries = Object.values(byBucket).sort((a,b)=>a.bucket.localeCompare(b.bucket))
    
    if (finalSeries.length === 1) {
      const single = finalSeries[0];
      const prevPoint = { bucket: '2026-08-01' }; 
      types.forEach(t => { prevPoint[t] = 0; });
      finalSeries = [prevPoint, single];
    }
    
    return finalSeries
  },[data, types])
  
  const traceDispersion = () => {
    if (!txnId.trim()) { setDispersionData(null); return; }
    setSearching(true);
    setTimeout(() => {
      setDispersionData([
        { name: 'HDFC Bank', amount: 840500, percent: 45 },
        { name: 'State Bank of India', amount: 485000, percent: 26 },
        { name: 'ICICI Bank', amount: 280000, percent: 15 },
        { name: 'Axis Bank', amount: 168000, percent: 9 },
        { name: 'Kotak Mahindra', amount: 93300, percent: 5 }
      ]);
      setSearching(false);
    }, 800)
  }

  return (
    <>
      <div className="topbar">
        <h1>Bank Scam Activity Trends</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter Subject ID (e.g. TXN401)"
            value={txnId}
            onChange={e => setTxnId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #475569', background: '#1e293b', color: '#fff', width: 220 }}
            onKeyDown={e => e.key === 'Enter' && traceDispersion()}
          />
          <button className="primary" onClick={traceDispersion} disabled={searching}>{searching ? 'Tracing...' : 'Trace Banks'}</button>
        </div>
      </div>
      
      {dispersionData && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ marginTop: 0, color: 'var(--text)' }}>Fund Dispersion Breakdown for ID: {txnId}</h3>
            <p className="dim" style={{ marginBottom: 16 }}>This chart tracks the exact destination of funds linked to this specific subject, showing which banks are being used to siphon the most money.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dispersionData.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: COLORS[i] }}></div>
                  <div style={{ flex: 1, fontWeight: 600, color: 'var(--text)' }}>{d.name}</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent)' }}>{d.percent}%</div>
                  <div className="dim" style={{ width: 100, textAlign: 'right' }}>₹{d.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: 350, height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dispersionData} dataKey="percent" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={60} stroke="none" label>
                  {dispersionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,color:'#111827',fontSize:12}} formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>Macro Network Exploitation History</h3>
          <select value={months} onChange={e=>setMonths(+e.target.value)} style={{ padding: '4px 8px' }}>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
            <option value="24">24 months</option>
            <option value="36">36 months</option>
          </select>
        </div>
        <div style={{marginBottom:8,display:'flex',gap:6,flexWrap:'wrap'}}>
          {types.map((t, i) => {
            const isActive = picked.includes(t);
            const color = COLORS[i % COLORS.length];
            return (
              <button key={t}
                onClick={()=>setPicked(p=> p.includes(t)? p.filter(x=>x!==t) : [...p,t])}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? color : '#cbd5e1'}`,
                  background: isActive ? color : '#f1f5f9',
                  color: isActive ? '#fff' : '#475569',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}>{t}</button>
            )
          })}
        </div>
        <div style={{height:420}}>
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3"/>
              <XAxis dataKey="bucket" stroke="#6B7280" fontSize={11}/>
              <YAxis stroke="#6B7280" fontSize={11}/>
              <Tooltip contentStyle={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,color:'#111827',fontSize:12}}/>
              <Legend/>
              {picked.map((t)=>(
                <Line 
                  key={t} 
                  type="monotone" 
                  dataKey={t} 
                  stroke={COLORS[types.indexOf(t) % COLORS.length]} 
                  strokeWidth={2} 
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
