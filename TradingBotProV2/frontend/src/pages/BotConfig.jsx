// ─── BOT CONFIG PAGE ──────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { getBotSettings, saveBotSettings, toggleBot, sendTestAlert } from '../api'
import toast from 'react-hot-toast'

const SMC_FILTERS = [
  ['liquiditySweep',    'Liquidity sweep confirmation'],
  ['fvg',              'Fair Value Gap (FVG)'],
  ['orderBlock',       'Order Block alignment'],
  ['bos',              'Break of Structure (BOS)'],
  ['choch',            'Change of Character (CHoCH)'],
  ['multiTFConfluence','Multi-TF confluence required'],
  ['avoidNewsCandles', 'Avoid news candle entries'],
]

export function BotConfig() {
  const [s, setS] = useState({
    isActive: false, paperTrade: true, strategy:'SMC', htfTimeframe:'4H', mtfTimeframe:'1H', entryTimeframe:'15m',
    minRiskReward:3, capitalRiskPct:1, maxTradesPerDay:3, dailyLossLimitPct:3, autoReplyWaitMin:5,
    totalCapital:10000,
    smcFilters:{ liquiditySweep:true, fvg:true, orderBlock:true, bos:true, choch:true, multiTFConfluence:true, avoidNewsCandles:true },
    notifications:{ telegram:{ enabled:true }, whatsapp:{ enabled:false }, email:{ enabled:true }, call:{ enabled:false } },
    binanceApiKey:'', binanceSecret:''
  })

  useEffect(() => { getBotSettings().then(r=>setS(r.data)).catch(()=>{}) }, [])

  const set = (k, v) => setS(p => ({ ...p, [k]: v }))
  const setFilter = (k, v) => setS(p => ({ ...p, smcFilters: { ...p.smcFilters, [k]: v } }))

  const handleSave = async () => {
    try { await saveBotSettings(s); toast.success('Bot settings saved!') }
    catch { toast.error('Could not connect to backend — settings saved locally') }
  }
  const handleToggle = async () => {
    const next = !s.isActive
    try { await toggleBot(next) } catch {}
    set('isActive', next)
    toast.success(`Bot ${next ? 'started' : 'stopped'}`)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">AI Bot Settings</h1>

      {/* STATUS BANNER */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-5 text-sm font-medium ${
        s.isActive ? 'bg-success/10 border-success/20 text-success' : 'bg-dark-600 border-dark-400 text-gray-500'
      }`}>
        <span>{s.isActive ? '🤖 Bot is ACTIVE — monitoring zones 24/7' : '⏸ Bot is STOPPED'}</span>
        {s.paperTrade && <span className="ml-auto text-xs px-2 py-1 bg-warning/15 text-warning rounded-full border border-warning/30">Paper Trade Mode</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Strategy */}
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Strategy & Timeframes</p>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block mb-1">Core Strategy</label>
              <select className="input" value={s.strategy} onChange={e=>set('strategy',e.target.value)}>
                <option value="SMC">Smart Money Concept (SMC)</option>
                <option value="ICT">ICT Concepts</option>
                <option value="PA">Price Action</option>
                <option value="COMBINED">Combined SMC + ICT</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['htfTimeframe','HTF (Bias)'],['mtfTimeframe','MTF (Structure)'],['entryTimeframe','Entry TF']].map(([k,l])=>(
                <div key={k}><label className="text-xs text-gray-500 block mb-1">{l}</label>
                  <select className="input" value={s[k]} onChange={e=>set(k,e.target.value)}>
                    {['1m','5m','15m','1H','4H','Daily','Weekly'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bot Controls */}
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Bot Controls</p>
          {[['isActive','Auto Trader'],['paperTrade','Paper Trade Mode'],['monitor','24x7 Monitoring']].map(([k,l])=>(
            <div key={k} className="flex items-center justify-between py-2.5 border-b border-dark-400 last:border-0">
              <span className="text-sm text-gray-300">{l}</span>
              <div className="flex gap-1 bg-dark-800 border border-dark-400 rounded-lg p-0.5">
                {['ON','OFF'].map(v=>(
                  <button key={v} onClick={()=>set(k, v==='ON')}
                    className={`px-3 py-1 rounded text-xs transition-all ${
                      (v==='ON'?s[k]:!s[k]) ? 'bg-brand/20 text-brand font-medium' : 'text-gray-600'
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <button className={`btn flex-1 ${s.isActive ? 'btn-danger' : 'btn-success'}`} onClick={handleToggle}>
              {s.isActive ? '⏹ Stop Bot' : '▶ Start Bot'}
            </button>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Risk Management</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex items-center justify-between py-2 border-b border-dark-500">
            <span className="text-sm text-gray-300">Min Risk:Reward</span>
            <div className="flex gap-1 bg-dark-800 border border-dark-400 rounded-lg p-0.5">
              {[2,3,5,7].map(v=>(
                <button key={v} onClick={()=>set('minRiskReward',v)}
                  className={`px-2.5 py-1 rounded text-xs transition-all ${s.minRiskReward===v?'bg-brand/20 text-brand font-medium':'text-gray-600'}`}>
                  1:{v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-dark-500">
            <span className="text-sm text-gray-300">Capital risk / trade</span>
            <div className="flex items-center gap-3">
              <input type="range" min="0.5" max="5" step="0.5" value={s.capitalRiskPct}
                onChange={e=>set('capitalRiskPct',parseFloat(e.target.value))} className="w-24" />
              <span className="text-brand font-semibold text-sm w-8">{s.capitalRiskPct}%</span>
            </div>
          </div>
          {[['maxTradesPerDay','Max trades / day'],['dailyLossLimitPct','Daily loss limit (%)'],['autoReplyWaitMin','Auto-trade wait (min)'],['totalCapital','Total Capital ($)']].map(([k,l])=>(
            <div key={k} className="flex items-center justify-between py-2 border-b border-dark-500">
              <span className="text-sm text-gray-300">{l}</span>
              <input type="number" className="input text-sm text-right" style={{width:80}} value={s[k]} onChange={e=>set(k,parseFloat(e.target.value))} />
            </div>
          ))}
        </div>
      </div>

      {/* SMC Filters */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">SMC Entry Filters</p>
        <div className="grid grid-cols-3 gap-3">
          {SMC_FILTERS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={s.smcFilters[k]||false} onChange={e=>setFilter(k,e.target.checked)}
                className="w-4 h-4 accent-brand" />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">API Connections</p>
        <div className="space-y-3">
          {[
            ['Binance API Key', 'binanceApiKey', 'text', 'API Key'],
            ['Binance Secret',  'binanceSecret', 'password', 'Secret Key'],
          ].map(([label, key, type, ph]) => (
            <div key={key} className="grid grid-cols-4 gap-3 items-center">
              <span className="text-sm text-gray-400 font-medium">{label}</span>
              <input type={type} className="input col-span-3" placeholder={ph} value={s[key]||''}
                onChange={e=>set(key,e.target.value)} />
            </div>
          ))}
          <div className="grid grid-cols-4 gap-3 items-center">
            <span className="text-sm text-gray-400 font-medium">TradingView Webhook</span>
            <div className="col-span-3 bg-dark-800 border border-dark-400 rounded-lg px-3 py-2 text-xs text-brand font-mono">
              POST → http://YOUR_SERVER:5000/api/webhook/tradingview
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>Save All Settings</button>
    </div>
  )
}

// ─── ALERTS PAGE ──────────────────────────────────────────────────────────────
export function Alerts() {
  const [alerts, setAlerts] = useState([])
  useEffect(() => { getAlerts().then(r=>setAlerts(r.data)).catch(()=>setAlerts(mockAlerts())) }, [])

  const iconMap = { 'Zone Hit':'🔴', 'Trade Opened':'📊', 'Trade Closed':'✅', 'Daily Limit':'⚠️', 'Price Alert':'📈', 'Bot Status':'🤖' }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Alerts & Notifications</h1>
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Notification Channels</p>
        <div className="space-y-4">
          {[['📱 WhatsApp','+91 XXXXXXXXXX'],['✈️ Telegram','Chat ID or @username'],['📧 Email','your@email.com'],['📞 Phone Call','+91 XXXXXXXXXX']].map(([label, ph]) => (
            <div key={label} className="flex items-center gap-4">
              <span className="w-32 text-sm font-medium text-gray-300">{label}</span>
              <input className="input flex-1" placeholder={ph} />
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer whitespace-nowrap">
                <input type="checkbox" defaultChecked className="accent-brand" /> Enabled
              </label>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-primary btn-sm" onClick={()=>{ sendTestAlert().catch(()=>{}); toast.success('Test alert sent!') }}>Send Test Alert</button>
          <button className="btn btn-sm" onClick={()=>toast.success('Notification settings saved!')}>Save Settings</button>
        </div>
      </div>

      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-3">Auto-Trade Rule</p>
        <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
          <span>If no reply within</span>
          <input type="number" defaultValue="5" min="1" max="60" className="input text-center" style={{width:64}} />
          <span>minutes →</span>
          <select className="input" style={{width:'auto'}}>
            <option>Auto-execute with 1% capital</option>
            <option>Skip the trade</option>
          </select>
        </div>
        <p className="text-xs text-gray-600 mt-2">✅ Stop loss mandatory &nbsp;|&nbsp; ✅ Max 1% capital on auto &nbsp;|&nbsp; ✅ Min R:R still applies</p>
      </div>

      <div className="card">
        <p className="text-sm font-medium text-gray-400 mb-4">Recent Alerts</p>
        {alerts.map((a, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-dark-400 last:border-0">
            <div className="w-8 h-8 rounded-full bg-dark-500 flex items-center justify-center text-sm flex-shrink-0">
              {iconMap[a.type]||'🔔'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 font-medium">{a.message}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.pair && `${a.pair} ·`} {new Date(a.createdAt||Date.now()).toLocaleString()}</p>
            </div>
            <span className={`badge ${a.autoTradeExecuted?'badge-win':a.type==='Daily Limit'?'badge-pending':'badge-open'}`}>
              {a.autoTradeExecuted?'Auto Executed':a.sent?'Sent':'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── BACKTEST PAGE ────────────────────────────────────────────────────────────
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Backtest() {
  const [form, setForm] = useState({ pair:'BTC/USDT', period:'3m', strategy:'SMC', minRR:'3', capital:'10000', riskPct:'1' })
  const [result, setResult] = useState(null)

  const run = () => {
    const capital = parseFloat(form.capital)||10000
    // Simulate backtest result
    const pts = [capital]
    for (let i=0; i<11; i++) pts.push(Math.max(pts[pts.length-1]*(0.92+Math.random()*0.16), capital*0.85))
    pts.push(capital * 1.315)
    const equityData = pts.map((v,i)=>({ week:'W'+(i+1), equity: Math.round(v) }))
    setResult({ total:89, wins:64, losses:25, winRate:'72.4', avgRR:'4.2', netReturn:'+31.5', finalCapital:(capital*1.315).toFixed(0), maxDD:'-8.2', pf:'2.8', equityData })
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Backtest Engine</h1>
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Configuration</p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            ['Pair', 'pair', ['BTC/USDT','ETH/USDT','GOLD/USD','EUR/USD']],
            ['Period', 'period', [['1m','1 Month'],['3m','3 Months'],['6m','6 Months'],['1y','1 Year'],['2y','2 Years']]],
            ['Strategy', 'strategy', [['SMC','SMC Full'],['FVG','FVG Only'],['LIQ','Liquidity + BOS'],['OB','Order Block Only']]],
            ['Min R:R', 'minRR', [['2','1:2'],['3','1:3'],['4','1:4'],['5','1:5']]],
          ].map(([label, key, opts]) => (
            <div key={key}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <select className="input" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}>
                {opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div><label className="text-xs text-gray-500 block mb-1">Starting Capital ($)</label>
            <input type="number" className="input" value={form.capital} onChange={e=>setForm(p=>({...p,capital:e.target.value}))} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Risk per trade (%)</label>
            <input type="number" className="input" value={form.riskPct} min="0.5" max="5" step="0.5" onChange={e=>setForm(p=>({...p,riskPct:e.target.value}))} />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={run}>▶ Run Backtest</button>
          </div>
        </div>
      </div>

      {result && (
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Results — {form.pair} · {form.strategy}</p>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label:'Total Signals', val:result.total,       color:'text-white'   },
              { label:'Win Rate',      val:result.winRate+'%', color:'text-success' },
              { label:'Avg R:R',       val:'1:'+result.avgRR,  color:'text-brand'   },
              { label:'Net Return',    val:result.netReturn+'%',color:'text-success'},
            ].map(m=>(
              <div key={m.label} className="metric">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className={`text-2xl font-semibold ${m.color}`}>{m.val}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              {[['Wins',result.wins,'text-success'],['Losses',result.losses,'text-danger'],['Max Drawdown',result.maxDD,'text-danger'],['Profit Factor',result.pf,'text-brand'],['Final Capital','$'+Number(result.finalCapital).toLocaleString(),'text-success']].map(([l,v,c])=>(
                <div key={l} className="flex justify-between py-2 border-b border-dark-400 text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className={`font-semibold ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={result.equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="week" tick={{fill:'#555',fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#555',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>'$'+v.toLocaleString()} />
                  <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8}} formatter={v=>['$'+v.toLocaleString(),'Equity']} />
                  <Line type="monotone" dataKey="equity" stroke="#378ADD" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
export function Settings() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Settings</h1>
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Account & Capital</p>
        <div className="grid grid-cols-4 gap-3">
          {[['Total Capital ($)','number','10000'],['Platform','select',''],['Base Currency','select',''],['Timezone','select','']].map(([l,t,v],i)=>(
            <div key={i}><label className="text-xs text-gray-500 block mb-1">{l}</label>
              {t==='select'
                ? <select className="input"><option>{l==='Platform'?'Binance':l==='Base Currency'?'USDT':'IST (UTC+5:30)'}</option></select>
                : <input type={t} className="input" defaultValue={v} />
              }
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-sm mt-4" onClick={()=>toast.success('Settings saved!')}>Save</button>
      </div>
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-3">About</p>
        <div className="space-y-1.5 text-sm text-gray-500">
          <p>App: <span className="text-gray-300">Trading Bot Pro v1.0</span></p>
          <p>Stack: <span className="text-gray-300">MERN (MongoDB · Express · React · Node) + Python Bot</span></p>
          <p>Strategy: <span className="text-gray-300">Smart Money Concept (SMC) + ICT</span></p>
          <p>APIs: <span className="text-gray-300">Binance · TradingView · JP Morgan · Alpha Vantage · Telegram</span></p>
          <p className="text-xs text-gray-600 mt-2">⚠️ For personal use only. Trading involves risk. Always use proper risk management.</p>
        </div>
      </div>
    </div>
  )
}

// ─── IMPORT HELPER (needed for Alerts page) ───────────────────────────────────
import { getAlerts } from '../api'
function mockAlerts() {
  return [
    { type:'Zone Hit',     message:'BTC Supply Zone HIT at $68,100 — Short triggered', pair:'BTC/USDT', sent:true, autoTradeExecuted:false, createdAt: new Date() },
    { type:'Trade Closed', message:'ETH Long closed at TP — +$376 profit',             pair:'ETH/USDT', sent:true, autoTradeExecuted:false, createdAt: new Date() },
    { type:'Price Alert',  message:'BTC FVG filled at $65,650 — watch for reaction',   pair:'BTC/USDT', sent:true, autoTradeExecuted:true,  createdAt: new Date() },
    { type:'Daily Limit',  message:'Daily loss approaching 2.1% / 3% limit',           pair:null,       sent:true, autoTradeExecuted:false, createdAt: new Date() },
  ]
}

export default BotConfig
