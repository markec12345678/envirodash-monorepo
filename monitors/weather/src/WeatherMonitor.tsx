'use client'

import { useEffect, useState } from 'react'
import { CloudSun, RefreshCw, X, Loader2, AlertTriangle } from 'lucide-react'
import { fetchWeather, type WeatherQuery } from './api'
import { STATUS_COLORS, STATUS_LABELS_EN, type MonitorLocation } from '@envirodash/core'

export interface WeatherMonitorProps {
  query: WeatherQuery
  onClose?: () => void
  showClose?: boolean
}

export function WeatherMonitor({ query, onClose, showClose = true }: WeatherMonitorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<MonitorLocation | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWeather(query)
      setLocation(data.results[0] || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.lat, query.lng, query.name])

  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-sky-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">⛅ Weather</h2>
              <p className="text-xs text-sky-100">Open-Meteo forecast</p>
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

        {loading && !location && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading weather data…</p>
          </div>
        )}

        {location && (
          <>
            <div className="mb-3 rounded-lg border bg-white p-3 dark:bg-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{location.name}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[location.status]}`}>
                  {STATUS_LABELS_EN[location.status]}
                </span>
              </div>
              <div className="text-4xl font-bold">
                {location.value?.toFixed(1)}°C
              </div>
              {location.description && <p className="mt-1 text-xs text-zinc-500">{location.description}</p>}
            </div>

            {location.metrics && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Metric label="Humidity" value={location.metrics.humidity} unit="%" />
                <Metric label="Wind" value={location.metrics.wind} unit="km/h" />
                <Metric label="Precipitation" value={location.metrics.precipitation} unit="mm" />
                <Metric label="Wind dir" value={location.metrics.wind_direction} unit="°" />
              </div>
            )}

            {location.lastUpdated && (
              <p className="mt-3 text-[10px] text-zinc-400">
                Updated: {new Date(location.lastUpdated).toLocaleString()}
              </p>
            )}
            <p className="mt-1 text-[10px] text-zinc-400">Source: Open-Meteo Forecast API</p>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, unit }: { label: string; value: number | string | undefined; unit: string }) {
  const display = typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(value < 10 ? 1 : 0) : '—') : value ?? '—'
  return (
    <div className="rounded border bg-zinc-50 px-2 py-1 dark:bg-zinc-900">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="text-sm font-medium">{display} <span className="text-[10px] text-zinc-400">{unit}</span></div>
    </div>
  )
}

export default WeatherMonitor
