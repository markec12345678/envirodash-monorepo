'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, Legend,
} from 'recharts'
import { Loader2, AlertTriangle, Activity } from 'lucide-react'

interface HistoryChartProps {
  /** API endpoint, e.g. '/api/air-quality/history' */
  endpoint: string
  /** Query params */
  params: Record<string, string | number>
  /** Which metric to plot */
  metric: 'aqi' | 'pm25' | 'temperature' | 'humidity' | 'precipitation'
  /** Chart title */
  title: string
  /** Color for the line */
  color?: string
  /** Y-axis label */
  yLabel?: string
  /** Hours to fetch (default 24) */
  hours?: number
  /** Days to fetch (overrides hours) */
  days?: number
}

const METRIC_CONFIG: Record<string, { color: string; yLabel: string; thresholds?: { value: number; color: string; label: string }[] }> = {
  aqi: {
    color: '#10b981',
    yLabel: 'US AQI',
    thresholds: [
      { value: 50, color: '#10b981', label: 'Good' },
      { value: 100, color: '#3b82f6', label: 'Moderate' },
      { value: 150, color: '#f59e0b', label: 'Unhealthy (sensitive)' },
      { value: 200, color: '#ef4444', label: 'Unhealthy' },
    ],
  },
  pm25: {
    color: '#8b5cf6',
    yLabel: 'PM2.5 (µg/m³)',
    thresholds: [
      { value: 12, color: '#10b981', label: 'WHO 24h guideline' },
      { value: 35, color: '#f59e0b', label: 'EPA standard' },
    ],
  },
  temperature: {
    color: '#f97316',
    yLabel: 'Temperature (°C)',
  },
  humidity: {
    color: '#0ea5e9',
    yLabel: 'Humidity (%)',
  },
  precipitation: {
    color: '#06b6d4',
    yLabel: 'Precipitation (mm)',
  },
}

interface SeriesPoint {
  time: string
  [key: string]: any
}

interface HistoryResponse {
  location: { lat: number; lng: number }
  range: { start: string; end: string; hours: number }
  source: string
  stats: {
    avgAqi?: number | null
    maxAqi?: number | null
    minAqi?: number | null
    avgPm25?: number | null
    maxPm25?: number | null
    minPm25?: number | null
    avgTemp?: number | null
    maxTemp?: number | null
    minTemp?: number | null
    avgHumidity?: number | null
    totalPrecip?: number | null
    samples: number
  }
  series: SeriesPoint[]
  fetchedAt: string
}

export function HistoryChart({
  endpoint,
  params,
  metric,
  title,
  color,
  yLabel,
  hours = 24,
  days = 0,
}: HistoryChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HistoryResponse | null>(null)

  const config = METRIC_CONFIG[metric]
  const lineColor = color || config.color
  const yAxisLabel = yLabel || config.yLabel

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const q = new URLSearchParams({
          ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
          ...(days > 0 ? { days: String(days) } : { hours: String(hours) }),
        })
        const res = await fetch(`${endpoint}?${q}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [endpoint, JSON.stringify(params), metric, hours, days])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-white dark:bg-zinc-800">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30">
        <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    )
  }

  if (!data || data.series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-white dark:bg-zinc-800">
        <span className="text-sm text-zinc-500">No data available</span>
      </div>
    )
  }

  // Format data for chart - sample to ~24 points max for readability
  const allPoints = data.series
  const step = Math.max(1, Math.floor(allPoints.length / 24))
  const chartData = allPoints
    .filter((_, i) => i % step === 0)
    .map((p) => ({
      time: new Date(p.time).toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      value: p[metric] != null ? Number(p[metric]) : null,
    }))
    .filter((p) => p.value != null)

  // Get stats for this metric
  const stats: Record<string, string> = {}
  if (metric === 'aqi') {
    stats.Avg = String(data.stats.avgAqi ?? '—')
    stats.Max = String(data.stats.maxAqi ?? '—')
    stats.Min = String(data.stats.minAqi ?? '—')
  } else if (metric === 'pm25') {
    stats.Avg = String(data.stats.avgPm25 ?? '—')
    stats.Max = String(data.stats.maxPm25 ?? '—')
    stats.Min = String(data.stats.minPm25 ?? '—')
  } else if (metric === 'temperature') {
    stats.Avg = `${data.stats.avgTemp ?? '—'}°C`
    stats.Max = `${data.stats.maxTemp ?? '—'}°C`
    stats.Min = `${data.stats.minTemp ?? '—'}°C`
  } else if (metric === 'humidity') {
    stats.Avg = `${data.stats.avgHumidity ?? '—'}%`
  } else if (metric === 'precipitation') {
    stats.Total = `${data.stats.totalPrecip ?? '—'} mm`
  }
  stats.Samples = String(data.stats.samples)

  return (
    <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: lineColor }} />
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
          {Object.entries(stats).map(([k, v]) => (
            <span key={k} className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-900">
              <strong>{k}:</strong> {v}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#71717a" />
          <YAxis tick={{ fontSize: 10 }} stroke="#71717a" label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#71717a' } }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#71717a', fontSize: 10 }}
          />
          {config.thresholds?.map((t) => (
            <ReferenceLine
              key={t.value}
              y={t.value}
              stroke={t.color}
              strokeDasharray="5 5"
              label={{ value: `${t.value} ${t.label}`, position: 'right', fill: t.color, fontSize: 9 }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#gradient-${metric})`}
            name={yAxisLabel}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>📍 {data.location.lat.toFixed(2)}, {data.location.lng.toFixed(2)}</span>
        <span>{days > 0 ? `${days} days` : `${hours}h`} · {data.range.start} → {data.range.end}</span>
        <span>{data.source}</span>
      </div>
    </div>
  )
}

export default HistoryChart
