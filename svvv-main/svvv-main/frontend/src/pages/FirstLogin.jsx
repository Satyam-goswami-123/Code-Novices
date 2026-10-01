import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, CheckCircle2, Lock, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, getUser, clearAuth } from '../api'

export default function FirstLogin() {
  const nav = useNavigate()
  const u = getUser()
  
  const [old, setOld] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  // If user somehow gets here without must_change_password
  if (!u) {
    nav('/login'); return null;
  }

  const reqs = {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /[0-9]/.test(p),
    special: /[^A-Za-z0-9]/.test(p)
  }
  const allMet = Object.values(reqs).every(Boolean)

  const submit = async e => {
    e.preventDefault(); setErr(''); 
    if (!allMet) {
      setErr('Please meet all password requirements.'); return;
    }
    setBusy(true)
    try {
      await api.changePassword(old, p)
      setSuccess(true)
      // Update local storage user object
      const updatedUser = { ...u, must_change_password: false }
      localStorage.setItem('abhedya_user', JSON.stringify(updatedUser))
    } catch (e) { 
      setErr(e.message || 'Failed to update password. Temporary password may be incorrect.') 
    }
    finally { setBusy(false) }
  }

  const logout = () => {
    clearAuth()
    nav('/login')
  }

  if (success) {
    return (
      <div className="auth-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <motion.div className="auth-glass-card" style={{ textAlign: 'center' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle2 size={64} color="var(--ai)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ margin: 0 }}>Security Confirmation</h2>
          <p style={{ color: 'var(--muted)', marginTop: '8px' }}>Your credentials have been securely updated.</p>
          <button className="btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => nav('/')}>
            Proceed to Dashboard <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-bg-grid"></div>
        <div className="auth-bg-glow"></div>
      </div>
      
      <div className="auth-right">
        <motion.div className="auth-glass-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/abhedya_emblem.png" alt="Abhedya Logo" style={{ height: 50, width: 'auto', margin: '0 auto 15px', display: 'block' }} />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Action Required</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              For security purposes, you must change your temporary password before accessing the platform.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="auth-input-group">
              <label>Temporary Password</label>
              <input type="password" value={old} onChange={e=>setOld(e.target.value)} required autoFocus />
            </div>

            <div className="auth-input-group">
              <label>New Secure Password</label>
              <input type="password" value={p} onChange={e=>setP(e.target.value)} required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
              <div className={`pw-req ${reqs.length ? 'met' : ''}`}>
                <CheckCircle2 size={14} /> 8 Characters
              </div>
              <div className={`pw-req ${reqs.upper && reqs.lower ? 'met' : ''}`}>
                <CheckCircle2 size={14} /> Upper & Lowercase
              </div>
              <div className={`pw-req ${reqs.number ? 'met' : ''}`}>
                <CheckCircle2 size={14} /> Number
              </div>
              <div className={`pw-req ${reqs.special ? 'met' : ''}`}>
                <CheckCircle2 size={14} /> Special Character
              </div>
            </div>
            
            {err && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--bad)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', marginTop: '8px' }}>{err}</div>}
            
            <button type="submit" className="btn-primary" disabled={busy || !allMet} style={{ marginTop: '10px' }}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              {busy ? 'Updating...' : 'Update & Continue'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button type="button" onClick={logout} className="auth-link">Logout</button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
