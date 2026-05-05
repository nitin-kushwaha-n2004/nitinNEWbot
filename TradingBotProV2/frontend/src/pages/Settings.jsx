import { useState, useEffect } from 'react'
import { getBotSettings, saveBotSettings } from '../api'
import toast from 'react-hot-toast'

const PLATFORMS = ['Delta Exchange', 'Binance', 'Binance Futures', 'Paper Trade Only']
const CURRENCIES = ['USDT', 'USD', 'USDC', 'INR']
const TIMEZONES  = ['IST (UTC+5:30)', 'UTC', 'EST (UTC-5)', 'GMT (UTC+0)', 'SGT (UTC+8)']

export default function Settings() {
  const [s, setS] = useState({
    totalCapital: 10000,
    platform: 'Delta Exchange',
    baseCurrency: 'USDT',
    timezone: 'IST (UTC+5:30)',
    deltaApiKey: '',
    deltaSecretKey: '',
    binanceApiKey: '',
    binanceSecret: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getBotSettings().then(r => setS(p => ({ ...p, ...r.data }))).catch(() => {})
  }, [])

  const set = (k, v) => setS(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    try {
      await saveBotSettings(s)
      setSaved(true)
      toast.success('Settings saved!')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Could not reach backend — check server')
    }
  }

  const isDelta   = s.platform === 'Delta Exchange'
  const isBinance = s.platform?.toLowerCase().includes('binance')

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Settings</h1>

      {/* ACCOUNT & CAPITAL */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Account & Capital</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Total Capital ($)</label>
            <input type="number" className="input" value={s.totalCapital}
              onChange={e => set('totalCapital', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Platform</label>
            <select className="input" value={s.platform} onChange={e => set('platform', e.target.value)}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Base Currency</label>
            <select className="input" value={s.baseCurrency} onChange={e => set('baseCurrency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Timezone</label>
            <select className="input" value={s.timezone} onChange={e => set('timezone', e.target.value)}>
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button className={`btn mt-4 ${saved ? 'btn-success' : 'btn-primary'}`} onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* DELTA EXCHANGE API */}
      {isDelta && (
        <div className="card mb-4">
          <p className="text-sm font-medium text-gray-400 mb-1">Delta Exchange API Keys</p>
          <p className="text-xs text-gray-600 mb-4">
            Get your keys from{' '}
            <a href="https://www.delta.exchange/app/account/api" target="_blank" rel="noreferrer"
              className="text-brand hover:underline">delta.exchange → API Management</a>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">API Key</label>
              <input className="input font-mono" placeholder="Enter Delta API Key"
                value={s.deltaApiKey || ''} onChange={e => set('deltaApiKey', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Secret Key</label>
              <input type="password" className="input font-mono" placeholder="Enter Delta Secret Key"
                value={s.deltaSecretKey || ''} onChange={e => set('deltaSecretKey', e.target.value)} />
            </div>
          </div>
          <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-xs text-warning">⚠️ Store API keys in the <code className="bg-dark-700 px-1 rounded">.env</code> file on your server, not here. These fields are for reference only.</p>
          </div>
        </div>
      )}

      {/* BINANCE API */}
      {isBinance && (
        <div className="card mb-4">
          <p className="text-sm font-medium text-gray-400 mb-1">Binance API Keys</p>
          <p className="text-xs text-gray-600 mb-4">
            Get from <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noreferrer"
              className="text-brand hover:underline">Binance → API Management</a>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">API Key</label>
              <input className="input font-mono" placeholder="Binance API Key"
                value={s.binanceApiKey || ''} onChange={e => set('binanceApiKey', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Secret Key</label>
              <input type="password" className="input font-mono" placeholder="Binance Secret"
                value={s.binanceSecret || ''} onChange={e => set('binanceSecret', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ABOUT */}
      <div className="card">
        <p className="text-sm font-medium text-gray-400 mb-3">About</p>
        <div className="space-y-1.5 text-sm">
          {[
            ['App',      'Trading Bot Pro v1.1'],
            ['Stack',    'MERN (MongoDB | Express | React | Node) + Python Bot'],
            ['Strategy', 'Smart Money Concept (SMC) + ICT'],
            ['APIs',     'Delta Exchange | TradingView | Telegram | Email Alerts'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-gray-500 w-20 flex-shrink-0">{k}:</span>
              <span className="text-gray-200">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">For personal use only. Trading involves risk. Always use proper risk management.</p>
      </div>
    </div>
  )
}
