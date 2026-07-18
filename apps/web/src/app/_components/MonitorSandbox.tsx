'use client'

import { useEffect, useState } from 'react'
import { Package, X, Loader2, Search, Star, Download, Code2, Eye, AlertTriangle } from 'lucide-react'

interface PublishedMonitor {
  id: string
  publisherName: string
  name: string
  description: string
  category: string
  icon: string
  accent: string
  version: string
  publishedAt: string
  downloadCount: number
  rating: number
  ratingCount: number
  tags: string[]
  sourceCode?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  atmospheric: 'Atmospheric', climate: 'Climate', disaster: 'Disaster',
  geological: 'Geological', hydrology: 'Hydrology', industrial: 'Industrial',
  infrastructure: 'Infrastructure', oceanic: 'Oceanic', other: 'Other',
  recreation: 'Recreation', retail: 'Retail', services: 'Services',
  vegetation: 'Vegetation', weather: 'Weather', wildlife: 'Wildlife',
  environment: 'Environment',
}

export function MonitorSandbox({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [monitors, setMonitors] = useState<PublishedMonitor[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'downloads' | 'rating'>('newest')
  const [selected, setSelected] = useState<PublishedMonitor | null>(null)
  const [sourceCode, setSourceCode] = useState<string | null>(null)
  const [loadingSource, setLoadingSource] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/monitor-registry?sort=${sort}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setMonitors(data.monitors || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [sort])

  const viewSource = async (monitor: PublishedMonitor) => {
    setSelected(monitor)
    setLoadingSource(true)
    setSourceCode(null)
    try {
      const res = await fetch(`/api/monitor-registry/${monitor.id}`)
      if (res.ok) {
        const data = await res.json()
        setSourceCode(data.monitor?.sourceCode || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSource(false)
    }
  }

  const rate = async (id: string, rating: number) => {
    try {
      await fetch(`/api/monitor-registry/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, userId: 'anonymous' }),
      })
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = monitors.filter((m) => {
    if (search) {
      const hay = `${m.name} ${m.description} ${m.tags?.join(' ') || ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📦 Community Monitor Sandbox</h2>
              <p className="text-xs text-emerald-100">Browse, preview, and rate community-published monitors</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="border-b bg-zinc-50 p-3 dark:bg-zinc-950/30">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search community monitors..."
                className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="newest">Newest</option>
              <option value="downloads">Most Downloaded</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Monitor list */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                <Package className="mb-2 h-12 w-12 text-zinc-400" />
                <p className="text-sm font-medium">No community monitors yet</p>
                <p className="mt-1 text-xs">Use the Code Editor to publish your first monitor!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-shadow hover:shadow-md ${
                      selected?.id === m.id
                        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                    }`}
                    onClick={() => viewSource(m)}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold">{m.name}</h3>
                        <p className="text-[10px] text-zinc-500">by {m.publisherName} · v{m.version}</p>
                      </div>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium dark:bg-zinc-700">
                        {CATEGORY_LABELS[m.category] || m.category}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{m.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-0.5">
                        <Download className="h-3 w-3" /> {m.downloadCount || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3" /> {m.rating?.toFixed(1) || '—'} ({m.ratingCount || 0})
                      </span>
                      <span>{new Date(m.publishedAt).toLocaleDateString()}</span>
                    </div>
                    {m.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source code preview */}
          {selected && (
            <div className="w-96 border-l border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold">{selected.name}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col" style={{ height: 'calc(100% - 50px)' }}>
                {/* Rating */}
                <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="mb-1 text-[10px] font-medium text-zinc-500">Rate this monitor:</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => rate(selected.id, star)}
                        className="text-zinc-300 hover:text-amber-400"
                      >
                        <Star className="h-4 w-4" fill={star <= Math.round(selected.rating || 0) ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                    <span className="ml-2 text-[10px] text-zinc-500">
                      {selected.rating?.toFixed(1) || '—'} ({selected.ratingCount || 0} ratings)
                    </span>
                  </div>
                </div>

                {/* Source code */}
                <div className="flex-1 overflow-y-auto bg-zinc-950 p-3">
                  {loadingSource ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                    </div>
                  ) : sourceCode ? (
                    <pre className="text-[10px] leading-relaxed text-zinc-100">
                      <code>{sourceCode}</code>
                    </pre>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                      <AlertTriangle className="mb-2 h-8 w-8" />
                      <p className="text-xs">Source code not available</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>👤 {selected.publisherName}</span>
                    <span>📦 v{selected.version}</span>
                    <span>📅 {new Date(selected.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-[9px] text-zinc-400">
                    Downloads: {selected.downloadCount || 0} · Category: {CATEGORY_LABELS[selected.category] || selected.category}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MonitorSandbox
