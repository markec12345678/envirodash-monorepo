'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Store, Search, X, Loader2, Check, Plus, Trash2, Filter } from 'lucide-react'
import type { MonitorManifest } from '@envirodash/core'

interface MarketplaceProps {
  onClose?: () => void
  onInstall?: (monitorId: string) => void
  onUninstall?: (monitorId: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  atmospheric: 'Atmospheric',
  climate: 'Climate',
  disaster: 'Disaster',
  geological: 'Geological',
  hydrology: 'Hydrology',
  industrial: 'Industrial',
  infrastructure: 'Infrastructure',
  oceanic: 'Oceanic',
  other: 'Other',
  recreation: 'Recreation',
  retail: 'Retail',
  services: 'Services',
  vegetation: 'Vegetation',
  weather: 'Weather',
  wildlife: 'Wildlife',
}

const CATEGORY_COLORS: Record<string, string> = {
  atmospheric: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  climate: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  disaster: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  geological: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  hydrology: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  industrial: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  infrastructure: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  oceanic: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  other: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  recreation: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  retail: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  services: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  vegetation: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  weather: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  wildlife: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
}

export function Marketplace({ onClose, onInstall, onUninstall }: MarketplaceProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [monitors, setMonitors] = useState<MonitorManifest[]>([])
  const [categories, setCategories] = useState<Record<string, number>>({})
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [filterRealData, setFilterRealData] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadMarketplace = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketplace')
      const data = await res.json()
      setMonitors(data.monitors || [])
      setCategories(data.categories || {})
    } catch (e) {
      console.error('Failed to load marketplace:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadInstalled = async () => {
    if (!session) return
    try {
      const res = await fetch('/api/user/monitors')
      if (res.ok) {
        const data = await res.json()
        setInstalled(new Set(data.installed || []))
      }
    } catch (e) {
      // Not logged in — that's OK, show empty installed set
    }
  }

  useEffect(() => {
    loadMarketplace()
    loadInstalled()
  }, [session])

  const handleInstall = async (monitorId: string) => {
    if (!session) {
      alert('Please sign in to install monitors')
      return
    }
    setActionLoading(monitorId)
    try {
      const res = await fetch('/api/user/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitorId }),
      })
      if (res.ok) {
        const data = await res.json()
        setInstalled(new Set(data.installed))
        onInstall?.(monitorId)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleUninstall = async (monitorId: string) => {
    if (!session) return
    setActionLoading(monitorId)
    try {
      const res = await fetch(`/api/user/monitors?monitorId=${monitorId}`, { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        setInstalled(new Set(data.installed))
        onUninstall?.(monitorId)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = monitors.filter((m) => {
    if (activeCategory && m.category !== activeCategory) return false
    if (filterRealData && !m.realData) return false
    if (search) {
      const hay = `${m.name} ${m.description} ${m.id}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">📦 EnviroDash Marketplace</h2>
                <p className="text-xs text-emerald-100">
                  {monitors.length} monitors available · {installed.size} installed
                </p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="rounded-md p-2 text-white hover:bg-white/20" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="border-b bg-zinc-50 p-4 dark:bg-zinc-950/30">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search monitors..."
                className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <button
              onClick={() => setFilterRealData(!filterRealData)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium ${
                filterRealData
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Filter className="h-3 w-3" />
              Real Data Only
            </button>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              >
                {CATEGORY_LABELS[activeCategory] || activeCategory}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.entries(categories)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
                  }`}
                >
                  {CATEGORY_LABELS[cat] || cat} ({count})
                </button>
              ))}
          </div>
        </div>

        {/* Monitors grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-500">
              <p>No monitors found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => {
                const isInstalled = installed.has(m.id)
                const isLoading = actionLoading === m.id
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-3 transition-shadow hover:shadow-md ${
                      isInstalled
                        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold">{m.name}</h3>
                        <p className="text-[10px] text-zinc-500">{m.dataSource}</p>
                      </div>
                      {m.realData && (
                        <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          Real
                        </span>
                      )}
                    </div>

                    <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {m.description}
                    </p>

                    <div className="mb-3 flex items-center gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other
                        }`}
                      >
                        {CATEGORY_LABELS[m.category] || m.category}
                      </span>
                      {!m.free && (
                        <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          PRO
                        </span>
                      )}
                    </div>

                    {isInstalled ? (
                      <button
                        onClick={() => handleUninstall(m.id)}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            Installed · Click to remove
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(m.id)}
                        disabled={isLoading || !session}
                        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            Install
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-zinc-50 p-3 text-center text-xs text-zinc-500 dark:bg-zinc-950/30">
          {session ? (
            <span>Signed in as <strong>{session.user?.email}</strong> · {installed.size} monitors installed</span>
          ) : (
            <span>Sign in to install monitors and sync across devices</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Marketplace
