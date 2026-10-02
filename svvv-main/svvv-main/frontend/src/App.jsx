import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getToken, getUser, clearAuth, api } from './api'
import { LayoutDashboard, MessageCircle, Search, Camera, Database, Compass, TrendingUp, Network as NetworkIcon, BellRing, Route as RouteIcon, FlaskConical, Mic, ShieldCheck, Menu, X } from 'lucide-react'
import { useLang } from './i18n.jsx'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import FirstLogin from './pages/FirstLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Chat from './pages/Chat.jsx'
import Hotspots from './pages/Hotspots.jsx'
import Trends from './pages/Trends.jsx'
import Network from './pages/Network.jsx'
import Predict from './pages/Predict.jsx'
import Audit from './pages/Audit.jsx'
import Detective from './pages/Detective.jsx'
import Vision from './pages/Vision.jsx'
import Patrol from './pages/Patrol.jsx'
import PatrolRoute from './pages/PatrolRoute.jsx'
import AlertsToaster from './components/AlertsToaster.jsx'

function Shell({ children }) {
  const u = getUser()
  const nav = useNavigate()
  const location = useLocation()
  const { t } = useLang()

  const [stats, setStats] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])
  useEffect(() => { api.stats().then(setStats).catch(() => {}) }, [])

  const logout = () => { clearAuth(); nav('/login') }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg(t.updating)
    try {
      await api.changePassword(oldPassword, newPassword)
      setPasswordMsg('Password changed successfully!')
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordMsg(''); setOldPassword(''); setNewPassword('')
      }, 2000)
    } catch (err) {
      setPasswordMsg('Failed: ' + (err.message || 'Incorrect old password'))
    }
  }

  const canAudit = u && u.role === 'admin'

  const navItems = [
    { to: '/', end: true, icon: LayoutDashboard, label: t.dashboard },
    { to: '/vision', icon: Database, label: 'Data Ingestion' },
    { to: '/detective', icon: Search, label: t.detective },
    { to: '/hotspots', icon: Compass, label: t.hotspots },
    { to: '/trends', icon: TrendingUp, label: t.trends },
    { to: '/network', icon: NetworkIcon, label: t.network },
    { to: '/chat', icon: MessageCircle, label: t.chat },
    { to: '/predict', icon: BellRing, label: t.alerts },
    { to: '/patrol-route', icon: RouteIcon, label: t.patrolRoute },
    { to: '/patrol', icon: Mic, label: t.patrol },
    ...(canAudit ? [{ to: '/audit', icon: ShieldCheck, label: t.audit }] : []),
  ]

  return (
    <div className="app">
      {/* Hamburger — mobile only */}
      <button
        className="hamburger"
        aria-label="Open navigation"
        onClick={() => setSidebarOpen(o => !o)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo / Brand */}
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/abhedya_emblem.png" alt="Abhedya Logo" style={{ height: 40, width: 'auto', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: 'var(--text)' }}>
                {t.brandName}
              </div>
              <div style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 10, lineHeight: 1.4 }}>
                {t.brandSub}
              </div>
            </div>
          </div>
        </div>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Navigation */}
        <nav className="nav">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={17} style={{ marginRight: 9, flexShrink: 0 }} /> {label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="user-card">
          <div style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11 }}>{t.goodMorning},</div>
          <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, marginBottom: 8, marginTop: 2 }}>
            {u?.full_name || u?.username}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '3px 6px', fontSize: 11 }}>
            <span style={{ color: 'var(--muted)' }}>{t.role}</span>
            <span style={{ fontWeight: 600 }}>{u?.role}</span>
            <span style={{ color: 'var(--muted)' }}>{t.station}</span>
            <span>Bengaluru Central</span>
            <span style={{ color: 'var(--muted)' }}>{t.lastLogin}</span>
            <span>{u?.last_login ? new Date(u.last_login + 'Z').toLocaleDateString() : 'Today'}</span>
          </div>
          {stats && (
            <div style={{ marginTop: 8, fontSize: 11 }}>
              <span style={{ color: 'var(--muted)' }}>{t.provider}: </span>
              <span className="pill ok">{stats.provider}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button style={{ flex: 1, fontSize: 11, padding: '6px 4px' }} onClick={() => setShowPasswordModal(true)}>
              {t.changePassword}
            </button>
            <button style={{ flex: 1, fontSize: 11, padding: '6px 4px' }} className="danger" onClick={logout}>
              {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Password change modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16
        }}>
          <form
            onSubmit={handleChangePassword}
            style={{
              background: 'var(--panel2)', border: '1px solid var(--line)',
              padding: 24, borderRadius: 14, width: 320,
              display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 16 }}>{t.changePasswordTitle}</h3>
            <div className="auth-input-group">
              <label>{t.oldPassword}</label>
              <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            </div>
            <div className="auth-input-group">
              <label>{t.newPassword}</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            {passwordMsg && (
              <div style={{ fontSize: 13, color: passwordMsg.includes('success') ? 'var(--ai)' : 'var(--bad)', fontWeight: 500 }}>
                {passwordMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary" style={{ flex: 1 }}>{t.submit}</button>
              <button type="button" onClick={() => { setShowPasswordModal(false); setPasswordMsg('') }} style={{ flex: 1 }}>
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <main className="main">
        {children}
        <AlertsToaster />
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav-inner">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={20} />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Private({ children }) {
  const t = getToken()
  const loc = useLocation()
  const u = getUser()
  if (!t) return <Navigate to="/login" state={{ from: loc }} replace />
  if (u?.must_change_password) return <Navigate to="/first-login" replace />
  return <Shell>{children}</Shell>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/first-login" element={<FirstLogin />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/chat" element={<Private><Chat /></Private>} />
      <Route path="/detective" element={<Private><Detective /></Private>} />
      <Route path="/vision" element={<Private><Vision /></Private>} />
      <Route path="/hotspots" element={<Private><Hotspots /></Private>} />
      <Route path="/trends" element={<Private><Trends /></Private>} />
      <Route path="/network" element={<Private><Network /></Private>} />
      <Route path="/predict" element={<Private><Predict /></Private>} />
      <Route path="/patrol-route" element={<Private><PatrolRoute /></Private>} />
      <Route path="/patrol" element={<Private><Patrol /></Private>} />
      <Route path="/audit" element={<Private><Audit /></Private>} />
    </Routes>
  )
}
