'use client'

/**
 * Air Quality Monitor — React component
 * Displays real-time PM2.5, PM10, NO2, SO2, O3, CO and US AQI from Open-Meteo.
 */

import { useEffect, useState } from 'react'
import { Wind, RefreshCw, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fetchAirQuality, type AirQualityQuery } from './api'
import { STATUS_COLORS, STATUS_LABELS_EN, type MonitorLocation } from '@envirodash/core'

export interface AirQualityMonitorProps {
  /** Initial query — single point or country. */
  query?: AirQualityQuery
  /** Called when the user closes the panel. */
  onClose?: () => void
  /** Called when the user requests a refresh. */
  onRefresh?: () => void
  /** Show the close button (default: true). */
  showClose?: boolean
}

export function AirQualityMonitor({
  query = { country: 'SI' },
  onClose,
  onRefresh,
  showClose = true,
}: AirQualityMonitorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<MonitorLocation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [source, setSource] = useState<string>('Open-Meteo Air Quality API')
  const [fetchedAt, setFetchedAt] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAirQuality(query)
      setLocations(data.results)
      setSource(data.source)
      setFetchedAt(data.fetchedAt)
      if (data.results.length > 0 && !activeId) {
        setActiveId(data.results[0].id)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.lat, query.lng, query.country, query.limit])

  const active = locations.find((l) => l.id === activeId)

  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">💨 Air Quality</h2>
              <p className="text-xs text-emerald-100">Real-time monitoring</p>
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
            {showClose && (
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-white hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
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
            <p className="text-sm">Loading air quality data…</p>
          </div>
        )}

        {locations.length > 0 && (
          <>
            {/* Locations list */}
            <ul className="mb-3 space-y-1">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <button
                    onClick={() => setActiveId(loc.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      activeId === loc.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-medium">{loc.name}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[loc.status]
                        }`}
                      >
                        {STATUS_LABELS_EN[loc.status]}
                      </span>
                      {loc.value != null && (
                        <span className="font-bold">{loc.value}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Active detail card */}
            {active && (
              <div className="rounded-lg border bg-white p-3 dark:bg-zinc-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{active.name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[active.status]
                    }`}
                  >
                    {STATUS_LABELS_EN[active.status]}
                  </span>
                </div>

                {active.metrics && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Metric label="PM2.5" value={active.metrics.pm25} unit="µg/m³" />
                    <Metric label="PM10" value={active.metrics.pm10} unit="µg/m³" />
                    <Metric label="NO₂" value={active.metrics.no2} unit="µg/m³" />
                    <Metric label="SO₂" value={active.metrics.so2} unit="µg/m³" />
                    <Metric label="O₃" value={active.metrics.o3} unit="µg/m³" />
                    <Metric label="CO" value={active.metrics.co} unit="µg/m³" />
                    <Metric label="US AQI" value={active.metrics.us_aqi} unit="index" highlight />
                  </div>
                )}

                {active.description && (
                  <p className="mt-2 text-xs text-zinc-500">{active.description}</p>
                )}
                {active.lastUpdated && (
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Updated: {new Date(active.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 text-[10px] text-zinc-400">
              Source: {source}
              {fetchedAt && ` · Fetched: ${new Date(fetchedAt).toLocaleTimeString()}`}
            </p>
          </>
        )}

        {!loading && !error && locations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
            <p className="text-sm">No air quality data available for this location.</p>
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
        ? value.toFixed(value < 10 ? 1 : 0)
        : '—'
      : value ?? '—'
  return (
    <div
      className={`rounded border px-2 py-1 ${
        highlight
          ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
          : 'bg-zinc-50 dark:bg-zinc-900'
      }`}
    >
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="text-sm font-medium">
        {display} <span className="text-[10px] text-zinc-400">{unit}</span>
      </div>
    </div>
  )
}

export default AirQualityMonitor
