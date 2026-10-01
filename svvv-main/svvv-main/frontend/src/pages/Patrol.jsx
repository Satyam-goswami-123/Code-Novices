import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Mic, MicOff, Ear, Pause } from 'lucide-react';



const WAKE_WORDS = ['hey abhedya', 'hey ks p', 'abhedya', 'ಕೆಎಸ್‌ಪಿ']

export default function Patrol(){
  const [lang,setLang] = useState('kn-IN')
  const [active,setActive] = useState(false)
  const [listening,setListening] = useState(false)
  const [armed,setArmed] = useState(false)   // wake-word detected, awaiting question
  const [transcript,setTranscript] = useState('')
  const [interim,setInterim] = useState('')
  const [log,setLog] = useState([])  // {role, text}
  const recogRef = useRef(null)
  const restartingRef = useRef(false)
  const armedRef = useRef(false)
  const langRef = useRef('kn-IN')
  const sessionIdRef = useRef(null)

  useEffect(()=>{ armedRef.current = armed }, [armed])
  useEffect(()=>{ langRef.current = lang }, [lang])

  const speak = (txt, l=langRef.current) => {
    try {
      const u = new SpeechSynthesisUtterance(txt.slice(0,400))
      u.lang = l; window.speechSynthesis.speak(u)
    } catch {}
  }

  const askBackend = async (text) => {
    setLog(L=>[...L, {role:'user', text}])
    try {
      const r = await api.chat(text, sessionIdRef.current, langRef.current.startsWith('kn')?'kn':'en')
      sessionIdRef.current = r.session_id
      setLog(L=>[...L, {role:'assistant', text: r.answer, meta:{sql:r.sql, rows:r.rows}}])
      speak(r.answer)
    } catch(e){
      setLog(L=>[...L, {role:'assistant', text: 'Error: '+e.message}])
    }
  }

  const handleFinal = (text) => {
    const low = text.toLowerCase().trim()
    if(!armedRef.current){
      const hit = WAKE_WORDS.some(w => low.includes(w))
      if(hit){
        setArmed(true); armedRef.current = true
        speak(langRef.current.startsWith('kn')?'ಹೌದು ಸಾರ್, ಕೇಳುತ್ತಿದ್ದೇನೆ':'Yes officer, listening', langRef.current)
        // strip wake word and use rest if present
        const rest = WAKE_WORDS.reduce((s,w)=>s.replace(new RegExp(w,'i'),''), low).trim()
        if(rest.length > 4) {
          setArmed(false); armedRef.current = false
          askBackend(rest)
        }
      }
    } else {
      setArmed(false); armedRef.current = false
      askBackend(text)
    }
  }

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){ alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = langRef.current
    r.onresult = (e) => {
      let interimTxt = ''
      for(let i=e.resultIndex; i<e.results.length; i++){
        const res = e.results[i]
        if(res.isFinal){
          const t = res[0].transcript
          setTranscript(t)
          setInterim('')
          handleFinal(t)
        } else {
          interimTxt += res[0].transcript
        }
      }
      if(interimTxt) setInterim(interimTxt)
    }
    r.onend = () => {
      setListening(false)
      if(active && !restartingRef.current){
        restartingRef.current = true
        setTimeout(()=>{ restartingRef.current = false; try { r.start(); setListening(true) } catch{} }, 250)
      }
    }
    r.onerror = (e) => {
      if(e.error === 'not-allowed'){ alert('Microphone permission denied'); setActive(false) }
    }
    recogRef.current = r
    try { r.start(); setListening(true); setActive(true) } catch{}
  }
  const stop = () => {
    setActive(false); setArmed(false); armedRef.current = false
    try { recogRef.current?.stop() } catch{}
    try { window.speechSynthesis.cancel() } catch{}
  }

  useEffect(()=>()=>stop(), [])

  return (
    <>
      <div className="topbar">
        <h1><Mic size={24} style={{marginRight:8}} /> Hands-free Patrol Mode</h1>
        <div style={{display:'flex',gap:8}}>
          <select value={lang} onChange={e=>setLang(e.target.value)}>
            <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
            <option value="en-IN">English</option>
          </select>
          {!active
            ? <button className="primary" onClick={start}>▶ Start listening</button>
            : <button className="danger" onClick={stop}>■ Stop</button>}
        </div>
      </div>

      <div className="card" style={{textAlign:'center',padding:30,
            background: armed ? 'linear-gradient(135deg,#1e3a8a,#22c55e)' : undefined}}>
        <div style={{fontSize:48,marginBottom:10}}>
          {!active ? <MicOff size={48} /> : armed ? <Ear size={48} /> : listening ? <Mic size={48} /> : <Pause size={48} />}
        </div>
        <h2 style={{margin:0}}>
          {!active && 'Idle — press Start'}
          {active && !armed && (lang.startsWith('kn')?'"ಹೇ Abhedya" ಎಂದು ಹೇಳಿ ಪ್ರಶ್ನೆ ಕೇಳಿ':'Say "Hey Abhedya" then ask your question')}
          {active && armed && (lang.startsWith('kn')?'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಹೇಳಿ…':'Ask your question…')}
        </h2>
        <div className="dim" style={{marginTop:10,minHeight:20}}>
          {interim && <i>"{interim}"</i>}
        </div>
        {transcript && <div className="dim" style={{marginTop:4,fontSize:12}}>last: "{transcript}"</div>}
      </div>

      <div className="card">
        <h3 style={{marginTop:0}}>Conversation</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:380,overflow:'auto'}}>
          {log.length===0 && <div className="dim">No conversation yet. Say "Hey Abhedya" to begin.</div>}
          {log.map((m,i)=>(
            <div key={i} className={`msg ${m.role}`}>{m.text}</div>
          ))}
        </div>
      </div>
    </>
  )
}
