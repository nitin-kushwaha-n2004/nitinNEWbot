import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ─── TRADES ──────────────────────────────────────────────────────────────────
export const getTrades    = (params) => api.get('/trades', { params })
export const addTrade     = (data)   => api.post('/trades', data)
export const updateTrade  = (id, data) => api.put(`/trades/${id}`, data)
export const deleteTrade  = (id)     => api.delete(`/trades/${id}`)
export const getTradeStats= ()       => api.get('/trades/stats/summary')

// ─── ZONES ───────────────────────────────────────────────────────────────────
export const getZones     = (params) => api.get('/zones', { params })
export const addZone      = (data)   => api.post('/zones', data)
export const updateZone   = (id, d)  => api.put(`/zones/${id}`, d)
export const deleteZone   = (id)     => api.delete(`/zones/${id}`)

// ─── BOT ─────────────────────────────────────────────────────────────────────
export const getBotSettings   = ()      => api.get('/bot/settings')
export const saveBotSettings  = (data)  => api.put('/bot/settings', data)
export const toggleBot        = (active)=> api.post('/bot/toggle', { active })
export const getDailyCheck    = ()      => api.get('/bot/daily-check')

// ─── ALERTS ──────────────────────────────────────────────────────────────────
export const getAlerts    = ()   => api.get('/alerts')
export const sendTestAlert= ()   => api.post('/alerts/test')

// ─── STATS ───────────────────────────────────────────────────────────────────
export const getDashStats = ()   => api.get('/stats/dashboard')

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const login        = (data) => api.post('/auth/login', data)
export const register     = (data) => api.post('/auth/register', data)

export default api

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
export const saveAlertSettings = (data) => api.put('/bot/settings', data)

// ─── PRICES ──────────────────────────────────────────────────────────────────
export const getLatestPrices  = ()     => api.get('/prices/latest')
