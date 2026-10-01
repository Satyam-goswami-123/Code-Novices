import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { api } from '../api'

export default function Hotspots(){
  const [timeline, setTimeline] = useState({})
  const [months,setMonths] = useState(36)
  const [crimeType,setCrimeType] = useState('')
  const [types,setTypes] = useState([])
  const [busy,setBusy] = useState(false)
  const [bucketIdx, setBucketIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef(null)

  useEffect(()=>{ api.crimeTypes().then(setTypes) },[])
  useEffect(()=>{
    setBusy(true)
    api.hotspotsTimeline(months, crimeType||undefined)
      .then(t=>{ setTimeline(t); setBucketIdx(Object.keys(t).length-1) })
      .finally(()=>setBusy(false))
  },[months,crimeType])

  const buckets = Object.keys(timeline)
  const currentBucket = buckets[bucketIdx]
  const data = timeline[currentBucket] || []
  const max = Math.max(1, ...data.map(d=>d.intensity))

  useEffect(()=>{
    if(!playing) { if(playRef.current){ clearInterval(playRef.current); playRef.current=null} return }
    playRef.current = setInterval(()=>{
      setBucketIdx(i => {
        if(i >= buckets.length-1){ setPlaying(false); return i }
        return i+1
      })
    }, 700)
    return ()=>{ if(playRef.current) clearInterval(playRef.current) }
  },[playing, buckets.length])

  return (
    <>
      <div className="topbar">
        <h1>🗺️ Hotspots — Time Machine</h1>
        <div style={{display:'flex',gap:8}}>
          <select value={crimeType} onChange={e=>setCrimeType(e.target.value)}>
            <option value="">All crime types</option>
            {types.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select value={months} onChange={e=>setMonths(+e.target.value)}>
            <option value="12">12 months back</option>
            <option value="24">24 months back</option>
            <option value="36">36 months back</option>
            <option value="48">48 months back</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <button className="primary" onClick={()=>setPlaying(p=>!p)} disabled={!buckets.length}>
            {playing?'⏸ Pause':'▶ Play'}
          </button>
          <div style={{flex:1}}>
            <input type="range" min={0} max={Math.max(0,buckets.length-1)} value={bucketIdx}
              onChange={e=>{ setPlaying(false); setBucketIdx(+e.target.value) }}
              style={{width:'100%'}}/>
          </div>
          <div style={{minWidth:130,textAlign:'right'}}>
            <b style={{fontSize:18,color:'#4f8cff'}}>{currentBucket || '—'}</b><br/>
            <span className="dim" style={{fontSize:11}}>{data.length} hotspot cells · {data.reduce((s,d)=>s+d.count,0)} FIRs</span>
          </div>
        </div>
        <div className="map">
          <MapContainer center={[14.5, 75.7]} zoom={7} style={{height:'100%',width:'100%'}}>
            <TileLayer attribution="© OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            {data.map((d,i)=>(
              <CircleMarker key={i+currentBucket} center={[d.lat,d.lng]}
                radius={6 + 24*(d.intensity/max)}
                pathOptions={{color:'#ef4444', fillColor:'#ef4444', fillOpacity:0.45}}>
                <Tooltip>
                  <div><b>{d.district}</b></div>
                  <div>{currentBucket}</div>
                  <div>Incidents: {d.count}</div>
                  <div>Top: {d.types.join(', ')}</div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
      <div className="dim">{busy?'Loading timeline…':`Scrub or play to watch hotspots evolve over ${buckets.length} months.`}</div>
    </>
  )
}
