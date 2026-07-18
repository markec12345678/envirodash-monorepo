'use client'

import { useEffect, useState } from 'react'
import { Waves, RefreshCw, X, Loader2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { fetchTsunami, type TsunamiMessage } from './api'
import { STATUS_COLORS, STATUS_LABELS_EN } from '@envirodash/core'

export interface TsunamiMonitorProps {
  onClose?: () => void
  onRefresh?: () => void
  showClose?: boolean
}

export function TsunamiMonitor({ onClose, onRefresh, showClose = true }: TsunamiMonitorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<TsunamiMessage[]>([])
  const [note, setNote] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTsunami()
      setMessages(data.results as any)
      setNote(data.note || '')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-cyan-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🌊 Tsunami</h2>
              <p className="text-xs text-cyan-100">NOAA NTWC live feed</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                load()
                onRefresh?.()
              }}
              disabled={loading}
              className="rounded-md p-1.5 text-white hover:bg-white/20 disabled:opacity-50"
              aria-label="Refresh"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            {showClose && (
              <button onClick={onClose} className="rounded-md p-1.5 text-white hover:bg-white/20" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-[calc(85vh-100px)] overflow-y-auto p-4">
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            {error}
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Checking tsunami warnings…</p>
          </div>
        )}

        {messages.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-emerald-600">
            <CheckCircle2 className="mb-2 h-12 w-12" />
            <p className="text-sm font-medium">No active tsunami warnings</p>
            <p className="mt-1 text-xs text-zinc-500">
              NOAA publishes new warnings within minutes of detection.
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <ul className="space-y-2">
            {messages.map((m) => {
              const status = m.msgType === 'warning' ? 'critical' : m.msgType === 'watch' || m.msgType === 'advisory' ? 'warning' : 'stable'
              return (
                <li key={m.id} className="rounded-lg border bg-white p-3 dark:bg-zinc-800">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${STATUS_COLORS[status]}`}>
                      {m.msgType}
                    </span>
                    <span className="text-[10px] text-zinc-400">{m.region}</span>
                  </div>
                  <p className="text-sm font-medium">{m.title}</p>
                  {m.description && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-3">{m.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      {m.pubDate && new Date(m.pubDate).toLocaleString()}
                    </span>
                    {m.link && (
                      <a
                        href={m.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-cyan-600 hover:underline"
                      >
                        Details <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {note && <p className="mt-3 text-[10px] text-zinc-400">{note}</p>}
        <p className="mt-1 text-[10px] text-zinc-400">Source: NOAA National Tsunami Warning Center</p>
      </div>
    </div>
  )
}

export default TsunamiMonitor
