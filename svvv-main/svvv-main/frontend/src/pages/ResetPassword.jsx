import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Shield, CheckCircle2, Lock, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../api'

export default function ResetPassword() {
  const loc = useLocation()
  const nav = useNavigate()
  
  const [u, setU] = useState(loc.state?.username || '')
  const [otp, setOtp] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

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
      await api.resetPassword(u, otp, p)
      setSuccess(true)
      setTimeout(() => nav('/login'), 2500)
    } catch (e) { 
      setErr(e.message || 'Failed to reset password. OTP may be invalid or expired.') 
    }
    finally { setBusy(false) }
  }

  if (success) {
    return (
      <div className="auth-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <motion.div className="auth-glass-card" style={{ textAlign: 'center' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle2 size={64} color="var(--ai)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ margin: 0 }}>Password Reset Successful</h2>
          <p style={{ color: 'var(--muted)', marginTop: '8px' }}>Your new secure credentials have been saved.</p>
          <p style={{ color: 'var(--accent)', marginTop: '16px', fontSize: '0.9rem' }}>Redirecting to Secure Sign In...</p>
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
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Create New Password</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Please enter the OTP sent to your official email and a strong new password.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!loc.state?.username && (
              <div className="auth-input-group">
                <label>Officer ID</label>
                <input type="text" value={u} onChange={e=>setU(e.target.value)} required />
              </div>
            )}
            
            <div className="auth-input-group">
              <label>6-Digit OTP</label>
              <input type="text" value={otp} onChange={e=>setOtp(e.target.value)} required placeholder="••••••" maxLength={6} style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }} />
            </div>

            <div className="auth-input-group">
              <label>New Password</label>
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
              {busy ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/login" className="auth-link">Cancel</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
