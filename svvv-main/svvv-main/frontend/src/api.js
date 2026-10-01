const TOKEN_KEY = 'abhedya_token'
const USER_KEY = 'abhedya_user'

export function getToken(){ return localStorage.getItem(TOKEN_KEY) }
export function getUser(){ try{return JSON.parse(localStorage.getItem(USER_KEY))}catch{return null} }
export function setAuth(token, user){
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
export function clearAuth(){ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) }

const BASE_URL = '';

async function req(path, opts={}){
  const headers = opts.headers || {}
  const t = getToken()
  if(t) headers['Authorization'] = `Bearer ${t}`
  if(opts.json){ headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); delete opts.json }
  const r = await fetch(BASE_URL + path, {...opts, headers})
  if(r.status === 401){ clearAuth(); window.location.href = '/login' }
  if(!r.ok){
    const txt = await r.text()
    throw new Error(`${r.status}: ${txt}`)
  }
  const ct = r.headers.get('content-type')||''
  return ct.includes('json') ? r.json() : r.blob()
}

export async function downloadAuthed(path, filename){
  const r = await fetch(BASE_URL + path, {headers:{'Authorization':`Bearer ${getToken()}`}})
  if(!r.ok){ throw new Error(`download failed: ${r.status}`) }
  const b = await r.blob()
  const u = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = u; a.download = filename; a.click()
  URL.revokeObjectURL(u)
}

export const api = {
  login: async (username, password) => {
    const fd = new FormData(); fd.append('username',username); fd.append('password',password)
    const r = await fetch(BASE_URL + '/api/auth/login', {method:'POST', body: fd})
    if(!r.ok) throw new Error('Invalid credentials')
    return r.json()
  },
  forgotPassword: (username, email) => req('/api/auth/forgot-password', {method:'POST', json:{username, email}}),
  resetPassword: (username, otp, new_password) => req('/api/auth/reset-password', {method:'POST', json:{username, otp, new_password}}),
  changePassword: (old_password, new_password) => req('/api/auth/change-password', {method:'POST', json:{old_password, new_password}}),
  stats: () => req('/api/meta/stats'),
  districts: () => req('/api/meta/districts'),
  stations: (district_id) => req(`/api/meta/stations${district_id?`?district_id=${district_id}`:''}`),
  crimeTypes: () => req('/api/meta/crime-types'),
  districtIntensity: (months=12) => req(`/api/meta/districts/crime-intensity?months=${months}`),

  chat: (message, session_id, language='en', multi_agent=false) =>
    req('/api/chat', {method:'POST', json:{message, session_id, language, multi_agent}}),
  listSessions: () => req('/api/chat/sessions'),
  getSession: (id) => req(`/api/chat/sessions/${id}`),
  pdfUrl: (id) => `/api/chat/sessions/${id}/pdf`,

  trends: (months=24, crime_type) => req(`/api/trends?months=${months}${crime_type?`&crime_type=${encodeURIComponent(crime_type)}`:''}`),
  hotspots: (months=12, crime_type) => req(`/api/hotspots?months=${months}${crime_type?`&crime_type=${encodeURIComponent(crime_type)}`:''}`),
  hotspotsTimeline: (months=36, crime_type) => req(`/api/hotspots/timeline?months=${months}${crime_type?`&crime_type=${encodeURIComponent(crime_type)}`:''}`),
  network: (params={}) => {
    const q = new URLSearchParams(params).toString()
    return req(`/api/network${q?'?'+q:''}`)
  },
  predict: () => req('/api/predict'),
  predictStream: () => req('/api/predict/stream'),

  detective: (narrative, crime_type, district_id) =>
    req('/api/detective/investigate', {method:'POST', json:{narrative, crime_type, district_id}}),

  vision: async (file) => {
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch(BASE_URL + '/api/vision/analyze', {method:'POST',
      headers:{'Authorization':`Bearer ${getToken()}`}, body: fd})
    if(!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
    return r.json()
  },

  persons: (q, district_id) => {
    const p = new URLSearchParams()
    if(q) p.set('q', q)
    if(district_id) p.set('district_id', district_id)
    return req(`/api/persons?${p.toString()}`)
  },
  caseFileUrl: (id) => `/api/persons/${id}/case-file`,

  patrolRoute: (params={}) => {
    const q = new URLSearchParams(params).toString()
    return req(`/api/patrol/route?${q}`)
  },
  whatif: (payload) => req('/api/whatif', {method:'POST', json: payload}),

  audit: () => req('/api/audit'),
  auditVerify: () => req('/api/audit/verify'),
}
