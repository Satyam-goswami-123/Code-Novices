import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { mappls } from 'mappls-web-maps'

const mapplsClassObject = new mappls();

export default function Hotspots() {
  const [timeline, setTimeline] = useState({})
  const [busy, setBusy] = useState(false)
  const [bucketIdx, setBucketIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [txnId, setTxnId] = useState('')
  const playRef = useRef(null)

  const mapRef = useRef(null)
  const elementsRef = useRef([])

  const loadData = () => {
    setBusy(true)
    const p = txnId ? api.hotspotsTrace(txnId) : api.hotspotsTimeline(1, '')
    p.then(t => { setTimeline(t); setBucketIdx(0) })
      .catch(e => alert(e.message))
      .finally(() => setBusy(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const buckets = Object.keys(timeline)
  const currentBucket = buckets[bucketIdx]
  const data = timeline[currentBucket] || []

  useEffect(() => {
    if (!playing) { if (playRef.current) { clearInterval(playRef.current); playRef.current = null } return }
    playRef.current = setInterval(() => {
      setBucketIdx(i => {
        if (i >= buckets.length - 1) { setPlaying(false); return i }
        return i + 1
      })
    }, 1500)
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [playing, buckets.length])

  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    const loadObject = { map: true, version: '3.0' };
    let loaded = false;

    // Timeout to catch silent Mappls failures
    const timer = setTimeout(() => {
      if (!loaded) setMapError(true);
    }, 4000);

    mapplsClassObject.initialize("negfymryyzfzanvgmzrhtyewwikaahefbxlf", loadObject, () => {
      loaded = true;
      setMapError(false);
      if (!mapRef.current) {
        mapRef.current = mapplsClassObject.Map({
          id: "mappls-map-hotspots",
          properties: {
            center: [21.0, 78.0],
            zoom: 4,
            backgroundColor: '#1e293b'
          },
        });
      }
    });

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old elements
    elementsRef.current.forEach(el => {
      if (el && typeof el.remove === 'function') el.remove();
      else if (el) mapplsClassObject.removeLayer({ map: mapRef.current, layer: el });
    });
    elementsRef.current = [];

    // Draw new elements
    data.forEach((d) => {
      const p = mapplsClassObject.Polyline({
        map: mapRef.current,
        paths: [[d.from_lat, d.from_lng], [d.to_lat, d.to_lng]],
        strokeColor: '#38bdf8',
        strokeOpacity: 0.6,
        strokeWeight: 2
      });
      elementsRef.current.push(p);

      const m1 = mapplsClassObject.Marker({
        map: mapRef.current,
        position: { lat: d.from_lat, lng: d.from_lng },
        html: `<div style="background:#ef4444; width:10px; height:10px; border-radius:50%; border:1px solid white;"></div>`,
        popupHtml: `<div>Victim Source: ${d.from_city}<br/>Outflow: ₹${d.amount}</div>`
      });
      elementsRef.current.push(m1);

      const m2 = mapplsClassObject.Marker({
        map: mapRef.current,
        position: { lat: d.to_lat, lng: d.to_lng },
        html: `<div style="background:#f59e0b; width:8px; height:8px; border-radius:50%; border:1px solid white;"></div>`,
        popupHtml: `<div>Mule Node: ${d.to_city}<br/>Inflow: ₹${d.amount}</div>`
      });
      elementsRef.current.push(m2);
    });
  }, [data])

  return (
    <>
      <div className="topbar">
        <h1>🗺️ Geographic Fraud Dispersion</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Enter Transaction ID (e.g. TXN401119292)"
            value={txnId}
            onChange={e => setTxnId(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #475569', background: '#1e293b', color: '#fff', width: 250 }}
            onKeyDown={e => e.key === 'Enter' && loadData()}
          />
          <button className="primary" onClick={loadData}>Trace Geo</button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button className="primary" onClick={() => setPlaying(p => !p)} disabled={!buckets.length}>
            {playing ? '⏸ Pause' : '▶ Play Timeline'}
          </button>
          <div style={{ flex: 1 }}>
            <input type="range" min={0} max={Math.max(0, buckets.length - 1)} value={bucketIdx}
              onChange={e => { setPlaying(false); setBucketIdx(+e.target.value) }}
              style={{ width: '100%' }} />
          </div>
          <div style={{ minWidth: 160, textAlign: 'right' }}>
            <b style={{ fontSize: 18, color: '#4f8cff' }}>{currentBucket || '—'}</b><br />
            <span className="dim" style={{ fontSize: 11 }}>{data.length} geographic hops · ₹{(data.reduce((s, d) => s + d.amount, 0) / 100000).toFixed(1)}L transferred</span>
          </div>
        </div>
        <div className="map">
          {mapError && <div style={{ padding: 20, color: '#ef4444', textAlign: 'center', marginTop: 100 }}>
            <b>⚠️ Failed to load Mappls Map</b><br /><br />
            Your API Key was rejected, OR you have not whitelisted <code>localhost</code> in your Mappls API Dashboard.<br />
            Please check your Mappls Account Settings!
          </div>}
          <div id="mappls-map-hotspots" style={{ height: '100%', width: '100%', background: '#1e293b' }}></div>
        </div>
      </div>
      <div className="dim">{busy ? 'Loading flow timeline…' : `Trace funds to see how stolen funds scatter geographically.`}</div>
    </>
  )
}
