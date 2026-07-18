'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Bell, X, AlertTriangle, Activity, Waves, Wind, Flame, Mountain, CheckCircle2 } from 'lucide-react'

interface Alert {
  id: string
  type: 'earthquake' | 'tsunami' | 'air-quality' | 'wildfire' | 'volcano'
  severity: 'warning' | 'critical'
  title: string
  description: string
  location?: { name: string; lat: number; lng: number }
  value?: number
  unit?: string
  timestamp: string
  source: string
}

const ALERT_ICONS: Record<string, typeof Bell> = {
  earthquake: Activity,
  tsunami: Waves,
  'air-quality': Wind,
  wildfire: Flame,
  volcano: Mountain,
}

const ALERT_COLORS: Record<string, string> = {
  earthquake: 'text-amber-600 bg-amber-50 border-amber-300',
  tsunami: 'text-cyan-600 bg-cyan-50 border-cyan-300',
  'air-quality': 'text-emerald-600 bg-emerald-50 border-emerald-300',
  wildfire: 'text-orange-600 bg-orange-50 border-orange-300',
  volcano: 'text-rose-600 bg-rose-50 border-rose-300',
}

export function AlertCenter() {
  const [open, setOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [newAlert, setNewAlert] = useState<Alert | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const unreadCount = alerts.length

  useEffect(() => {
    // Connect to alerts WebSocket service (port 3003 via Caddy XTransformPort)
    const socket = io('/', {
      path: '/?XTransformPort=3003',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      console.log('[Alerts] Connected:', socket.id)
      socket.emit('subscribe', { types: ['earthquake', 'tsunami', 'air-quality', 'wildfire', 'volcano'] })
    })

    socket.on('disconnect', () => {
      setConnected(false)
      console.log('[Alerts] Disconnected')
    })

    socket.on('recent_alerts', (recent: Alert[]) => {
      setAlerts(recent)
    })

    socket.on('alert', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50))
      setNewAlert(alert)
      // Auto-hide toast after 8 seconds
      setTimeout(() => setNewAlert(null), 8000)

      // Browser notification (if permitted)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${alert.severity === 'critical' ? '🚨' : '⚠️'} ${alert.title}`, {
          body: alert.description,
          icon: '/logo.svg',
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const clearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const clearAll = () => {
    setAlerts([])
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        title="Environmental alerts"
      >
        <Bell className="h-4 w-4" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <span className={`ml-1 h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-zinc-400'}`} title={connected ? 'Live' : 'Disconnected'} />
      </button>

      {/* Toast notification for new alert */}
      {newAlert && (
        <div
          className={`fixed right-4 top-16 z-[90] w-[360px] rounded-xl border-2 p-4 shadow-2xl ${
            newAlert.severity === 'critical' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = ALERT_ICONS[newAlert.type] || AlertTriangle
                return <Icon className={`h-5 w-5 ${newAlert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
              })()}
              <div>
                <p className="text-sm font-bold">
                  {newAlert.severity === 'critical' ? '🚨 ' : '⚠️ '}
                  {newAlert.title}
                </p>
                <p className="text-xs text-zinc-600">{newAlert.description}</p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {newAlert.source} · {new Date(newAlert.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button onClick={() => setNewAlert(null)} className="rounded p-1 hover:bg-white/50">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Alerts panel */}
      {open && (
        <div className="fixed right-4 top-16 z-[80] flex max-h-[85vh] w-[380px] flex-col overflow-hidden rounded-xl border-2 border-red-500/30 bg-white shadow-2xl dark:bg-zinc-900">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <div>
                  <h2 className="text-base font-bold">🔔 Environmental Alerts</h2>
                  <p className="text-[10px] text-red-100">
                    {connected ? '● Live' : '○ Disconnected'} · {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {alerts.length > 0 && (
                  <button onClick={clearAll} className="rounded-md px-2 py-1 text-xs hover:bg-white/20">
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <CheckCircle2 className="mb-2 h-12 w-12 text-emerald-500" />
                <p className="text-sm font-medium">No active alerts</p>
                <p className="mt-1 text-xs">Real-time monitoring active — you'll be notified of new environmental events.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert) => {
                  const Icon = ALERT_ICONS[alert.type] || AlertTriangle
                  return (
                    <li
                      key={alert.id}
                      className={`rounded-lg border p-3 ${ALERT_COLORS[alert.type] || 'border-zinc-300 bg-zinc-50'}`}
                    >
                      <div className="mb-1 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">
                            {alert.severity === 'critical' ? '🚨 ' : '⚠️ '}
                            {alert.type.replace('-', ' ')}
                          </span>
                        </div>
                        <button onClick={() => clearAlert(alert.id)} className="rounded p-0.5 hover:bg-white/50">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="mt-1 text-xs text-zinc-600">{alert.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{alert.source}</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default AlertCenter
