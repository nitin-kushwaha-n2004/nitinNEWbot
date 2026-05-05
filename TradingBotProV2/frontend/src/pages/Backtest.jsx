import { useState, useEffect } from 'react'
import { getTrades } from '../api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PAIRS    = ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','GOLD/USD','EUR/USD']
const PERIODS  = ['1 Month','3 Months','6 Months','1 Year','All Time']
const STRATS   = ['SMC Full','SMC + FVG Only','Supply/Demand Only','Liquidity Sweep Only']
const RR_OPTS  = ['1:2','1:3','1:4','1:5']

export default function Backtest() {
  const [trades,  setTrades]  = useState([])
  const [config,  setConfig]  = useState({ pair:'BTC/USDT', period:'3 Months', strategy:'SMC Full', minRR:'1:3', capital:10000, riskPct:1 })
  const [result,  setResult]  = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    getTrades().then(r => setTrades(r.data)).catch(() => setTrades([]))
  }, [])

  const set = (k, v) => setConfig(p => ({ ...p, [k]: v }))

  // Simulate backtest on closed trades matching filters
  const runBacktest = () => {
    setRunning(true)
    setTimeout(() => {
      const periodDays = { '1 Month':30, '3 Months':90, '6 Months':180, '1 Year':365, 'All Time':9999 }
      const cutoff     = new Date(Date.now() - periodDays[config.period] * 86400000)
      const minRR      = Number(config.minRR.split(':')[1])

      let filtered = trades.filter(t => {
        if (config.pair !== 'All' && t.pair !== config.pair) return false
        if (t.result === 'Open') return false
        if (new Date(t.createdAt || t.entryTime) < cutoff) return false
        if (t.riskReward && t.riskReward < minRR) return false
        return true
      })

      if (filtered.length === 0) {
        // Generate synthetic demo data for visualization
        filtered = generateDemoTrades(config.capital, config.riskPct / 100, 40, minRR)
      }

      let equity   = config.capital
      const equityCurve = [{ trade: 0, equity }]
      let wins = 0, losses = 0, be = 0
      let maxDD = 0, peak = equity, totalRR = 0, maxConsecLoss = 0, consecLoss = 0

      filtered.forEach((t, i) => {
        const pnl  = t.actualPnL || 0
        equity    += pnl
        if (pnl > 0) { wins++;   consecLoss = 0 }
        else if (pnl < 0) { losses++; consecLoss++; maxConsecLoss = Math.max(maxConsecLoss, consecLoss) }
        else be++
        if (equity > peak) peak = equity
        const dd = ((peak - equity) / peak) * 100
        if (dd > maxDD) maxDD = dd
        if (t.riskReward) totalRR += t.riskReward
        equityCurve.push({ trade: i+1, equity: Math.round(equity) })
      })

      const total  = filtered.length
      const winRate= total ? ((wins/total)*100).toFixed(1) : 0
      const netPnL = equity - config.capital
      const avgRR  = total ? (totalRR/total).toFixed(2) : 0
      const profitFactor = losses > 0
        ? (filtered.filter(t=>t.actualPnL>0).reduce((s,t)=>s+t.actualPnL,0) /
           Math.abs(filtered.filter(t=>t.actualPnL<0).reduce((s,t)=>s+t.actualPnL,0))).toFixed(2)
        : '∞'

      // Monthly breakdown
      const monthly = {}
      filtered.forEach(t => {
        const m = new Date(t.createdAt || t.entryTime).toLocaleString('default',{month:'short',year:'2-digit'})
        monthly[m] = (monthly[m] || 0) + (t.actualPnL || 0)
      })

      setResult({ total, wins, losses, be, winRate, netPnL: netPnL.toFixed(0), avgRR, profitFactor,
        maxDD: maxDD.toFixed(1), maxConsecLoss, equityCurve,
        monthly: Object.entries(monthly).map(([m,v]) => ({ month:m, pnl: Math.round(v) })) })
      setRunning(false)
    }, 800)
  }

  const pnlColor = result?.netPnL >= 0 ? 'text-success' : 'text-danger'

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Backtest Engine</h1>

      {/* CONFIG */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-400 mb-3">Configuration</p>
        {trades.filter(t=>t.result!=='Open').length === 0 && (
          <div className="mb-3 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-xs text-warning">Trade history empty — backtest will run on synthetic demo data to show strategy simulation.</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Pair</label>
            <select className="input" value={config.pair} onChange={e=>set('pair',e.target.value)}>
              <option>All</option>
              {PAIRS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Period</label>
            <select className="input" value={config.period} onChange={e=>set('period',e.target.value)}>
              {PERIODS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Strategy</label>
            <select className="input" value={config.strategy} onChange={e=>set('strategy',e.target.value)}>
              {STRATS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Min R:R</label>
            <select className="input" value={config.minRR} onChange={e=>set('minRR',e.target.value)}>
              {RR_OPTS.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div><label className="text-xs text-gray-500 block mb-1">Starting Capital ($)</label>
            <input type="number" className="input" value={config.capital} onChange={e=>set('capital',Number(e.target.value))} />
          </div>
          <div><label className="text-xs text-gray-500 block mb-1">Risk per trade (%)</label>
            <input type="number" min="0.1" max="10" step="0.1" className="input" value={config.riskPct} onChange={e=>set('riskPct',Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={runBacktest} disabled={running}>
              {running ? '⏳ Running...' : 'Run Backtest'}
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      {result && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label:'Total Trades',    val: result.total,                     color:'text-white'   },
              { label:'Win Rate',        val: result.winRate+'%',               color:'text-success' },
              { label:'Net P&L',         val: `${result.netPnL>=0?'+':''}$${result.netPnL}`, color:pnlColor },
              { label:'Profit Factor',   val: result.profitFactor,              color:'text-brand'   },
              { label:'Max Drawdown',    val: result.maxDD+'%',                 color:'text-warning' },
            ].map(m => (
              <div key={m.label} className="metric">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className={`text-2xl font-semibold ${m.color}`}>{m.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label:'Wins',            val: result.wins,           color:'text-success' },
              { label:'Losses',          val: result.losses,         color:'text-danger'  },
              { label:'Avg R:R',         val: '1:'+result.avgRR,     color:'text-brand'   },
              { label:'Max Consec Loss', val: result.maxConsecLoss,  color:'text-warning' },
            ].map(m => (
              <div key={m.label} className="metric flex items-center justify-between">
                <span className="text-sm text-gray-400">{m.label}</span>
                <span className={`text-xl font-semibold ${m.color}`}>{m.val}</span>
              </div>
            ))}
          </div>

          {/* Equity Curve */}
          <div className="card mb-4">
            <p className="text-sm font-medium text-gray-400 mb-4">Equity Curve</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="trade" tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} label={{ value:'Trade #', position:'insideBottom', offset:-2, fill:'#555', fontSize:11 }} />
                <YAxis tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>'$'+v.toLocaleString()} />
                <Tooltip contentStyle={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8 }}
                  formatter={v=>['$'+Number(v).toLocaleString(),'Equity']} />
                <Line type="monotone" dataKey="equity" stroke="#1D9E75" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly P&L */}
          {result.monthly.length > 0 && (
            <div className="card">
              <p className="text-sm font-medium text-gray-400 mb-4">Monthly P&L Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={result.monthly} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="month" tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>'$'+v} />
                  <Tooltip contentStyle={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8 }}
                    formatter={v=>['$'+v,'P&L']} />
                  <Bar dataKey="pnl" radius={[4,4,0,0]}
                    fill="#1D9E75"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Generate demo trade data for visualization when history is empty
function generateDemoTrades(capital, riskPct, count, minRR) {
  const trades = []
  const winRate = 0.68
  let equity = capital
  const base = new Date()
  for (let i = 0; i < count; i++) {
    const isWin = Math.random() < winRate
    const rr    = minRR + Math.random() * 2
    const risk  = equity * riskPct
    const pnl   = isWin ? +(risk * rr).toFixed(2) : -(risk).toFixed(2)
    equity += pnl
    trades.push({
      pair: 'BTC/USDT', direction: Math.random() > 0.5 ? 'Long' : 'Short',
      result: isWin ? 'Win' : 'Loss', actualPnL: pnl, riskReward: +rr.toFixed(1),
      createdAt: new Date(base.getTime() - (count - i) * 2 * 86400000)
    })
  }
  return trades
}
