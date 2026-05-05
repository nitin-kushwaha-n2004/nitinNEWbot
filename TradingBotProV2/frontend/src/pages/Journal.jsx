import { useState, useEffect } from 'react'
import { getTrades, addTrade, deleteTrade } from '../api'
import toast from 'react-hot-toast'

const SETUPS = ['Liquidity Sweep','FVG Fill','Supply Zone','Demand Zone','Order Block','Breaker Block','BOS Retest','Breakout Retest','Smart Money Reversal']
const TFS    = ['1m','5m','15m','1H','4H','Daily','Weekly']

export default function Journal() {
  const [trades,    setTrades]  = useState([])
  const [filter,    setFilter]  = useState({ result:'all', pair:'all' })
  const [rrPreview, setRR]      = useState(null)
  const [form, setForm] = useState({
    pair:'BTC/USDT', direction:'Long', entryPrice:'', stopLoss:'', takeProfit1:'', takeProfit2:'',
    positionSize:'', timeframe:'4H', setupType:'Liquidity Sweep', result:'Open', actualPnL:'', notes:''
  })

  useEffect(() => {
    getTrades().then(r => setTrades(r.data)).catch(() => setTrades(mockTrades()))
  }, [])

  const set = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      // Live R:R calculation
      const e = parseFloat(next.entryPrice), sl = parseFloat(next.stopLoss), tp = parseFloat(next.takeProfit1)
      if (e && sl && tp) {
        const risk = Math.abs(e - sl), reward = Math.abs(tp - e)
        const rr   = (reward / risk).toFixed(1)
        const size = parseFloat(next.positionSize) || 0
        setRR({ rr, riskUSD: size ? (size * risk / e).toFixed(2) : '–', rewardUSD: size ? (size * reward / e).toFixed(2) : '–' })
      } else { setRR(null) }
      return next
    })
  }

  const handleAdd = async () => {
    if (!form.entryPrice) { toast.error('Entry price required'); return }
    const e = parseFloat(form.entryPrice), sl = parseFloat(form.stopLoss), tp = parseFloat(form.takeProfit1)
    const rr = e && sl && tp ? parseFloat((Math.abs(tp-e)/Math.abs(e-sl)).toFixed(2)) : null
    const payload = { ...form, entryPrice:e, stopLoss:sl||undefined, takeProfit1:tp||undefined,
      positionSize:parseFloat(form.positionSize)||undefined, actualPnL:parseFloat(form.actualPnL)||0, riskReward:rr }
    try {
      const res = await addTrade(payload)
      setTrades(p => [res.data, ...p])
      toast.success('Trade logged!')
    } catch {
      setTrades(p => [{ ...payload, _id: Date.now() }, ...p])
      toast.success('Trade logged (offline mode)')
    }
    setForm(p => ({ ...p, entryPrice:'', stopLoss:'', takeProfit1:'', takeProfit2:'', positionSize:'', actualPnL:'', notes:'' }))
    setRR(null)
  }

  const handleDelete = async (id) => {
    try { await deleteTrade(id) } catch {}
    setTrades(p => p.filter(t => t._id !== id))
  }

  const filtered = trades.filter(t => {
    if (filter.result !== 'all' && t.result !== filter.result) return false
    if (filter.pair   !== 'all' && t.pair   !== filter.pair)   return false
    return true
  })

  const wins  = trades.filter(t=>t.result==='Win').length
  const losses= trades.filter(t=>t.result==='Loss').length
  const pnl   = trades.reduce((s,t)=>s+(t.actualPnL||0),0)
  const wr    = trades.length ? ((wins/trades.length)*100).toFixed(0) : 0

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Trade Journal</h1>

      {/* ADD FORM */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-4">Log New Trade</p>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Pair</label>
            <input className="input" value={form.pair} onChange={e=>set('pair',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Direction</label>
            <select className="input" value={form.direction} onChange={e=>set('direction',e.target.value)}>
              <option>Long</option><option>Short</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Entry Price</label>
            <input type="number" className="input" placeholder="67500" value={form.entryPrice} onChange={e=>set('entryPrice',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Stop Loss</label>
            <input type="number" className="input" placeholder="66800" value={form.stopLoss} onChange={e=>set('stopLoss',e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Take Profit 1</label>
            <input type="number" className="input" placeholder="69000" value={form.takeProfit1} onChange={e=>set('takeProfit1',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Take Profit 2</label>
            <input type="number" className="input" placeholder="70200" value={form.takeProfit2} onChange={e=>set('takeProfit2',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Position Size ($)</label>
            <input type="number" className="input" placeholder="500" value={form.positionSize} onChange={e=>set('positionSize',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Timeframe</label>
            <select className="input" value={form.timeframe} onChange={e=>set('timeframe',e.target.value)}>
              {TFS.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Setup Type</label>
            <select className="input" value={form.setupType} onChange={e=>set('setupType',e.target.value)}>
              {SETUPS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Result</label>
            <select className="input" value={form.result} onChange={e=>set('result',e.target.value)}>
              <option>Open</option><option>Win</option><option>Loss</option><option>Break Even</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Actual P&L ($)</label>
            <input type="number" className="input" placeholder="Leave blank if open" value={form.actualPnL} onChange={e=>set('actualPnL',e.target.value)} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">&nbsp;</label>
            <button className="btn btn-primary w-full" onClick={handleAdd}>+ Log Trade</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Notes / Analysis</label>
            <input className="input" placeholder="e.g. HTF supply zone + 4H FVG confluence. Waited for 15m BOS." value={form.notes} onChange={e=>set('notes',e.target.value)} />
          </div>
        </div>
        {rrPreview && (
          <div className="flex gap-6 text-sm bg-dark-800 border border-dark-400 rounded-lg px-4 py-2.5">
            <span className="text-gray-500">R:R Preview:</span>
            <span className="text-brand font-semibold">1:{rrPreview.rr}</span>
            <span className="text-gray-500">Risk: <span className="text-danger">${rrPreview.riskUSD}</span></span>
            <span className="text-gray-500">Reward: <span className="text-success">${rrPreview.rewardUSD}</span></span>
          </div>
        )}
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          { label:'Total',   val: trades.length,        color:'text-white'   },
          { label:'Wins',    val: wins,                  color:'text-success' },
          { label:'Losses',  val: losses,                color:'text-danger'  },
          { label:'Win Rate',val: wr+'%',                color:'text-brand'   },
          { label:'Net P&L', val: `${pnl>=0?'+':''}$${pnl.toFixed(0)}`, color: pnl>=0?'text-success':'text-danger' },
        ].map(s => (
          <div key={s.label} className="metric text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-semibold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* TRADE TABLE */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-400">Trade History ({filtered.length})</p>
          <div className="flex gap-2">
            <select className="input text-xs py-1.5" style={{width:120}} value={filter.result} onChange={e=>setFilter(p=>({...p,result:e.target.value}))}>
              <option value="all">All Results</option>
              <option value="Open">Open</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Break Even">Break Even</option>
            </select>
            <button className="btn btn-sm" onClick={()=>{
              const rows = filtered.map(t => `${t.pair},${t.direction},${t.entryPrice},${t.stopLoss},${t.takeProfit1},1:${t.riskReward},${t.positionSize},${t.actualPnL},${t.setupType},${t.timeframe},${t.result}`).join('\n')
              const blob = new Blob(['Pair,Dir,Entry,SL,TP,RR,Size,PnL,Setup,TF,Result\n'+rows], {type:'text/csv'})
              const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='trades.csv'; a.click()
            }}>Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-400">
                {['Pair','Dir','Entry','SL','TP','R:R','Size','P&L','Setup','TF','Result',''].map(h=>(
                  <th key={h} className="text-left pb-2 px-2 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t._id||i} className="border-b border-dark-500/50 hover:bg-dark-500/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium text-gray-200">{t.pair}</td>
                  <td className="py-2.5 px-2"><span className={`badge badge-${t.direction?.toLowerCase()}`}>{t.direction}</span></td>
                  <td className="py-2.5 px-2">{t.entryPrice?.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-danger">{t.stopLoss?.toLocaleString()||'–'}</td>
                  <td className="py-2.5 px-2 text-success">{t.takeProfit1?.toLocaleString()||'–'}</td>
                  <td className="py-2.5 px-2 text-brand">{t.riskReward?`1:${t.riskReward}`:'–'}</td>
                  <td className="py-2.5 px-2 text-gray-400">{t.positionSize?'$'+t.positionSize:'–'}</td>
                  <td className={`py-2.5 px-2 font-semibold ${(t.actualPnL||0)>=0?'text-success':'text-danger'}`}>
                    {t.actualPnL!=null&&t.actualPnL!==0 ? `${t.actualPnL>=0?'+':''}$${Math.abs(t.actualPnL)}` : t.result==='Open'?<span className="text-brand text-xs">Running…</span>:'–'}
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs">{t.setupType}</td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs">{t.timeframe}</td>
                  <td className="py-2.5 px-2"><span className={`badge badge-${t.result?.toLowerCase().replace(' ','-')}`}>{t.result}</span></td>
                  <td className="py-2.5 px-2"><button className="btn btn-sm btn-danger" onClick={()=>handleDelete(t._id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-gray-600 text-sm py-6 text-center">No trades found.</p>}
        </div>
      </div>
    </div>
  )
}

function mockTrades() {
  return [
    { _id:'t1', pair:'BTC/USDT', direction:'Short', entryPrice:68100, stopLoss:68450, takeProfit1:66650, riskReward:'4.1', positionSize:500, actualPnL:820,  setupType:'Supply Zone',     timeframe:'4H',    result:'Win'  },
    { _id:'t2', pair:'ETH/USDT', direction:'Long',  entryPrice:3142,  stopLoss:3095,  takeProfit1:3330,  riskReward:'4.0', positionSize:300, actualPnL:376,  setupType:'FVG Fill',        timeframe:'1H',    result:'Win'  },
    { _id:'t3', pair:'BTC/USDT', direction:'Long',  entryPrice:65600, stopLoss:65100, takeProfit1:67850, riskReward:'4.5', positionSize:200, actualPnL:-150, setupType:'Demand Zone',     timeframe:'4H',    result:'Loss' },
    { _id:'t4', pair:'GOLD/USD', direction:'Long',  entryPrice:2312,  stopLoss:2295,  takeProfit1:2380,  riskReward:'4.0', positionSize:400, actualPnL:680,  setupType:'Liquidity Sweep', timeframe:'Daily', result:'Win'  },
    { _id:'t5', pair:'BTC/USDT', direction:'Short', entryPrice:67500, stopLoss:68100, takeProfit1:65200, riskReward:'3.8', positionSize:500, actualPnL:0,    setupType:'Breakout Retest', timeframe:'4H',    result:'Open' },
  ]
}
