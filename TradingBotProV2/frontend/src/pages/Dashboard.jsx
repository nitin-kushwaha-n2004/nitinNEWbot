import { useEffect, useState } from 'react'
import { getDashStats, getTrades, getZones } from '../api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function Dashboard() {
  const [stats,  setStats]  = useState(null)
  const [trades, setTrades] = useState([])
  const [zones,  setZones]  = useState([])

  useEffect(() => {
    getDashStats().then(r => setStats(r.data)).catch(() => setStats(mockStats()))
    getTrades({ limit: 8 }).then(r => setTrades(r.data)).catch(() => setTrades(mockTrades()))
    getZones({ status: 'Active' }).then(r => setZones(r.data)).catch(() => setZones(mockZones()))
  }, [])

  if (!stats) return <div className="text-gray-500 text-sm">Loading dashboard...</div>

  const monthlyData = Object.entries(stats.monthly || mockStats().monthly).map(([m, v]) => ({ month: m, pnl: v }))
  const setupData   = Object.entries(stats.setups  || mockStats().setups).map(([s, c]) => ({ setup: s, count: c })).sort((a,b)=>b.count-a.count)
  const pieData     = [{ name:'Win', value: stats.wins }, { name:'Loss', value: stats.losses }]

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-5">Dashboard</h1>

      {/* METRICS */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label:'Total Trades',    val: stats.total,              color:'text-white'   },
          { label:'Win Rate',        val: stats.winRate+'%',        color:'text-success' },
          { label:'Net P&L',         val: `${stats.netPnL >= 0 ? '+' : ''}$${stats.netPnL?.toFixed(0)}`, color: stats.netPnL >= 0 ? 'text-success' : 'text-danger' },
          { label:'Avg Risk:Reward', val: '1 : '+stats.avgRR,       color:'text-brand'   },
        ].map(m => (
          <div key={m.label} className="metric">
            <p className="text-xs text-gray-500 mb-2">{m.label}</p>
            <p className={`text-2xl font-semibold ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Win/Loss Pie */}
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Win / Loss Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                <Cell fill="#1D9E75" /><Cell fill="#E24B4A" />
              </Pie>
              <Tooltip contentStyle={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-5 text-xs text-gray-500 mt-2">
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-success mr-1.5"></span>Win {stats.wins}</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-danger mr-1.5"></span>Loss {stats.losses}</span>
          </div>
        </div>

        {/* Monthly P&L */}
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Monthly P&L (USD)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>'$'+v} />
              <Tooltip contentStyle={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8 }}
                formatter={v=>['$'+v,'P&L']} />
              <Bar dataKey="pnl" radius={[4,4,0,0]}
                fill="#1D9E75"
                label={false}
                // Dynamic color per bar
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Setup distribution */}
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Trades by Setup</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={setupData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
              <XAxis type="number" tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="setup" type="category" tick={{ fill:'#888', fontSize:11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8 }} />
              <Bar dataKey="count" fill="#378ADD" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Active Zones */}
        <div className="card">
          <p className="text-sm font-medium text-gray-400 mb-4">Active Zones</p>
          {(zones.length ? zones : mockZones()).map((z, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-dark-400 last:border-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                z.type?.includes('Supply') || z.type?.includes('Resistance') ? 'bg-danger' :
                z.type?.includes('FVG') ? 'bg-brand' : 'bg-success'
              }`}></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{z.type} · {z.pair} · {z.timeframe}</p>
                <p className="text-xs text-gray-500">{z.priceFrom?.toLocaleString()} – {z.priceTo?.toLocaleString()}</p>
              </div>
              <span className={`badge ${z.status==='Active'?'badge-open':'badge-win'}`}>{z.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="card">
        <p className="text-sm font-medium text-gray-400 mb-4">Recent Trades</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-400">
                {['Pair','Direction','Entry','SL','TP','R:R','P&L','Setup','Result'].map(h=>(
                  <th key={h} className="text-left pb-2 px-2 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(trades.length ? trades : mockTrades()).map((t, i) => (
                <tr key={i} className="border-b border-dark-500/50 hover:bg-dark-500/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium text-gray-200">{t.pair}</td>
                  <td className="py-2.5 px-2"><span className={`badge badge-${t.direction?.toLowerCase()}`}>{t.direction}</span></td>
                  <td className="py-2.5 px-2 text-gray-300">{t.entryPrice?.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-danger">{t.stopLoss?.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-success">{t.takeProfit1?.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-brand">1:{t.riskReward}</td>
                  <td className={`py-2.5 px-2 font-semibold ${t.actualPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                    {t.actualPnL != null ? `${t.actualPnL >= 0?'+':''}$${Math.abs(t.actualPnL)}` : '–'}
                  </td>
                  <td className="py-2.5 px-2 text-gray-400 text-xs">{t.setupType}</td>
                  <td className="py-2.5 px-2"><span className={`badge badge-${t.result?.toLowerCase()}`}>{t.result}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── MOCK DATA (used until backend is connected) ──────────────────────────────
function mockStats() {
  return {
    total:47, wins:35, losses:12, open:2, netPnL:3840, winRate:'74.5', avgRR:'4.2',
    monthly:{ 'Nov 24':620, 'Dec 24':950, 'Jan 25':-120, 'Feb 25':780, 'Mar 25':1100, 'Apr 25':510 },
    setups:{ 'Liquidity Sweep':14, 'FVG Fill':11, 'Supply Zone':9, 'Demand Zone':7, 'Breakout Retest':4, 'Order Block':2 }
  }
}
function mockTrades() {
  return [
    { pair:'BTC/USDT', direction:'Short', entryPrice:68100, stopLoss:68450, takeProfit1:66650, riskReward:'4.1', actualPnL:820,  setupType:'Supply Zone',      result:'Win'  },
    { pair:'ETH/USDT', direction:'Long',  entryPrice:3142,  stopLoss:3095,  takeProfit1:3330,  riskReward:'4.0', actualPnL:376,  setupType:'FVG Fill',         result:'Win'  },
    { pair:'BTC/USDT', direction:'Long',  entryPrice:65600, stopLoss:65100, takeProfit1:67850, riskReward:'4.5', actualPnL:-150, setupType:'Demand Zone',      result:'Loss' },
    { pair:'GOLD/USD', direction:'Long',  entryPrice:2312,  stopLoss:2295,  takeProfit1:2380,  riskReward:'4.0', actualPnL:680,  setupType:'Liquidity Sweep',  result:'Win'  },
    { pair:'BTC/USDT', direction:'Short', entryPrice:67500, stopLoss:68100, takeProfit1:65200, riskReward:'3.8', actualPnL:null, setupType:'Breakout Retest',  result:'Open' },
  ]
}
function mockZones() {
  return [
    { type:'Supply Zone',     pair:'BTC/USDT', timeframe:'4H',    priceFrom:67800, priceTo:68200, status:'Active' },
    { type:'Demand Zone',     pair:'ETH/USDT', timeframe:'1H',    priceFrom:3120,  priceTo:3180,  status:'Active' },
    { type:'Fair Value Gap',  pair:'BTC/USDT', timeframe:'Daily', priceFrom:65400, priceTo:65900, status:'Filled' },
  ]
}
