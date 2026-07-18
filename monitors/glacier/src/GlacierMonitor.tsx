'use client'

import { useEffect, useState } from 'react'
import { Snowflake, RefreshCw, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fetchGlaciers, type GlacierQuery } from './api'
import { STATUS_COLORS, STATUS_LABELS_EN, type MonitorLocation } from '@envirodash/core'

export interface GlacierMonitorProps {
  query?: GlacierQuery
  onClose?: () => void
  onRefresh?: () => void
  showClose?: boolean
}

export function GlacierMonitor({
  query = {},
  onClose,
  onRefresh,
  showClose = true,
}: GlacierMonitorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<MonitorLocation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [note, setNote] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchGlaciers(query)
      setLocations(data.results)
      setNote(data.note || '')
      if (data.results.length > 0 && !activeId) setActiveId(data.results[0].id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.region, query.lat, query.lng, query.limit])

  const active = locations.find((l) => l.id === activeId)

  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-cyan-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-cyan-500 to-teal-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🏔️ Glacier</h2>
              <p className="text-xs text-cyan-100">Open-Meteo · Real-time</p>
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

        {loading && locations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading glacier data…</p>
          </div>
        )}

        {locations.length > 0 && (
          <>
            <ul className="mb-3 max-h-60 space-y-1 overflow-y-auto">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <button
                    onClick={() => setActiveId(loc.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      activeId === loc.id
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="flex-1 truncate font-medium">{loc.name}</span>
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[loc.status]}`}>
                      {loc.value?.toFixed(1)}°C
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
                {active.metrics && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Metric label="Temperature" value={active.metrics.temperature} unit="°C" highlight />
                    <Metric label="Snowfall/h" value={active.metrics.snowfall_hourly} unit="mm" />
                    <Metric label="Snowfall/day" value={active.metrics.snowfall_daily} unit="mm" />
                    <Metric label="Precip/day" value={active.metrics.precipitation_daily} unit="mm" />
                    <Metric label="Snow depth" value={active.metrics.snow_depth} unit="m" />
                  </div>
                )}
                {active.description && <p className="mt-2 text-xs text-zinc-500">{active.description}</p>}
                {active.lastUpdated && (
                  <p className="mt-1 text-[10px] text-zinc-400">Updated: {new Date(active.lastUpdated).toLocaleString()}</p>
                )}
              </div>
            )}

            {note && <p className="mt-3 text-[10px] text-zinc-400">{note}</p>}
            <p className="mt-1 text-[10px] text-zinc-400">Source: Open-Meteo Forecast API</p>
          </>
        )}

        {!loading && !error && locations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
            <p className="text-sm">No glacier data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: number | string | undefined
  unit: string
  highlight?: boolean
}) {
  const display =
    typeof value === 'number'
      ? Number.isFinite(value)
        ? value.toFixed(value < 10 ? 2 : 1)
        : '—'
      : value ?? '—'
  return (
    <div
      className={`rounded border px-2 py-1 ${
        highlight ? 'border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30' : 'bg-zinc-50 dark:bg-zinc-900'
      }`}
    >
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="text-sm font-medium">
        {display} <span className="text-[10px] text-zinc-400">{unit}</span>
      </div>
    </div>
  )
}

export default GlacierMonitor
