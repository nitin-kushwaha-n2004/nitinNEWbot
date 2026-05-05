import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'

const USE_CASES = [
  'Delta Exchange ka live status share karne ke liye.',
  'Signal verify hua ya reject hua, uska manual log rakhne ke liye.',
  'Bot, webhook, aur execution updates ek jagah dekhne ke liye.',
]

export default function LiveChat() {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [displayName,  setDisplayName]  = useState(localStorage.getItem('chat_name') || 'Trader')
  const [editingName,  setEditingName]  = useState(false)
  const [tempName,     setTempName]     = useState('')
  const bottomRef = useRef(null)
  const socket    = useSocket()

  // Load stored messages
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('livechat_msgs') || '[]')
      setMessages(stored)
    } catch { setMessages([]) }
  }, [])

  // Listen for socket events and show them as system messages
  useEffect(() => {
    if (!socket) return
    const handlers = [
      ['alert:new',      a => addSystem(`🔔 Alert: ${a.message}`)],
      ['trade:new',      t => addSystem(`📊 Trade opened: ${t.direction} ${t.pair} @ $${t.entryPrice?.toLocaleString()}`)],
      ['trade:update',   t => addSystem(`📝 Trade updated: ${t.pair} → ${t.result}`)],
      ['zone:new',       z => addSystem(`🎯 Zone added: ${z.type} on ${z.pair} (${z.priceFrom}–${z.priceTo})`)],
      ['bot:status',     b => addSystem(`🤖 Bot ${b.isActive ? '▶ started' : '⏹ stopped'}`)],
      ['price:update',   p => {}],  // skip price spam
    ]
    handlers.forEach(([ev, fn]) => socket.on(ev, fn))
    return () => handlers.forEach(([ev, fn]) => socket.off(ev, fn))
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addSystem = (text) => {
    const msg = { id: Date.now(), type: 'system', text, time: new Date().toISOString() }
    setMessages(p => {
      const next = [...p, msg].slice(-200)
      localStorage.setItem('livechat_msgs', JSON.stringify(next))
      return next
    })
  }

  const send = () => {
    if (!input.trim()) return
    const msg = {
      id:   Date.now(),
      type: 'user',
      name: displayName,
      text: input.trim(),
      time: new Date().toISOString()
    }
    setMessages(p => {
      const next = [...p, msg].slice(-200)
      localStorage.setItem('livechat_msgs', JSON.stringify(next))
      return next
    })
    setInput('')
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const saveName = () => {
    if (tempName.trim()) {
      setDisplayName(tempName.trim())
      localStorage.setItem('chat_name', tempName.trim())
    }
    setEditingName(false)
  }

  const clearAll = () => {
    if (window.confirm('Clear all messages?')) {
      setMessages([])
      localStorage.removeItem('livechat_msgs')
    }
  }

  const formatTime = iso => new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* MAIN CHAT */}
      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-400">
          <div>
            <h2 className="text-sm font-semibold text-white">Live Chat</h2>
            <p className="text-xs text-gray-500">Team feed — Realtime socket updates enabled</p>
          </div>
          <div className="flex items-center gap-2">
            {editingName ? (
              <div className="flex gap-1">
                <input autoFocus className="input w-28 py-1 text-xs" value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()} />
                <button className="btn btn-sm btn-primary" onClick={saveName}>Save</button>
              </div>
            ) : (
              <button className="text-xs text-gray-400 hover:text-brand" onClick={() => { setTempName(displayName); setEditingName(true) }}>
                👤 {displayName}
              </button>
            )}
            <button className="btn btn-sm text-danger border-danger/30 hover:bg-danger/10" onClick={clearAll}>Clear</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-600 text-sm text-center mt-12">Abhi tak koi message nahi hai.</p>
          )}
          {messages.map(msg => (
            msg.type === 'system' ? (
              <div key={msg.id} className="flex items-start gap-2">
                <div className="flex-1 px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg">
                  <p className="text-xs text-gray-400">{msg.text}</p>
                  <span className="text-xs text-gray-600">{formatTime(msg.time)}</span>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-xs text-brand font-semibold flex-shrink-0">
                  {msg.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-brand">{msg.name}</span>
                    <span className="text-xs text-gray-600">{formatTime(msg.time)}</span>
                  </div>
                  <div className="px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg rounded-tl-none">
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            )
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-dark-400 p-3 flex gap-2">
          <textarea
            rows={2}
            className="input flex-1 resize-none"
            placeholder="Yahan update likho... jaise BTC feed stable hai, order trigger aa gaya, ya manual note."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="btn btn-primary px-5 self-end" onClick={send}>Send</button>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="w-56 flex flex-col gap-3">
        {/* Display Name */}
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Display name</p>
          <input className="input text-sm" value={displayName}
            onChange={e => { setDisplayName(e.target.value); localStorage.setItem('chat_name', e.target.value) }} />
        </div>

        {/* Use Cases */}
        <div className="card flex-1">
          <p className="text-xs font-semibold text-gray-400 mb-3">Use Cases</p>
          <div className="space-y-3">
            {USE_CASES.map((uc, i) => (
              <p key={i} className="text-xs text-gray-500 leading-relaxed">{uc}</p>
            ))}
          </div>
        </div>

        {/* Quick templates */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 mb-2">Quick Notes</p>
          {[
            'BTC feed stable hai ✅',
            'Signal rejected — low volume',
            'Manual SL moved to breakeven',
            'Bot paused — news event',
          ].map(t => (
            <button key={t} className="w-full text-left text-xs text-gray-500 hover:text-brand py-1.5 border-b border-dark-500 last:border-0 transition-colors"
              onClick={() => setInput(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
