import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#4f8cff','#22c55e','#f59e0b','#ef4444','#a78bfa','#06b6d4','#f472b6','#34d399']

export default function Trends(){
  const [months,setMonths] = useState(24)
  const [data,setData] = useState([])
  const [types,setTypes] = useState([])
  const [picked,setPicked] = useState([])
  useEffect(()=>{
    api.crimeTypes().then(t=>{ setTypes(t); setPicked(t.slice(0,5)) })
  },[])
  useEffect(()=>{ api.trends(months).then(setData) },[months])
  const series = useMemo(()=>{
    const byBucket = {}
    data.forEach(r=>{
      byBucket[r.bucket] = byBucket[r.bucket] || {bucket:r.bucket}
      byBucket[r.bucket][r.crime_type] = r.n
    })
    return Object.values(byBucket).sort((a,b)=>a.bucket.localeCompare(b.bucket))
  },[data])
  return (
    <>
      <div className="topbar">
        <h1>Crime Trends</h1>
        <select value={months} onChange={e=>setMonths(+e.target.value)}>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
          <option value="24">24 months</option>
          <option value="36">36 months</option>
        </select>
      </div>
      <div className="card">
        <div style={{marginBottom:8,display:'flex',gap:6,flexWrap:'wrap'}}>
          {types.map(t=>(
            <button key={t}
              onClick={()=>setPicked(p=> p.includes(t)? p.filter(x=>x!==t) : [...p,t])}
              style={{background: picked.includes(t) ? 'var(--accent)' : 'var(--panel2)', color: picked.includes(t) ? '#fff' : 'var(--text)'}}>{t}</button>
          ))}
        </div>
        <div style={{height:420}}>
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3"/>
              <XAxis dataKey="bucket" stroke="#6B7280" fontSize={11}/>
              <YAxis stroke="#6B7280" fontSize={11}/>
              <Tooltip contentStyle={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,color:'#111827',fontSize:12}}/>
              <Legend/>
              {picked.map((t,i)=>(
                <Line key={t} type="monotone" dataKey={t} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
