import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet'
import { api } from '../api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, LineChart, Line } from 'recharts'
import { LayoutDashboard, MapPinned } from 'lucide-react'

function colorFor(intensity){
  if(intensity > 0.8) return '#7f1d1d'
  if(intensity > 0.6) return '#b91c1c'
  if(intensity > 0.4) return '#ef4444'
  if(intensity > 0.2) return '#f59e0b'
  if(intensity > 0.05) return '#fcd34d'
  return '#22c55e'
}

const CHART_TOOLTIP = { background:'#fff', border:'1px solid #E5E7EB', borderRadius: 8, color:'#111827', fontSize: 12 }

export default function Dashboard(){
  const [stats,setStats] = useState(null)
  const [trends,setTrends] = useState([])
  const [alerts,setAlerts] = useState([])
  const [geo,setGeo] = useState(null)
  const [intensity,setIntensity] = useState([])

  useEffect(()=>{
    api.stats().then(setStats)
    api.trends(12).then(setTrends).catch(()=>{})
    api.predict().then(setAlerts).catch(()=>{})
    api.districtIntensity(12).then(setIntensity).catch(()=>{})
    api.districts && fetch('/api/meta/districts/geojson', {headers:{Authorization:`Bearer ${localStorage.getItem('abhedya_token')}`}})
      .then(r=>r.json()).then(setGeo).catch(()=>{})
  },[])

  const byMonth = {}
  trends.forEach(r => { byMonth[r.bucket] = (byMonth[r.bucket]||0) + r.n })
  const monthData = Object.keys(byMonth).sort().map(k=>({month:k, FIRs: byMonth[k]}))

  const byType = {}
  trends.forEach(r => { byType[r.crime_type] = (byType[r.crime_type]||0) + r.n })
  const typeData = Object.entries(byType).map(([k,v])=>({type:k,n:v})).sort((a,b)=>b.n-a.n).slice(0,8)

  const intensityById = Object.fromEntries(intensity.map(d=>[d.id, d]))

  const styleFn = (feature) => {
    const d = intensityById[feature.properties.id]
    const v = d?.intensity || 0
    return { fillColor: colorFor(v), fillOpacity: 0.6, color: '#94a3b8', weight: 1 }
  }
  const onEach = (feature, layer) => {
    const d = intensityById[feature.properties.id]
    layer.bindTooltip(`<b>${feature.properties.name}</b><br/>${d?.n || 0} FIRs · avg sev ${d?.avg_sev?.toFixed(1) || '—'}`, {sticky:true})
  }

  return (
    <>
      <div className="topbar">
        <h1><LayoutDashboard size={22} style={{marginRight:8, verticalAlign:'middle'}} /> Dashboard</h1>
        <span className="pill ok">AI Provider: {stats?.provider || '…'}</span>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Total FIRs</div><div className="v">{stats?.firs ?? '—'}</div></div>
        <div className="kpi"><div className="l">Persons</div><div className="v">{stats?.persons ?? '—'}</div></div>
        <div className="kpi"><div className="l">Stations</div><div className="v">{stats?.stations ?? '—'}</div></div>
        <div className="kpi"><div className="l">Districts</div><div className="v">{stats?.districts ?? '—'}</div></div>
        <div className="kpi"><div className="l">Active Risk Alerts</div><div className="v" style={{color:'var(--bad)'}}>{alerts.length}</div></div>
      </div>

      <div className="row">
        <div className="card col" style={{minWidth:'48%'}}>
          <h3 style={{marginTop:0, color:'var(--text)'}}>
            <MapPinned size={18} style={{marginRight:8, verticalAlign:'text-bottom', color:'var(--accent)'}}/>
            Voidhack — district crime intensity (last 12mo)
          </h3>
          <div style={{height:360, borderRadius:8, overflow:'hidden', border:'1px solid var(--line)'}}>
            <MapContainer center={[14.7, 76]} zoom={6} style={{height:'100%',width:'100%'}}>
              <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
              {geo && <GeoJSON data={geo} style={styleFn} onEachFeature={onEach}/>}
            </MapContainer>
          </div>
          <div style={{display:'flex',gap:6,marginTop:8,fontSize:11,color:'var(--muted)',flexWrap:'wrap'}}>
            <span style={{background:'#22c55e',padding:'2px 8px',borderRadius:4,color:'#fff'}}>low</span>
            <span style={{background:'#fcd34d',padding:'2px 8px',borderRadius:4,color:'#000'}}>med</span>
            <span style={{background:'#f59e0b',padding:'2px 8px',borderRadius:4,color:'#fff'}}>elev</span>
            <span style={{background:'#ef4444',padding:'2px 8px',borderRadius:4,color:'#fff'}}>high</span>
            <span style={{background:'#7f1d1d',padding:'2px 8px',borderRadius:4,color:'#fff'}}>critical</span>
          </div>
        </div>

        <div className="card col">
          <h3 style={{marginTop:0, color:'var(--text)'}}>Top crime categories</h3>
          <div style={{height:360}}>
            <ResponsiveContainer>
              <BarChart data={typeData} layout="vertical" margin={{left:20}}>
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3"/>
                <XAxis type="number" stroke="#6B7280" fontSize={11}/>
                <YAxis type="category" dataKey="type" stroke="#6B7280" fontSize={11} width={120}/>
                <ChartTooltip contentStyle={CHART_TOOLTIP}/>
                <Bar dataKey="n" fill="#2563EB" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{marginTop:0, color:'var(--text)'}}>FIR volume — last 12 months</h3>
        <div style={{height:220}}>
          <ResponsiveContainer>
            <LineChart data={monthData}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3"/>
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11}/>
              <YAxis stroke="#6B7280" fontSize={11}/>
              <ChartTooltip contentStyle={CHART_TOOLTIP}/>
              <Line type="monotone" dataKey="FIRs" stroke="#2563EB" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{marginTop:0, color:'var(--text)'}}>Top predictive risk alerts</h3>
        {alerts.length===0 ? <div className="dim">No alerts triggered.</div> :
          alerts.slice(0,5).map((a,i)=>(
            <div key={i} className={`alert ${a.uplift_pct>200?'':'warn'}`}>
              <b>{a.district}</b> — {a.crime_type}: +{a.uplift_pct}% vs prior baseline
              <div className="dim" style={{marginTop:4}}>{a.reason}</div>
            </div>
          ))
        }
      </div>
    </>
  )
}
