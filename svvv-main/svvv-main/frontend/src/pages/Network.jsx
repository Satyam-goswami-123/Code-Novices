import React, { useEffect, useRef, useState } from 'react'
import { Network as VisNetwork } from 'vis-network/standalone'
import { api, downloadAuthed } from '../api'
import { Network as NetworkIcon, Search, ClipboardList } from 'lucide-react';

export default function Network(){
  const ref = useRef(null)
  const netRef = useRef(null)
  const [districts,setDistricts] = useState([])
  const [district,setDistrict] = useState('')
  const [personId,setPersonId] = useState('')
  const [minStrength,setMinStrength] = useState(1)
  const [info,setInfo] = useState({nodes:0,edges:0})
  const [selected,setSelected] = useState(null)
  useEffect(()=>{ api.districts().then(setDistricts) },[])

  const load = async () => {
    const params = { min_strength: minStrength, limit: 120 }
    if(district) params.district_id = district
    if(personId) params.person_id = personId
    const g = await api.network(params)
    setInfo({nodes:g.nodes.length, edges:g.edges.length})
    if(netRef.current){ netRef.current.destroy() }
    netRef.current = new VisNetwork(ref.current, g, {
      nodes:{shape:'dot', scaling:{min:8,max:36},
        font:{color:'#111827',size:12}, color:{background:'#2563EB',border:'#1D4ED8'}},
      edges:{color:{color:'#94A3B8',opacity:0.6}, smooth:false, scaling:{min:1,max:6}},
      physics:{barnesHut:{gravitationalConstant:-8000,springLength:120}},
      interaction:{hover:true}
    })
    netRef.current.on('click', params => {
      if(params.nodes && params.nodes.length){
        const id = params.nodes[0]
        const node = g.nodes.find(n=>n.id===id)
        setSelected({id, label: node?.label, title: node?.title})
      } else setSelected(null)
    })
  }
  useEffect(()=>{ load() },[])

  return (
    <>
      <div className="topbar">
        <h1><NetworkIcon size={20} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Criminal Network</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={district} onChange={e=>setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input placeholder="Person ID (optional)" value={personId} onChange={e=>setPersonId(e.target.value)} style={{width:140}}/>
          <label className="dim">min ties
            <input type="number" min={1} max={10} value={minStrength}
              onChange={e=>setMinStrength(+e.target.value)} style={{width:60,marginLeft:6}}/>
          </label>
          <button className="primary" onClick={load}>Reload</button>
        </div>
      </div>
      <div className="dim">Click a node to inspect. Then generate a case-file PDF.</div>
      <div className="row">
        <div className="network col" ref={ref} style={{minWidth:'60%'}}/>
        <div className="card col" style={{maxWidth:340}}>
          <h3 style={{marginTop:0}}>Inspector</h3>
          {!selected && <div className="dim">Click a person node in the graph.</div>}
          {selected && (
            <div>
              <div><b>{selected.label}</b></div>
              <div className="dim" style={{fontSize:12,marginTop:6}}>
                {selected.title?.split('|').map((s,i)=><div key={i}>{s.trim()}</div>)}
              </div>
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                <button className="primary"
                  onClick={()=>downloadAuthed(api.caseFileUrl(selected.id), `case_file_${selected.id}.pdf`)}>
                  <ClipboardList size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Generate Case File PDF
                </button>
                <button onClick={()=>{ setPersonId(selected.id); load() }}>
                  <Search size={20} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Re-center graph on this person
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="dim">{info.nodes} nodes · {info.edges} edges</div>
    </>
  )
}
