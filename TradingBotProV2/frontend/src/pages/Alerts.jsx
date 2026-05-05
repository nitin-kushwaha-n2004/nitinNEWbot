import { useState, useEffect } from 'react'
import { getAlerts, sendTestAlert, getBotSettings, saveBotSettings } from '../api'
import toast from 'react-hot-toast'

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([])
  const [settings, setSettings] = useState({
    notifications: {
      telegram: { enabled: false, chatId: '', botToken: '' },
      whatsapp:  { enabled: false, phone: '' },
      email:     { enabled: false, address: '' },
      call:      { enabled: false, phone: '' }
    },
    autoReplyWaitMin: 5,
    capitalRiskPct: 1
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAlerts().then(r => setAlerts(r.data)).catch(() => setAlerts(mockAlerts()))
    getBotSettings().then(r => setSettings(r.data)).catch(() => {})
  }, [])

  const setNotif = (channel, key, value) => {
    setSettings(p => ({
      ...p,
      notifications: {
        ...p.notifications,
        [channel]: { ...p.notifications[channel], [key]: value }
      }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try { await saveBotSettings(settings); toast.success('Notification settings saved!') }
    catch { toast.error('Could not reach backend') }
    setLoading(false)
  }

  const handleTest = async () => {
    try { await sendTestAlert(); toast.success('Test alert sent via Telegram!') }
    catch { toast.error('Could not send test alert — check Telegram config') }
  }

  const iconColor = (type) => {
    if (type === 'Zone Hit')     return 'text-warning bg-warning/10'
    if (type === 'Trade Opened') return 'text-success bg-success/10'
    if (type === 'Trade Closed') return 'text-brand bg-brand/10'
    if (type === 'Daily Limit')  return 'text-danger bg-danger/10'
    return 'text-gray-400 bg-dark-500'
  }

  const CHANNELS = [
    { key: 'telegram', label: 'Telegram',    icon: '✈️', placeholder: 'Chat ID or @username',  field: 'chatId',  ph2: 'Bot Token (optional)' },
    { key: 'whatsapp', label: 'WhatsApp',    icon: '💬', placeholder: '+91 XXXXXXXXXX',         field: 'phone' },
    { key: 'email',    label: 'Email',       icon: '📧', placeholder: 'your@email.com',          field: 'address' },
    { key: 'call',     label: 'Phone Call',  icon: '📞', placeholder: '+91 XXXXXXXXXX',         field: 'phone' },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Alerts & Notifications</h1>

      {/* NOTIFICATION CHANNELS */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Notification Channels</p>
        <div className="space-y-3">
          {CHANNELS.map(ch => (
            <div key={ch.key} className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg border border-dark-400">
              <span className="text-xl w-8 text-center">{ch.icon}</span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder={ch.placeholder}
                  value={settings.notifications?.[ch.key]?.[ch.field] || ''}
                  onChange={e => setNotif(ch.key, ch.field, e.target.value)}
                />
                {ch.ph2 && (
                  <input
                    className="input"
                    placeholder={ch.ph2}
                    value={settings.notifications?.[ch.key]?.botToken || ''}
                    onChange={e => setNotif(ch.key, 'botToken', e.target.value)}
                  />
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">Enabled</span>
                <input
                  type="checkbox"
                  checked={!!settings.notifications?.[ch.key]?.enabled}
                  onChange={e => setNotif(ch.key, 'enabled', e.target.checked)}
                  className="w-4 h-4 accent-brand rounded"
                />
              </label>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button className="btn" onClick={handleTest}>Send Test Alert</button>
        </div>
      </div>

      {/* AUTO-TRADE RULE */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-3">Auto-Trade Rule</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-400">If no reply within</span>
          <input
            type="number" min="1" max="60"
            className="input w-20 text-center"
            value={settings.autoReplyWaitMin || 5}
            onChange={e => setSettings(p => ({ ...p, autoReplyWaitMin: Number(e.target.value) }))}
          />
          <span className="text-sm text-gray-400">minutes then auto-execute with</span>
          <span className="text-brand font-semibold">{settings.capitalRiskPct || 1}% capital risk</span>
        </div>
        <p className="text-xs text-gray-600 mt-2">Stop loss mandatory | Max capital controlled by risk settings | Min R:R still applies</p>
      </div>

      {/* RECENT ALERTS */}
      <div className="card">
        <p className="text-sm font-medium text-gray-400 mb-4">Recent Alerts ({alerts.length})</p>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">No alerts yet. Add zones and start the bot to receive alerts.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg border border-dark-500">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${iconColor(a.type)}`}>
                  {a.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{a.message}</p>
                  <div className="flex gap-3 mt-1">
                    {a.pair  && <span className="text-xs text-gray-500">{a.pair}</span>}
                    {a.price && <span className="text-xs text-gray-500">${a.price?.toLocaleString()}</span>}
                    <span className="text-xs text-gray-600">
                      {new Date(a.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {(a.channels || []).map(c => (
                    <span key={c} className="text-xs bg-dark-500 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function mockAlerts() {
  return [
    { type:'Zone Hit',     message:'Supply Zone HIT on BTC/USDT at $68,100 | Direction: Short', pair:'BTC/USDT', price:68100, channels:['telegram'], createdAt: new Date(Date.now()-5*60000) },
    { type:'Trade Opened', message:'Paper trade opened: Short BTC/USDT @ $68,100 | SL: $68,450 | TP: $66,450 | R:R 1:4.2', pair:'BTC/USDT', price:68100, channels:['telegram','email'], createdAt: new Date(Date.now()-4*60000) },
    { type:'Zone Hit',     message:'Demand Zone HIT on ETH/USDT at $3,145 | Direction: Long', pair:'ETH/USDT', price:3145, channels:['telegram'], createdAt: new Date(Date.now()-2*60000) },
  ]
}
