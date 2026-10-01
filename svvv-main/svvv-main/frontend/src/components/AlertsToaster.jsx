import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'

const BEEP_DATA = "data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAEAAAAAAAA//8BAP7/AwD9/wQA/P8FAPv/BgD6/wcA+f8IAPj/CQD3/woA9v8LAPX/DAD0/w0A8/8OAPL/DwDx/xAA8P8RAO//EgDu/xMA7f8UAOz/FQDr/xYA6v8XAOn/GADo/xkA5/8aAOb/GwDl/xwA5P8dAOP/HgDi/x8A4f8gAOD/IQDf/yIA3v8jAN3/JADc/yUA2/8mANr/JwDZ/ygA2P8pANf/KgDW/ysA1f8sANT/LQDT/y4A0v8vANH/MADQ/zEAz/8yAM7/MwDN/zQAzP81AMv/NgDK/zcAyf84AMj/OQDH/zoAxv87AMX/PADE/z0Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+AMP/PgDD/z4Aw/8+"

export default function AlertsToaster(){
  const [items, setItems] = useState([])
  const audioRef = useRef(null)
  const grantedRef = useRef(false)

  useEffect(()=>{
    if(typeof Notification !== 'undefined' && Notification.permission === 'default'){
      Notification.requestPermission().then(p=>{ grantedRef.current = p==='granted' })
    } else if(typeof Notification !== 'undefined' && Notification.permission==='granted'){
      grantedRef.current = true
    }
    // prime predict cache once so subsequent calls can report deltas
    api.predict().catch(()=>{})

    const tick = async () => {
      try {
        const events = await api.predictStream()
        if(events && events.length){
          setItems(prev => [...prev, ...events.map(e=>({...e, _id: Math.random().toString(36).slice(2)}))])
          try { audioRef.current?.play() } catch{}
          events.forEach(e => {
            if(grantedRef.current){
              new Notification(`Risk alert: ${e.crime_type} in ${e.district}`,
                { body: `+${e.uplift_pct}% above baseline` })
            }
          })
        }
      } catch {}
    }
    const id = setInterval(tick, 30000) // every 30s
    return () => clearInterval(id)
  }, [])

  const dismiss = id => setItems(it => it.filter(x => x._id !== id))

  if(!items.length) return <audio ref={audioRef} src={BEEP_DATA} preload="auto"/>
  return (
    <>
      <audio ref={audioRef} src={BEEP_DATA} preload="auto"/>
      <div style={{position:'fixed',right:16,bottom:16,zIndex:9999,display:'flex',flexDirection:'column',gap:8,maxWidth:340}}>
        {items.slice(-4).map(e => (
          <div key={e._id} className="card" style={{borderLeft:'3px solid #EF4444', background:'#FEF2F2', boxShadow:'0 4px 16px rgba(0,0,0,0.1)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
              <div>
                <div style={{fontWeight:700}}>⚠ {e.crime_type} surge — {e.district}</div>
                <div className="dim" style={{fontSize:12}}>+{e.uplift_pct}% above prior 12mo baseline</div>
              </div>
              <button onClick={()=>dismiss(e._id)} style={{padding:'2px 6px'}}>×</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
