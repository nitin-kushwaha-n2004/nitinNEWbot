import { createContext, useContext, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SocketCtx = createContext(null)

export function SocketProvider({ children, onTradeNew, onZoneNew, onAlertNew, onBotStatus, onPriceUpdate }) {
  const socketRef = useRef(null)

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    socketRef.current = io(SOCKET_URL)
    const s = socketRef.current

    s.on('connect',    () => console.log('Socket connected'))
    s.on('disconnect', () => console.log('Socket disconnected'))

    s.on('trade:new',    t => { toast.success(`📊 Trade: ${t.direction} ${t.pair}`); onTradeNew?.(t) })
    s.on('trade:update', t => { onTradeNew?.(t) })
    s.on('zone:new',     z => { onZoneNew?.(z) })
    s.on('zone:update',  z => { onZoneNew?.(z) })
    s.on('alert:new',    a => { toast(`🔔 ${a.message}`, { duration: 6000 }); onAlertNew?.(a) })
    s.on('bot:status',   b => { onBotStatus?.(b) })
    s.on('price:update', p => { onPriceUpdate?.(p) })   // real-time price from Python bot

    return () => s.disconnect()
  }, [])

  return <SocketCtx.Provider value={socketRef.current}>{children}</SocketCtx.Provider>
}

export const useSocket = () => useContext(SocketCtx)
