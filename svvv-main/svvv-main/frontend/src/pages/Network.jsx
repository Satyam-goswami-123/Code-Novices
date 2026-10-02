import React, { useEffect, useRef, useState } from 'react'
import { Network as VisNetwork } from 'vis-network/standalone'
import { api, downloadAuthed } from '../api'
import { Network as NetworkIcon, Search, ClipboardList, AlertTriangle } from 'lucide-react';

export default function Network(){
  const ref = useRef(null)
  const netRef = useRef(null)
  
  const [txnId, setTxnId] = useState('')
  const [districts, setDistricts] = useState([])
  const [district, setDistrict] = useState('')
  const [minTies, setMinTies] = useState(1)
  
  const [info, setInfo] = useState({nodes:0,edges:0})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawGraph, setRawGraph] = useState({nodes:[], edges:[]})

  useEffect(() => {
    // Attempt to load districts if the API supports it, otherwise ignore
    if (api.districts) {
      api.districts().then(d => { if(Array.isArray(d)) setDistricts(d) }).catch(() => {})
    }
    loadMacroNetwork()
  }, [])

  const loadMacroNetwork = async () => {
    setLoading(true); setError(null)
    try {
      // 1st backend does not have /api/network, so we fetch a sample account
      const res = await fetch('http://127.0.0.1:8001/api/sample-accounts')
      if (res.ok) {
        const samples = await res.json()
        if (samples && samples.length > 0) {
          const sampleAcc = samples[0].account_number || samples[0]
          setTxnId(sampleAcc)
          const g = await api.traceTransaction(sampleAcc)
          mapGraphData(g)
          return
        }
      }
      throw new Error("Could not load sample accounts. Enter a Person/Account ID manually.")
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const mapGraphData = (g) => {
    if (!g.nodes) return
    const visNodes = g.nodes.map(n => ({
      id: n.id,
      label: n.label || n.id,
      title: n.role,
      role: n.role,
      ifsc: n.ifsc,
      total_received: n.total_received,
      total_sent: n.total_sent,
      in_degree: n.in_degree,
      out_degree: n.out_degree,
      group: n.role,
      city: 'Unknown' // Mock district/city
    }))
    const visEdges = g.edges.map(e => ({
      from: e.source,
      to: e.target,
      value: e.amount,
      title: `${e.payment_mode || ''} | ${e.amount}`
    }))
    setRawGraph({nodes: visNodes, edges: visEdges})
  }

  const traceFunds = async () => {
    if (!txnId.trim()) return loadMacroNetwork()
    setLoading(true); setError(null)
    try {
      const g = await api.traceTransaction(txnId.trim())
      if (g.error) throw new Error(g.error)
      mapGraphData(g)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!rawGraph.nodes || rawGraph.nodes.length === 0) return
    
    let filteredNodes = rawGraph.nodes
    if (district) {
      const dName = districts.find(d => d.id === parseInt(district))?.name
      if (dName) {
        filteredNodes = filteredNodes.filter(n => !n.city || n.city.toLowerCase() === dName.toLowerCase())
      }
    }
    
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredEdges = rawGraph.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))

    renderGraph({nodes: filteredNodes, edges: filteredEdges})
  }, [rawGraph, district, minTies, districts])

  const renderGraph = (g) => {
    setInfo({nodes:g.nodes.length, edges:g.edges.length})
    if(netRef.current){ netRef.current.destroy() }
    
    const formattedNodes = g.nodes.map(n => {
      let bg = '#2563EB', border = '#1D4ED8'
      if (n.role === 'root') { bg = '#ef4444'; border = '#b91c1c' }
      else if (n.role === 'intermediate') { bg = '#f59e0b'; border = '#d97706' }
      else if (n.role === 'terminal') { bg = '#3b82f6'; border = '#1d4ed8' }
      
      return { ...n, shape: 'dot', scaling: {min:8, max:36}, color: {background: bg, border: border}, font: {color: '#111827', size: 12} }
    })

    netRef.current = new VisNetwork(ref.current, {nodes: formattedNodes, edges: g.edges}, {
      physics: {barnesHut: {gravitationalConstant: -8000, springLength: 120}},
      interaction: {hover: true}
    })
    
    netRef.current.on('click', params => {
      if(params.nodes && params.nodes.length){
        const id = params.nodes[0]
        const node = g.nodes.find(n=>n.id===id)
        setSelected(node)
      } else setSelected(null)
    })
  }

  return (
    <>
      <div className="topbar">
        <h1><NetworkIcon size={20} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Criminal Network</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={district} onChange={e=>setDistrict(e.target.value)} style={{width: 140}}>
            <option value="">All districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input 
            placeholder="Person ID (option)" 
            value={txnId} 
            onChange={e=>setTxnId(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && traceFunds()}
            style={{width:160}}
          />
          <div style={{display:'flex', alignItems:'center', gap:4}}>
            <span style={{fontSize: 12, color:'var(--muted)'}}>min ties</span>
            <input type="number" min="1" value={minTies} onChange={e=>setMinTies(parseInt(e.target.value)||1)} style={{width:50}} />
          </div>
          <button className="primary" onClick={traceFunds} disabled={loading}>
            {loading ? '...' : 'Reload'}
          </button>
        </div>
      </div>
      
      {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 12}}>
        <AlertTriangle size={18} style={{verticalAlign: 'text-bottom', marginRight: 8}}/> {error}
      </div>}
      
      <div className="dim" style={{marginBottom: 12}}>
        Click a node to inspect. Then generate a case-file PDF.
      </div>
      
      <div className="row">
        <div className="network col" ref={ref} style={{minWidth:'60%'}}/>
        <div className="card col" style={{maxWidth:340}}>
          <h3 style={{marginTop:0}}>Inspector</h3>
          {!selected && <div className="dim">Click a node to inspect.</div>}
          {selected && (
            <div>
              <h3 style={{margin: '0 0 4px 0', wordBreak: 'break-all'}}>{selected.label}</h3>
              <div style={{color: 'var(--muted)', fontSize: 13, marginBottom:4, wordBreak: 'break-all'}}>{selected.label}</div>
              <div style={{fontSize: 13, marginBottom:4}}>Role: {selected.role}</div>
              <div style={{fontSize: 13, marginBottom:4}}>IFSC: {selected.ifsc || 'Unknown'}</div>
              <div style={{fontSize: 13, marginBottom:16}}>Received: ₹{selected.total_received?.toLocaleString() || 0}</div>
              
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button className="primary"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Case File - ${selected.label}</title>
                          <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #111827; }
                            h1 { color: #dc2626; border-bottom: 2px solid #ef4444; padding-bottom: 10px; }
                            .section { margin-top: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
                            .row { display: flex; margin-bottom: 12px; border-bottom: 1px dashed #d1d5db; padding-bottom: 8px; }
                            .label { font-weight: 600; color: #4b5563; width: 150px; }
                            .val { font-weight: 700; color: #111827; }
                          </style>
                        </head>
                        <body>
                          <h1>Criminal Network - Case File Report</h1>
                          <div class="section">
                            <h2>Subject Information</h2>
                            <div class="row"><div class="label">Person/Account ID:</div> <div class="val">${selected.label}</div></div>
                            <div class="row"><div class="label">Role:</div> <div class="val">${selected.role || 'Unknown'}</div></div>
                            <div class="row"><div class="label">IFSC Code:</div> <div class="val">${selected.ifsc || 'Unknown'}</div></div>
                            <div class="row"><div class="label">Total Received:</div> <div class="val">INR ${selected.total_received?.toLocaleString() || 0}</div></div>
                            <div class="row"><div class="label">Total Sent:</div> <div class="val">INR ${selected.total_sent?.toLocaleString() || 0}</div></div>
                            <div class="row"><div class="label">Incoming Links:</div> <div class="val">${selected.in_degree || 0}</div></div>
                            <div class="row"><div class="label">Outgoing Links:</div> <div class="val">${selected.out_degree || 0}</div></div>
                          </div>
                          <p style="margin-top: 40px; color: #6b7280; font-size: 12px; text-align: center;">
                            Generated automatically by Abhedya Intelligence Network.<br/>
                            CONFIDENTIAL - FOR OFFICIAL USE ONLY
                          </p>
                          <script>
                            window.onload = () => { window.print(); window.close(); }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}>
                  <ClipboardList size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Generate Case File PDF
                </button>
                <button onClick={() => {
                  if (netRef.current) netRef.current.focus(selected.id, {scale: 1.5, animation: true})
                }}>
                  <Search size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Re-center graph on this person
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="dim" style={{marginTop: 8}}>{info.nodes} nodes · {info.edges} edges</div>
    </>
  )
}
