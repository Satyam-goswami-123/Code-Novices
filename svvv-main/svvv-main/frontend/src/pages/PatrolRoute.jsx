import React, { useEffect, useState } from 'react'
import { mappls } from 'mappls-web-maps'
const mapplsClassObject = new mappls();
import { api } from '../api'
import { Car, Compass, Map } from 'lucide-react';

export default function PatrolRoute(){
  const [districts,setDistricts] = useState([])
  const [stations,setStations] = useState([])
  const [districtId,setDistrictId] = useState('')
  const [stationId,setStationId] = useState('')
  const [months,setMonths] = useState(3)
  const [maxWp,setMaxWp] = useState(6)
  const [route,setRoute] = useState(null)
  const [busy,setBusy] = useState(false)

  useEffect(()=>{ api.districts().then(setDistricts) },[])
  useEffect(()=>{
    if(districtId){ api.stations(districtId).then(s=>{ setStations(s); setStationId(s[0]?.id||'') }) }
    else { setStations([]); setStationId('') }
  },[districtId])

  const gen = async () => {
    if(!stationId && !districtId) return
    setBusy(true)
    try {
      const r = await api.patrolRoute(stationId
        ? {station_id: stationId, months, max_waypoints: maxWp}
        : {district_id: districtId, months, max_waypoints: maxWp})
      setRoute(r)
    } catch(e){ setRoute({error:e.message}) }
    finally { setBusy(false) }
  }

  const tour = route?.tour || []
  const center = tour[0] ? [tour[0].lat, tour[0].lng] : [14.5, 75.7]

  return (
    <>
      <div className="topbar">
        <h1><Car size={24} style={{marginRight:8}} /> Predictive Patrol Route</h1>
        <span className="pill warn">Nearest-neighbor over predicted hotspots</span>
      </div>

      <div className="card">
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <select value={districtId} onChange={e=>setDistrictId(e.target.value)}>
            <option value="">Pick district…</option>
            {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={stationId} onChange={e=>setStationId(e.target.value)} disabled={!stations.length}>
            <option value="">(district HQ as start)</option>
            {stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="dim">months
            <input type="number" min={1} max={24} value={months} onChange={e=>setMonths(+e.target.value)}
              style={{width:60,marginLeft:6}}/>
          </label>
          <label className="dim">waypoints
            <input type="number" min={3} max={12} value={maxWp} onChange={e=>setMaxWp(+e.target.value)}
              style={{width:60,marginLeft:6}}/>
          </label>
          <button className="primary" onClick={gen} disabled={busy || (!districtId && !stationId)}>
            {busy?'Optimizing…':<><Compass size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Generate route</>}
          </button>
        </div>
      </div>

      {route && route.error && <div className="card alert">{route.error}</div>}

      {route && !route.error && tour.length>0 && (
        <>
          <div className="kpis">
            <div className="kpi"><div className="l">District</div><div className="v" style={{fontSize:18}}>{route.district}</div></div>
            <div className="kpi"><div className="l">Waypoints</div><div className="v">{route.waypoints}</div></div>
            <div className="kpi"><div className="l">Total distance</div><div className="v">{route.distance_km} km</div></div>
            <div className="kpi"><div className="l">Basis</div><div className="v" style={{fontSize:18}}>last {route.months_basis} months</div></div>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="map">
              <div id="mappls-map-patrol" style={{height:'100%',width:'100%'}}></div>
            </div>
          </div>
          <div className="card">
            <a href={route.google_maps_url} target="_blank" rel="noreferrer">
              <Map size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Open route in Google Maps
            </a>
          </div>
        </>
      )}
    </>
  )
}
