'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, FunnelChart, Funnel, LabelList,
  RadialBarChart, RadialBar,
} from 'recharts'
import { Loader2, X, TrendingUp, Users, Activity, Smartphone, Monitor, Tablet } from 'lucide-react'

interface AdvancedData {
  period: { days: number; from: string; to: string }
  totalEvents: number
  uniqueUsers: number
  featureAdoption: Array<{ feature: string; count: number }>
  funnel: { visited: number; opened_monitor: number; used_api: number; used_ai: number }
  deviceBreakdown: { mobile: number; desktop: number; tablet: number; unknown: number }
  heatmap: Array<{ day: string; dayIdx: number; hour: number; count: number }>
  monitorPopularity: Array<{ name: string; count: number }>
  dau: Array<{ date: string; activeUsers: number; totalEvents: number }>
  apiTrends: Array<{ type: string; count: number }>
  cohorts: Array<{ week: string; size: number }>
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AdvancedAnalyticsDashboard({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AdvancedData | null>(null)
  const [days, setDays] = useState(30)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/advanced?days=${days}`)
      if (res.ok) setData(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days])

  const funnelData = data ? [
    { name: 'Visited', value: data.funnel.visited, fill: '#10b981' },
    { name: 'Opened Monitor', value: data.funnel.opened_monitor, fill: '#3b82f6' },
    { name: 'Used API', value: data.funnel.used_api, fill: '#8b5cf6' },
    { name: 'Used AI', value: data.funnel.used_ai, fill: '#f59e0b' },
  ].filter((d) => d.value > 0) : []

  const deviceData = data ? [
    { name: 'Desktop', value: data.deviceBreakdown.desktop, fill: '#3b82f6', icon: Monitor },
    { name: 'Mobile', value: data.deviceBreakdown.mobile, fill: '#10b981', icon: Smartphone },
    { name: 'Tablet', value: data.deviceBreakdown.tablet, fill: '#f59e0b', icon: Tablet },
    { name: 'Unknown', value: data.deviceBreakdown.unknown, fill: '#a1a1aa', icon: Activity },
  ].filter((d) => d.value > 0) : []

  const totalDevices = deviceData.reduce((sum, d) => sum + d.value, 0)

  // Heatmap grid (7 days x 24 hours)
  const heatmapGrid = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const cell = data?.heatmap.find((h) => h.dayIdx === day && h.hour === hour)
      return cell?.count || 0
    })
  )
  const maxHeat = Math.max(...heatmapGrid.flat(), 1)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📈 Advanced Analytics</h2>
              <p className="text-xs text-emerald-100">Cohorts, funnels, retention & device breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="rounded-md bg-white/20 px-2 py-1 text-xs text-white outline-none"
            >
              <option value={7} className="text-zinc-900">7 days</option>
              <option value={30} className="text-zinc-900">30 days</option>
              <option value={90} className="text-zinc-900">90 days</option>
            </select>
            {onClose && (
              <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total Events" value={data.totalEvents} icon={Activity} color="text-emerald-600 bg-emerald-50" />
              <StatCard label="Unique Users" value={data.uniqueUsers} icon={Users} color="text-blue-600 bg-blue-50" />
              <StatCard label="Avg DAU" value={Math.round(data.dau.reduce((s, d) => s + d.activeUsers, 0) / data.dau.length)} icon={TrendingUp} color="text-violet-600 bg-violet-50" />
              <StatCard label="Features Used" value={data.featureAdoption.length} icon={Activity} color="text-amber-600 bg-amber-50" />
            </div>

            {/* DAU chart */}
            <div className="mb-6 rounded-lg border bg-white p-4 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-bold">Daily Active Users & Events</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dau}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} name="Active Users" />
                  <Line type="monotone" dataKey="totalEvents" stroke="#3b82f6" strokeWidth={2} name="Events" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Funnel */}
              <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
                <h3 className="mb-3 text-sm font-bold">User Funnel</h3>
                {funnelData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">No funnel data</p>
                ) : (
                  <div className="space-y-2">
                    {funnelData.map((stage, i) => {
                      const pct = i === 0 ? 100 : Math.round((stage.value / funnelData[0].value) * 100)
                      return (
                        <div key={stage.name}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="font-medium">{stage.name}</span>
                            <span className="text-zinc-500">{stage.value} ({pct}%)</span>
                          </div>
                          <div className="h-6 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                            <div
                              className="flex h-full items-center justify-end rounded-full px-2 text-[10px] font-bold text-white"
                              style={{ width: `${pct}%`, backgroundColor: stage.fill }}
                            >
                              {stage.value}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Device breakdown */}
              <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
                <h3 className="mb-3 text-sm font-bold">Device Breakdown</h3>
                {totalDevices === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {deviceData.map((d) => {
                      const Icon = d.icon
                      const pct = Math.round((d.value / totalDevices) * 100)
                      return (
                        <div key={d.name}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Icon className="h-3 w-3" /> {d.name}
                            </span>
                            <span className="text-zinc-500">{d.value} ({pct}%)</span>
                          </div>
                          <div className="h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.fill }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Heatmap */}
            <div className="mb-6 rounded-lg border bg-white p-4 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-bold">Activity Heatmap (Day × Hour)</h3>
              <div className="overflow-x-auto">
                <div className="flex gap-0.5" style={{ minWidth: '600px' }}>
                  <div className="flex flex-col gap-0.5 pr-1 pt-5">
                    {DAY_NAMES.map((day) => (
                      <div key={day} className="flex h-5 items-center text-[9px] text-zinc-500">{day}</div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="mb-0.5 flex gap-0.5">
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="flex-1 text-center text-[7px] text-zinc-400">{h}</div>
                      ))}
                    </div>
                    {heatmapGrid.map((row, dayIdx) => (
                      <div key={dayIdx} className="mb-0.5 flex gap-0.5">
                        {row.map((count, hour) => {
                          const intensity = count / maxHeat
                          const bg = count === 0
                            ? 'bg-zinc-100 dark:bg-zinc-800'
                            : intensity < 0.25
                              ? 'bg-emerald-200 dark:bg-emerald-900'
                              : intensity < 0.5
                                ? 'bg-emerald-400 dark:bg-emerald-700'
                                : intensity < 0.75
                                  ? 'bg-emerald-500 dark:bg-emerald-600'
                                  : 'bg-emerald-600 dark:bg-emerald-500'
                          return (
                            <div
                              key={hour}
                              className={`h-5 flex-1 rounded-sm ${bg}`}
                              title={`${DAY_NAMES[dayIdx]} ${hour}:00 — ${count} events`}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature adoption + API trends */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
                <h3 className="mb-3 text-sm font-bold">Feature Adoption</h3>
                {data.featureAdoption.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.featureAdoption.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="#71717a" />
                      <YAxis type="category" dataKey="feature" tick={{ fontSize: 9 }} stroke="#71717a" width={100} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
                <h3 className="mb-3 text-sm font-bold">API Usage by Type</h3>
                {data.apiTrends.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">No API calls</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.apiTrends.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="#71717a" />
                      <YAxis type="category" dataKey="type" tick={{ fontSize: 9 }} stroke="#71717a" width={100} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Cohort analysis */}
            <div className="mt-4 rounded-lg border bg-white p-4 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-bold">User Cohorts (by signup week)</h3>
              {data.cohorts.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">No cohort data</p>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={data.cohorts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="#71717a" tickFormatter={(w) => w.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="size" fill="#06b6d4" radius={[4, 4, 0, 0]} name="New Users" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <p className="mt-4 text-center text-[10px] text-zinc-400">
              Advanced analytics · {data.totalEvents} events analyzed · Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center text-zinc-500">Failed to load</div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}

export default AdvancedAnalyticsDashboard
