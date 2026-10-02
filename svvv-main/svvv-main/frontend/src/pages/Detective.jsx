import React from 'react'

export default function Detective() {
  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <h1>Detective Engine</h1>
        <span className="pill warn">Forensic Transaction Tracing</span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe 
          src="http://localhost:5174" 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          title="Detective Engine"
        />
      </div>
    </div>
  )
}
