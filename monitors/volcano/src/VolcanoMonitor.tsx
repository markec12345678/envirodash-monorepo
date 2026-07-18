'use client'

import { useEffect, useState } from 'react'
import { Mountain, RefreshCw, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fetchVolcanoes } from './api'
import { STATUS_COLORS, STATUS_LABELS_EN, type MonitorLocation } from '@envirodash/core'

export interface VolcanoMonitorProps {
  onClose?: () => void
  showClose?: boolean
}

export function VolcanoMonitor({ onClose, showClose = true }: VolcanoMonitorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<MonitorLocation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchVolcanoes()
      // Sort by status priority: critical first
      const order = { critical: 0, warning: 1, moderate: 2, stable: 3 }
      const sorted = [...data.results].sort((a, b) => order[a.status] - order[b.status])
      setLocations(sorted)
      if (sorted.length > 0 && !activeId) setActiveId(sorted[0].id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const active = locations.find((l) => l.id === activeId)
  const alertCounts = locations.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-rose-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-rose-600 to-red-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mountain className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🌋 Volcano</h2>
              <p className="text-xs text-rose-100">USGS live alerts</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={load} disabled={loading} className="rounded-md p-1.5 text-white hover:bg-white/20 disabled:opacity-50" aria-label="Refresh">
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

        {loading && locations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading volcano alerts…</p>
          </div>
        )}

        {locations.length > 0 && (
          <>
            <div className="mb-3 grid grid-cols-4 gap-2 text-center">
              <CountBadge label="Critical" count={alertCounts.critical || 0} status="critical" />
              <CountBadge label="Warning" count={alertCounts.warning || 0} status="warning" />
              <CountBadge label="Moderate" count={alertCounts.moderate || 0} status="moderate" />
              <CountBadge label="Stable" count={alertCounts.stable || 0} status="stable" />
            </div>

            <ul className="mb-3 max-h-60 space-y-1 overflow-y-auto">
              {locations.slice(0, 50).map((loc) => (
                <li key={loc.id}>
                  <button
                    onClick={() => setActiveId(loc.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      activeId === loc.id
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-medium">{loc.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[loc.status]}`}>
                      {STATUS_LABELS_EN[loc.status]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {active && (
              <div className="rounded-lg border bg-white p-3 dark:bg-zinc-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{active.name}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[active.status]}`}>
                    {STATUS_LABELS_EN[active.status]}
                  </span>
                </div>
                {active.description && <p className="mt-2 text-xs text-zinc-500">{active.description}</p>}
                {active.lastUpdated && (
                  <p className="mt-1 text-[10px] text-zinc-400">Updated: {new Date(active.lastUpdated).toLocaleString()}</p>
                )}
              </div>
            )}

            <p className="mt-3 text-[10px] text-zinc-400">
              Source: USGS Volcano Hazards Program · {locations.length} volcanoes monitored
            </p>
          </>
        )}

        {!loading && !error && locations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
            <p className="text-sm">No volcano data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CountBadge({ label, count, status }: { label: string; count: number; status: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className={`text-lg font-bold ${STATUS_COLORS[status]} rounded`}>{count}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  )
}

export default VolcanoMonitor
