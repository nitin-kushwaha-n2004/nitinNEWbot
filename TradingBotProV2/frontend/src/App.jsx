import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { SocketProvider } from './context/SocketContext'
import { toggleBot, getDailyCheck } from './api'

import Dashboard  from './pages/Dashboard'
import Zones      from './pages/Zones'
import Journal    from './pages/Journal'
import BotConfig  from './pages/BotConfig'
import Alerts     from './pages/Alerts'
import Backtest   from './pages/Backtest'
import Settings   from './pages/Settings'
import LiveChat   from './pages/LiveChat'

const NAV = [
  { to: '/',         icon: '📊', label: 'Dashboard'    },
  { to: '/zones',    icon: '🎯', label: 'Zone Manager'  },
  { to: '/journal',  icon: '📒', label: 'Trade Journal' },
  { to: '/bot',      icon: '🤖', label: 'AI Bot'        },
  { to: '/alerts',   icon: '🔔', label: 'Alerts'        },
  { to: '/chat',     icon: '💬', label: 'Live Chat'     },
  { to: '/backtest', icon: '⏮',  label: 'Backtest'      },
  { to: '/settings', icon: '⚙️', label: 'Settings'      },
]

export default function App() {
  const [botActive, setBotActive] = useState(false)
  const [canTrade,  setCanTrade]  = useState(true)
  const [prices,    setPrices]    = useState({})   // { 'BTC/USDT': 67842, ... }

  useEffect(() => {
    getDailyCheck().then(r => setCanTrade(r.data.canTrade)).catch(() => {})
    // Fetch initial prices snapshot
    fetch('/api/prices/latest').then(r => r.json()).then(data => {
      const snap = {}
      Object.entries(data).forEach(([pair, info]) => { snap[pair] = info.price })
      if (Object.keys(snap).length) setPrices(snap)
    }).catch(() => {})
  }, [])

  const handleToggleBot = async () => {
    const next = !botActive
    await toggleBot(next).catch(() => {})
    setBotActive(next)
  }

  const displayPrice = prices['BTC/USDT']
    ? '$' + prices['BTC/USDT'].toLocaleString(undefined, { maximumFractionDigits: 0 })
    : null

  return (
    <SocketProvider
      onBotStatus={b => setBotActive(b.isActive)}
      onPriceUpdate={p => setPrices(prev => ({ ...prev, [p.pair]: p.price }))}
    >
      <Toaster position="top-right" toastOptions={{
        style: { background:'#1a1a1a', color:'#e0e0e0', border:'1px solid #2a2a2a' }
      }} />

      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-dark-700 border-b border-dark-400 px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm">M</div>
          <div>
            <span className="text-white font-semibold">TradingBot</span>
            <span className="ml-1 text-xs text-gray-500 font-normal">Pro Terminal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {displayPrice && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              <span className="text-gray-400">BTC</span>
              <span className="text-success font-semibold">{displayPrice}</span>
            </span>
          )}
          <span className="text-xs text-gray-500">
            Equity <span className="text-white font-semibold">$10,000</span>
          </span>
          <span className={`text-xs px-3 py-1 rounded-full border font-medium ${
            botActive ? 'bg-success/10 text-success border-success/30' : 'bg-dark-500 text-gray-500 border-dark-400'
          }`}>
            {botActive ? 'Bot Active' : 'Bot Stopped'}
          </span>
          {!canTrade && (
            <span className="text-xs px-3 py-1 rounded-full bg-danger/10 text-danger border border-danger/30">Daily limit hit</span>
          )}
          <button onClick={handleToggleBot}
            className={`btn btn-sm ${botActive ? 'btn-danger' : 'btn-success'}`}>
            {botActive ? 'Stop Bot' : 'Start Bot'}
          </button>
          <div className="w-8 h-8 rounded-full bg-dark-500 border border-dark-400 flex items-center justify-center text-gray-400 text-sm">👤</div>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-14 bottom-0 w-52 bg-dark-700 border-r border-dark-400 py-4 flex flex-col gap-0.5 px-2 overflow-y-auto">
        <p className="text-xs text-gray-600 font-medium px-3 mb-2 uppercase tracking-wider">Main</p>
        {NAV.slice(0,3).map(n => <NavItem key={n.to} {...n} />)}
        <p className="text-xs text-gray-600 font-medium px-3 mt-3 mb-2 uppercase tracking-wider">Tools</p>
        {NAV.slice(3).map(n => <NavItem key={n.to} {...n} />)}
        <div className="mt-auto pt-4 border-t border-dark-400 px-3">
          <button className="text-xs text-gray-500 hover:text-danger transition-colors">Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ml-52 mt-14 p-6 min-h-screen">
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/zones"    element={<Zones />} />
          <Route path="/journal"  element={<Journal />} />
          <Route path="/bot"      element={<BotConfig />} />
          <Route path="/alerts"   element={<Alerts />} />
          <Route path="/chat"     element={<LiveChat />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </SocketProvider>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
        isActive ? 'bg-brand/10 text-brand font-medium' : 'text-gray-500 hover:text-gray-200 hover:bg-dark-500'
      }`
    }>
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </NavLink>
  )
}
