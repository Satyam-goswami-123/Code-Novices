import React, { useEffect, useRef, useState } from 'react'
import { api, getToken } from '../api'

function AgentTrace({trace}){
  if(!trace) return null
  return (
    <details open style={{marginTop:8}}>
      <summary style={{cursor:'pointer'}}>🧠 Multi-agent reasoning trace ({trace.length} steps)</summary>
      <div style={{marginTop:6,borderLeft:'2px solid var(--accent)',paddingLeft:10}}>
        {trace.map((step,i)=>(
          <div key={i} style={{marginBottom:8,padding:8,background:'#0e1730',borderRadius:6}}>
            <div style={{fontWeight:700,color:'#4f8cff',fontSize:12}}>STEP {i+1} · {step.agent}</div>
            <pre style={{margin:'4px 0 0 0',fontSize:11,whiteSpace:'pre-wrap',
              background:'transparent',border:0,padding:0,maxHeight:160,overflow:'auto'}}>
              {typeof step.output==='string'? step.output : JSON.stringify(step.output ?? step.decision ?? step.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </details>
  )
}

function Message({m}){
  const meta = m.meta || {}
  return (
    <div className={`msg ${m.role}`}>
      <div>{m.content}</div>
      {meta.mode === 'multi_agent' && <AgentTrace trace={meta.trace}/>}
      {(meta.sql || meta.rationale || (meta.rows && meta.rows.length)) && (
        <details>
          <summary>📊 Explainability (SQL · rationale · data)</summary>
          {meta.rationale && <div className="meta"><b>Why:</b> {meta.rationale}</div>}
          {meta.sql && <pre>{meta.sql}</pre>}
          {meta.rows && meta.rows.length>0 && (
            <table>
              <thead><tr>{(meta.columns||Object.keys(meta.rows[0])).map(c=><th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {meta.rows.slice(0,10).map((r,i)=>(
                  <tr key={i}>{(meta.columns||Object.keys(r)).map(c=><td key={c}>{String(r[c]??'')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      )}
      {meta.sub_results?.length>0 && (
        <details>
          <summary>🔎 Sub-questions evaluated ({meta.sub_results.length})</summary>
          {meta.sub_results.map((s,i)=>(
            <div key={i} className="meta" style={{marginTop:6}}>
              <div><b>Q{i+1}:</b> {s.q}</div>
              {s.sql && <pre>{s.sql}</pre>}
            </div>
          ))}
        </details>
      )}
      {meta.error && <div className="meta" style={{color:'#fca5a5'}}>Error: {meta.error}</div>}
    </div>
  )
}

export default function Chat(){
  const [sessions, setSessions] = useState([])
  const [sid, setSid] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [lang, setLang] = useState('en-IN')
  const [multiAgent, setMultiAgent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const recogRef = useRef(null)
  const bottomRef = useRef(null)

  const loadSessions = async () => setSessions(await api.listSessions())
  useEffect(()=>{ loadSessions() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const openSession = async (id) => {
    setSid(id)
    const r = await api.getSession(id)
    setMessages(r.messages)
  }

  const newChat = () => { setSid(null); setMessages([]) }

  const send = async (override) => {
    const msg = (override ?? text).trim()
    if(!msg) return
    setBusy(true); setText('')
    setMessages(m => [...m, {role:'user', content: msg}])
    try{
      const r = await api.chat(msg, sid, lang.startsWith('kn')?'kn':'en', multiAgent)
      if(!sid){ setSid(r.session_id); loadSessions() }
      setMessages(m => [...m, {role:'assistant', content: r.answer, meta: r}])
      try{
        const u = new SpeechSynthesisUtterance(r.answer.slice(0, 400))
        u.lang = lang
        window.speechSynthesis.speak(u)
      }catch{}
    }catch(e){
      setMessages(m => [...m, {role:'assistant', content: 'Request failed: '+e.message}])
    }finally{ setBusy(false) }
  }

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if(!SR){ alert('Speech recognition not supported. Use Chrome/Edge.'); return }
    if(recording){ recogRef.current?.stop(); setRecording(false); return }
    const r = new SR()
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1
    r.onresult = (e) => {
      const txt = e.results[0][0].transcript
      setText(txt)
      setTimeout(()=>send(txt), 200)
    }
    r.onend = ()=> setRecording(false)
    r.onerror = ()=> setRecording(false)
    recogRef.current = r
    r.start(); setRecording(true)
  }

  const exportPdf = () => {
    if(!sid) return
    fetch(api.pdfUrl(sid), {headers: {'Authorization': `Bearer ${getToken()}`}})
      .then(r=>r.blob()).then(b=>{
        const u = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = u; a.download = `abhedya_chat_${sid}.pdf`; a.click()
        URL.revokeObjectURL(u)
      })
  }

  const suggestions = lang.startsWith('kn') ? [
    "ಖಾತೆ 12345 ರ ಜಾಡನ್ನು ಪತ್ತೆ ಹಚ್ಚಿ.",
    "ಕಳೆದ 7 ದಿನಗಳಲ್ಲಿ ಅತಿ ಹೆಚ್ಚು ವಹಿವಾಟು ನಡೆಸಿದ ಖಾತೆಗಳನ್ನು ತೋರಿಸಿ."
  ] : [
    "Trace victim account 123456789012 across 4 hops.",
    "Top 5 mule accounts by transaction velocity in the last 7 days.",
    "Which banks saw the biggest spike in suspicious transfers recently?",
    "Show mule ring network around account id 987654321000.",
    "Generate freeze notice for all accounts linked to victim id 12345.",
  ]

  return (
    <>
      <div className="topbar">
        <h1>💬 Conversational AI</h1>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <label className="dim" style={{display:'flex',alignItems:'center',gap:4}}>
            <input type="checkbox" checked={multiAgent} onChange={e=>setMultiAgent(e.target.checked)}/>
            🧠 Multi-agent
          </label>
          <select value={lang} onChange={e=>setLang(e.target.value)}>
            <option value="en-IN">English</option>
            <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
          </select>
          <button onClick={newChat}>+ New</button>
          <button disabled={!sid} onClick={exportPdf}>Export PDF</button>
        </div>
      </div>

      <div className="chat-wrap">
        <div className="sessions">
          <div className="dim" style={{padding:'6px 10px'}}>Sessions</div>
          {sessions.length===0 && <div className="dim" style={{padding:10}}>No sessions yet.</div>}
          {sessions.map(s => (
            <div key={s.id} className={`s ${s.id===sid?'active':''}`} onClick={()=>openSession(s.id)}>
              {s.title || `Session #${s.id}`}
              <div className="dim" style={{fontSize:10}}>{s.created_at}</div>
            </div>
          ))}
        </div>

        <div className="chat-main">
          <div className="chat-messages">
            {messages.length===0 && (
              <div style={{margin:'auto',maxWidth:520,textAlign:'center'}}>
                <h3>Ask anything about Abhedya-Chakra financial data</h3>
                <div className="dim">English or Kannada. Voice supported. Toggle multi-agent for tracing mule networks.</div>
                <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:6}}>
                  {suggestions.map((s,i)=>(
                    <button key={i} onClick={()=>send(s)} style={{textAlign:'left'}}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m,i)=> <Message key={i} m={m}/>)}
            {busy && <div className="msg assistant"><i>{multiAgent?'🧠 Agents collaborating…':'Thinking…'}</i></div>}
            <div ref={bottomRef}/>
          </div>
          <div className="chat-input">
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder={lang.startsWith('kn')?'ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ…':'Type your question…'}
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }}/>
            <div className="controls">
              <button className={`mic ${recording?'rec':''}`} onClick={toggleMic}>
                {recording?'■ Stop':'🎤 Speak'}
              </button>
              <button className="primary" disabled={busy} onClick={()=>send()}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
