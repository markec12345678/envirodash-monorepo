'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { Activity, Users, Eye, Sparkles, TrendingUp, Loader2, X } from 'lucide-react'

interface AnalyticsSummary {
  totalEvents: number
  totalPageViews: number
  totalMonitorOpens: number
  totalApiCalls: number
  totalAiQueries: number
  uniqueUsers: number
  topMonitors: Array<{ name: string; count: number }>
  dailyBreakdown: Array<{ date: string; events: number; users: number }>
}

export function AnalyticsDashboard({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [days, setDays] = useState(7)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?days=${days}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (e) {
      console.error('Analytics load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [days])

  const statCards = data
    ? [
        { label: 'Total Events', value: data.totalEvents, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Unique Users', value: data.uniqueUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
        { label: 'Page Views', value: data.totalPageViews, icon: Eye, color: 'text-violet-600 bg-violet-50' },
        { label: 'AI Queries', value: data.totalAiQueries, icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
      ]
    : []

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📊 Analytics Dashboard</h2>
              <p className="text-xs text-emerald-100">Last {days} days</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="rounded-md bg-white/20 px-2 py-1 text-xs text-white outline-none"
            >
              <option value={1} className="text-zinc-900">24h</option>
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
            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
                    <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded ${stat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                    <div className="text-xs text-zinc-500">{stat.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Daily breakdown chart */}
            <div className="mb-6 rounded-lg border bg-white p-4 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-bold">Daily Activity</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    stroke="#71717a"
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="events" stroke="#10b981" strokeWidth={2} name="Events" />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Users" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top monitors */}
            <div className="rounded-lg border bg-white p-4 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-bold">Top Monitors (by opens)</h3>
              {data.topMonitors.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No monitor opens yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.topMonitors} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#71717a" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e4e4e7',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <p className="mt-4 text-center text-[10px] text-zinc-400">
              Privacy-first analytics · No cookies · No cross-site tracking · IP anonymized
            </p>
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center text-zinc-500">
            Failed to load analytics
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyticsDashboard
