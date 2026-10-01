import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, setAuth } from '../api'
import { Shield, Brain, Target, Network, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLang } from '../i18n.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

export default function Login() {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [remember, setRemember] = useState(true)
  const nav = useNavigate()
  const { t } = useLang()

  useEffect(() => {
    const handleKeyUp = (e) => {
      setCapsOn(e.getModifierState ? e.getModifierState('CapsLock') : false)
    }
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('keydown', handleKeyUp)
    return () => {
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('keydown', handleKeyUp)
    }
  }, [])

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await api.login(u, p)
      setAuth(r.access_token, r.user)
      if (r.user.must_change_password) {
        nav('/first-login')
      } else {
        nav('/')
      }
    } catch (e) {
      setErr(t.invalidCreds)
    } finally { setBusy(false) }
  }

  const fill = (user) => {
    setU(user)
    setP('')
    if (user === 'admin') setP('admin123')
    if (user === 'inspector') setP('inspector123')
    if (user === 'analyst') setP('analyst123')
    if (user === 'viewer') setP('viewer123')
    setErr('')
  }

  return (
    <div className="auth-container">
      {/* ── Left decorative panel ── */}
      <div className="auth-left">
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow" />
        <div className="auth-content">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Logo header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
              <img
                src="/abhedya_emblem.png"
                alt="Voidhack Government Emblem"
                style={{ height: 80, width: 'auto', filter: 'brightness(1.1) drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
              />
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '0.5px', color: '#fff', lineHeight: 1.1 }}>
                  Abhedya-Chakra AI
                </h1>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', fontWeight: 600, marginTop: 4 }}>
                  Abhedya-Chakra
                </div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', marginTop: 2 }}>
                  Intelligent Investigation Platform
                </div>
              </div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '1.5rem 0' }} />

            <ul className="auth-feature-list">
              <li className="auth-feature-item"><Brain size={22} color="rgba(255,255,255,0.9)" /> {t.feat1}</li>
              <li className="auth-feature-item"><Target size={22} color="rgba(255,255,255,0.9)" /> {t.feat2}</li>
              <li className="auth-feature-item"><Network size={22} color="rgba(255,255,255,0.9)" /> {t.feat3}</li>
              <li className="auth-feature-item"><Shield size={22} color="rgba(255,255,255,0.9)" /> {t.feat4}</li>
            </ul>

            <div style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              {t.trustedBy}
            </div>

            <div className="auth-stats">
              <div className="auth-stat-box">
                <span className="auth-stat-val">{t.stat1}</span>
                <span className="auth-stat-label">{t.stat1Label}</span>
              </div>
              <div className="auth-stat-box">
                <span className="auth-stat-val">{t.stat2}</span>
                <span className="auth-stat-label">{t.stat2Label}</span>
              </div>
              <div className="auth-stat-box">
                <span className="auth-stat-val">{t.stat3}</span>
                <span className="auth-stat-label">{t.stat3Label}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="auth-right">
        <motion.div
          className="auth-glass-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Language switcher at top of form */}
          <LanguageSwitcher />

          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <img
              src="/abhedya_emblem.png"
              alt="Abhedya-Chakra Police"
              style={{ height: 52, width: 'auto', marginBottom: 12 }}
            />
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>
              {t.officerLogin}
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              {t.authorizedOnly}
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="auth-input-group">
              <label>{t.officerId}</label>
              <input
                type="text" value={u}
                onChange={e => setU(e.target.value)}
                required autoFocus
                autoComplete="off"
                placeholder="e.g. admin"
              />
            </div>

            <div className="auth-input-group" style={{ position: 'relative' }}>
              <label>{t.password}</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={p} onChange={e => setP(e.target.value)}
                required autoComplete="new-password"
                placeholder="••••••••"
              />
              <div className="auth-input-icon" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </div>
              {capsOn && (
                <div style={{ color: 'var(--warn)', fontSize: '0.75rem', marginTop: 4, fontWeight: 500 }}>
                  ⚠ {t.capsLock}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--muted2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 'auto' }} />
                {t.rememberMe}
              </label>
              <Link to="/forgot-password" className="auth-link">{t.forgotPassword}</Link>
            </div>

            {err && (
              <div style={{
                background: '#FEF2F2', color: '#DC2626',
                padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem',
                border: '1px solid #FECACA', textAlign: 'center', fontWeight: 500
              }}>{err}</div>
            )}

            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              {busy ? t.signingIn : t.signIn}
            </button>
          </form>

          <hr style={{ borderColor: 'var(--line)', margin: '0.75rem 0' }} />

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--muted)' }}>
              {t.demoAccounts}
            </p>
            <div className="demo-pills">
              <div className="demo-pill" onClick={() => fill('admin')}>Admin</div>
              <div className="demo-pill" onClick={() => fill('inspector')}>Inspector</div>
              <div className="demo-pill" onClick={() => fill('analyst')}>Analyst</div>
              <div className="demo-pill" onClick={() => fill('viewer')}>Viewer</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Account creation is managed by Abhedya-Chakra Administrators.<br />
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                Contact your System Administrator for access.
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
