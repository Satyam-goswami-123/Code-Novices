import React, { useEffect, useState } from 'react'
import { mappls } from 'mappls-web-maps'
const mapplsClassObject = new mappls();
import { api } from '../api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, LineChart, Line } from 'recharts'
import { LayoutDashboard, MapPinned } from 'lucide-react'
import AbhedyaChakra3D from '../components/AbhedyaChakra3D'

function colorFor(intensity) {
  if (intensity > 0.8) return '#7f1d1d'
  if (intensity > 0.6) return '#b91c1c'
  if (intensity > 0.4) return '#ef4444'
  if (intensity > 0.2) return '#f59e0b'
  if (intensity > 0.05) return '#fcd34d'
  return '#22c55e'
}

const CHART_TOOLTIP = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827', fontSize: 12 }

export default function Dashboard() {

  const mapRef = React.useRef(null);
  React.useEffect(() => {
    const loadObject = { map: true, version: '3.0' };
    mapplsClassObject.initialize("negfymryyzfzanvgmzrhtyewwikaahefbxlf", loadObject, () => {
      if (!mapRef.current) {
        mapRef.current = mapplsClassObject.Map({
          id: "mappls-map-dashboard",
          properties: { center: [21.0, 78.0], zoom: 4 }
        });
      }
    });
  }, []);

  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [alerts, setAlerts] = useState([])
  const [geo, setGeo] = useState(null)
  const [intensity, setIntensity] = useState([])

  useEffect(() => {
    api.stats().then(setStats)
    api.trends(12).then(setTrends).catch(() => { })
    api.predict().then(setAlerts).catch(() => { })
    api.districtIntensity(12).then(setIntensity).catch(() => { })
    api.districts && fetch('/api/meta/districts/geojson', { headers: { Authorization: `Bearer ${localStorage.getItem('abhedya_token')}` } })
      .then(r => r.json()).then(setGeo).catch(() => { })
  }, [])

  const byType = {}
  trends.forEach(r => { byType[r.crime_type] = (byType[r.crime_type] || 0) + r.n })
  const typeData = Object.entries(byType).map(([k, v]) => ({ type: k, n: v })).sort((a, b) => b.n - a.n).slice(0, 8)

  const intensityById = Object.fromEntries(intensity.map(d => [d.id, d]))

  const styleFn = (feature) => {
    const d = intensityById[feature.properties.id]
    const v = d?.intensity || 0
    return { fillColor: colorFor(v), fillOpacity: 0.6, color: '#94a3b8', weight: 1 }
  }
  const onEach = (feature, layer) => {
    const d = intensityById[feature.properties.id]
    layer.bindTooltip(`<b>${feature.properties.name}</b><br/>${d?.n || 0} Frauds · avg sev ${d?.avg_sev?.toFixed(1) || '—'}`, { sticky: true })
  }

  return (
    <>
      <div className="topbar">
        <h1><LayoutDashboard size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Dashboard</h1>
        <span className="pill ok">AI Provider: {stats?.provider || '…'}</span>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Total Transactions</div><div className="v">{stats?.firs ?? '—'}</div></div>
        <div className="kpi"><div className="l">Monitored Accounts</div><div className="v">{stats?.persons ?? '—'}</div></div>
        <div className="kpi"><div className="l">Mule Links</div><div className="v">{stats?.stations ?? '—'}</div></div>
        <div className="kpi"><div className="l">Flagged Districts</div><div className="v">{stats?.districts ?? '—'}</div></div>
        <div className="kpi"><div className="l">Active Fraud Alerts</div><div className="v" style={{ color: 'var(--bad)' }}>{alerts.length}</div></div>
      </div>

      <div className="row">
        <div className="card col" style={{ minWidth: '48%' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)' }}>
            <MapPinned size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--accent)' }} />
            Voidhack — District Fraud Intensity (last 12mo)
          </h3>
          <div style={{ height: 360, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div id="mappls-map-dashboard" style={{ height: '100%', width: '100%' }}></div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span style={{ background: '#22c55e', padding: '2px 8px', borderRadius: 4, color: '#fff' }}>low</span>
            <span style={{ background: '#fcd34d', padding: '2px 8px', borderRadius: 4, color: '#000' }}>med</span>
            <span style={{ background: '#f59e0b', padding: '2px 8px', borderRadius: 4, color: '#fff' }}>elev</span>
            <span style={{ background: '#ef4444', padding: '2px 8px', borderRadius: 4, color: '#fff' }}>high</span>
            <span style={{ background: '#7f1d1d', padding: '2px 8px', borderRadius: 4, color: '#fff' }}>critical</span>
          </div>
        </div>

        <div className="card col" style={{ padding: 0, height: 442 }}>
          <AbhedyaChakra3D />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <h3 style={{ margin: '16px 16px 0', color: 'var(--text)' }}>Temporal Graph Trail (Forensic Trace)</h3>
        <div style={{ height: 600 }}>
          <iframe 
            src="http://localhost:5174" 
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Temporal Graph Trail"
          />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: 'var(--text)' }}>Top Predictive Mule Ring Alerts</h3>
        {alerts.length === 0 ? <div className="dim">No active fraud clusters detected.</div> :
          alerts.slice(0, 5).map((a, i) => (
            <div key={i} className={`alert ${a.uplift_pct > 200 ? '' : 'warn'}`}>
              <b>{a.district}</b> — {a.crime_type}: +{a.uplift_pct}% vs prior baseline
              <div className="dim" style={{ marginTop: 4 }}>{a.reason}</div>
            </div>
          ))
        }
      </div>
    </>
  )
}
