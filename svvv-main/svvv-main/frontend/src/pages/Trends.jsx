import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#4f8cff','#22c55e','#f59e0b','#ef4444','#a78bfa','#06b6d4','#f472b6','#34d399']

export default function Trends(){
  const [months,setMonths] = useState(24)
  const [data,setData] = useState([])
  const [types,setTypes] = useState([])
  const [picked,setPicked] = useState([])
  
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
  return (
    <>
      <div className="topbar">
        <h1>Bank Scam Activity Trends</h1>
        <select value={months} onChange={e=>setMonths(+e.target.value)}>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
          <option value="24">24 months</option>
          <option value="36">36 months</option>
        </select>
      </div>
      <div className="card">
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
