import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../api'

export default function ForgotPassword() {
  const [u, setU] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await api.forgotPassword(u, email)
      // Pass the username to the reset page so they don't have to type it again
      nav('/reset-password', { state: { username: u } })
    } catch (e) { 
      setErr('Failed to request password reset. Please try again.') 
    }
    finally { setBusy(false) }
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
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Forgot Password</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Enter your Officer ID and Official Email to receive a secure OTP for password reset.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="auth-input-group">
              <label>Officer ID</label>
              <input type="text" value={u} onChange={e=>setU(e.target.value)} required autoFocus placeholder="e.g., inspector" />
            </div>
            
            <div className="auth-input-group">
              <label>Official Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="officer@abhedya.gov.in" />
            </div>
            
            {err && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--bad)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{err}</div>}
            
            <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: '10px' }}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {busy ? 'Verifying...' : 'Send Secure OTP'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={16} /> Back to Secure Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
