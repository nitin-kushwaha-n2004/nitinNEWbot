import { useState, useEffect } from 'react'
import { getZones, addZone, deleteZone } from '../api'
import toast from 'react-hot-toast'

const ZONE_TYPES = ['Supply Zone','Demand Zone','Fair Value Gap','Resistance','Support','Liquidity Level','Order Block','Breaker Block']
const PAIRS      = ['BTC/USDT','ETH/USDT','EUR/USD','GOLD/USD','NIFTY 50','BANK NIFTY','SOL/USDT','BNB/USDT']
const TFS        = ['1m','5m','15m','1H','4H','Daily','Weekly']

const PINE_SCRIPT = `//@version=5
indicator("TradingBot Pro — SMC Zones", overlay=true, max_boxes_count=50)

// ─── ZONE INPUTS ─────────────────────────────────────────────────────────────
supply_top  = input.float(68200, "Supply Zone Top")
supply_bot  = input.float(67800, "Supply Zone Bottom")
demand_top  = input.float(3180,  "Demand Zone Top")
demand_bot  = input.float(3120,  "Demand Zone Bottom")
fvg_top     = input.float(65900, "FVG Top")
fvg_bot     = input.float(65400, "FVG Bottom")
liq_level   = input.float(66500, "Liquidity Level")
extend_bars = input.int(100,     "Extend bars", minval=10, maxval=500)

// ─── DRAW ZONES ───────────────────────────────────────────────────────────────
var box supply_box = na
var box demand_box = na
var box fvg_box    = na
var line liq_line  = na

if barstate.isfirst
    supply_box := box.new(bar_index, supply_top, bar_index+extend_bars, supply_bot,
         border_color=color.new(color.red,0), bgcolor=color.new(color.red,85),
         text="Supply Zone", text_color=color.red, text_size=size.small)
    demand_box := box.new(bar_index, demand_top, bar_index+extend_bars, demand_bot,
         border_color=color.new(color.green,0), bgcolor=color.new(color.green,85),
         text="Demand Zone", text_color=color.green, text_size=size.small)
    fvg_box := box.new(bar_index, fvg_top, bar_index+extend_bars, fvg_bot,
         border_color=color.new(color.blue,0), bgcolor=color.new(color.blue,85),
         text="FVG", text_color=color.blue, text_size=size.small)
    liq_line := line.new(bar_index, liq_level, bar_index+extend_bars, liq_level,
         color=color.yellow, style=line.style_dashed, width=2)

// ─── ALERTS ──────────────────────────────────────────────────────────────────
alertcondition(close >= supply_bot and close <= supply_top, "SUPPLY ZONE HIT",  "Supply Zone Hit — Consider SHORT")
alertcondition(close >= demand_bot and close <= demand_top, "DEMAND ZONE HIT",  "Demand Zone Hit — Consider LONG")
alertcondition(close >= fvg_bot    and close <= fvg_top,    "FVG HIT",           "Fair Value Gap Hit — Watch Reaction")
alertcondition(math.abs(close - liq_level)/liq_level < 0.002, "LIQUIDITY NEAR", "Liquidity Level Approaching")

// ─── WEBHOOK (paste your server URL in TradingView Alert → Webhook URL) ──────
// Webhook URL: http://YOUR_SERVER:5000/api/webhook/tradingview
// Webhook Body:
// {"secret":"YOUR_SECRET","pair":"{{ticker}}","type":"Zone Alert","price":"{{close}}","direction":"Short"}`

const dotColor = (type) => {
  if (type?.includes('Supply') || type?.includes('Resistance')) return 'bg-danger'
  if (type?.includes('FVG')) return 'bg-brand'
  if (type?.includes('Liquidity')) return 'bg-warning'
  if (type?.includes('Order') || type?.includes('Breaker')) return 'bg-purple-500'
  return 'bg-success'
}

export default function Zones() {
  const [zones, setZones] = useState([])
  const [form, setForm]   = useState({ type:'Supply Zone', pair:'BTC/USDT', timeframe:'4H', direction:'Short', autoTrade:'Alert + wait for approval', priceFrom:'', priceTo:'', notes:'' })
  const [showPine, setShowPine] = useState(false)

  useEffect(() => {
    getZones().then(r => setZones(r.data)).catch(() => setZones(mockZones()))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleAdd = async () => {
    if (!form.priceFrom || !form.priceTo) { toast.error('Enter price range'); return }
    try {
      const res = await addZone({ ...form, priceFrom: Number(form.priceFrom), priceTo: Number(form.priceTo) })
      setZones(p => [res.data, ...p])
      setForm(p => ({ ...p, priceFrom:'', priceTo:'', notes:'' }))
      toast.success('Zone added!')
    } catch {
      // Offline fallback
      setZones(p => [{ ...form, _id: Date.now(), priceFrom: Number(form.priceFrom), priceTo: Number(form.priceTo), status:'Active' }, ...p])
      toast.success('Zone added (offline mode)')
    }
  }

  const handleDelete = async (id) => {
    try { await deleteZone(id) } catch {}
    setZones(p => p.filter(z => z._id !== id))
    toast.success('Zone removed')
  }

  const copyPine = () => {
    navigator.clipboard.writeText(PINE_SCRIPT)
    toast.success('Pine Script copied! Paste in TradingView → Pine Editor')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Zone Manager</h1>

      {/* ADD ZONE FORM */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Add New Zone / Level</p>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Zone Type</label>
            <select className="input" value={form.type} onChange={e=>set('type',e.target.value)}>
              {ZONE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Pair</label>
            <select className="input" value={form.pair} onChange={e=>set('pair',e.target.value)}>
              {PAIRS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Timeframe</label>
            <select className="input" value={form.timeframe} onChange={e=>set('timeframe',e.target.value)}>
              {TFS.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Direction on Hit</label>
            <select className="input" value={form.direction} onChange={e=>set('direction',e.target.value)}>
              <option>Short</option><option>Long</option><option>Alert Only</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Price From</label>
            <input type="number" className="input" placeholder="e.g. 67800" value={form.priceFrom} onChange={e=>set('priceFrom',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Price To</label>
            <input type="number" className="input" placeholder="e.g. 68200" value={form.priceTo} onChange={e=>set('priceTo',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Auto Trade Setting</label>
            <select className="input" value={form.autoTrade} onChange={e=>set('autoTrade',e.target.value)}>
              <option>Alert + wait for approval</option>
              <option>Auto trade immediately</option>
              <option>Auto trade if no reply in 5 min</option>
              <option>Auto trade if no reply in 10 min</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Notes</label>
            <input className="input" placeholder="e.g. HTF liquidity sweep" value={form.notes} onChange={e=>set('notes',e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>+ Add Zone</button>
          <button className="btn btn-sm" onClick={()=>setForm(p=>({...p,priceFrom:'',priceTo:'',notes:''}))}>Clear</button>
        </div>
      </div>

      {/* ZONES LIST */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-400">Active Zones ({zones.length})</p>
          <button className="btn btn-sm btn-danger" onClick={()=>{ if(confirm('Remove all zones?')) setZones([]) }}>Clear All</button>
        </div>
        {zones.length === 0 && <p className="text-gray-600 text-sm py-4 text-center">No zones added yet.</p>}
        {zones.map(z => (
          <div key={z._id} className="flex items-center gap-3 py-3 border-b border-dark-400 last:border-0">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              z.type?.includes('Supply')||z.type?.includes('Resistance') ? 'bg-danger' :
              z.type?.includes('FVG') ? 'bg-brand' : z.type?.includes('Liquidity') ? 'bg-warning' : 'bg-success'
            }`}></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200">{z.type} · {z.pair} · {z.timeframe}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {Number(z.priceFrom).toLocaleString()} – {Number(z.priceTo).toLocaleString()} &nbsp;|&nbsp; {z.direction} &nbsp;|&nbsp; {z.autoTrade}
                {z.notes && <span> &nbsp;|&nbsp; {z.notes}</span>}
              </p>
            </div>
            <span className={`badge ${z.status==='Active'||!z.status?'badge-open':z.status==='Hit'?'badge-pending':'badge-win'}`}>{z.status||'Active'}</span>
            <button className="btn btn-sm btn-danger" onClick={()=>handleDelete(z._id)}>✕</button>
          </div>
        ))}
      </div>

      {/* PINE SCRIPT */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-400">TradingView Pine Script</p>
          <button className="btn btn-sm" onClick={()=>setShowPine(p=>!p)}>{showPine?'Hide':'Show'} Script</button>
        </div>
        {showPine && (
          <pre className="bg-dark-800 border border-dark-400 rounded-lg p-4 text-xs text-blue-300 font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap mb-3">
            {PINE_SCRIPT}
          </pre>
        )}
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={copyPine}>📋 Copy Pine Script</button>
          <a href="https://tradingview.com/chart/" target="_blank" rel="noreferrer" className="btn btn-sm">Open TradingView ↗</a>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Steps: 1) Paste script in TradingView Pine Editor → Add to chart &nbsp;|&nbsp;
          2) Create Alert → Webhook URL: <code className="text-brand">http://YOUR_SERVER:5000/api/webhook/tradingview</code>
        </p>
      </div>
    </div>
  )
}

function mockZones() {
  return [
    { _id:'z1', type:'Supply Zone',    pair:'BTC/USDT', timeframe:'4H',    priceFrom:67800, priceTo:68200, direction:'Short', autoTrade:'Auto trade if no reply in 5 min', status:'Active', notes:'HTF resistance' },
    { _id:'z2', type:'Demand Zone',    pair:'ETH/USDT', timeframe:'1H',    priceFrom:3120,  priceTo:3180,  direction:'Long',  autoTrade:'Alert + wait for approval', status:'Active', notes:'FVG inside zone' },
    { _id:'z3', type:'Fair Value Gap', pair:'BTC/USDT', timeframe:'Daily', priceFrom:65400, priceTo:65900, direction:'Alert Only', autoTrade:'Alert + wait for approval', status:'Filled', notes:'' },
  ]
}
