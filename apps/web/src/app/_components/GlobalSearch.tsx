'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, MapPin, Activity, Waves, Mountain, Package, Zap } from 'lucide-react'

interface SearchResult {
  type: 'monitor' | 'community-monitor' | 'earthquake' | 'tsunami' | 'volcano'
  id: string
  title: string
  description: string
  category?: string
  score: number
  meta?: Record<string, any>
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  monitor: { icon: Package, color: 'text-emerald-600 bg-emerald-50', label: 'Monitor' },
  'community-monitor': { icon: Zap, color: 'text-violet-600 bg-violet-50', label: 'Community' },
  earthquake: { icon: Activity, color: 'text-amber-600 bg-amber-50', label: 'Earthquake' },
  tsunami: { icon: Waves, color: 'text-cyan-600 bg-cyan-50', label: 'Tsunami' },
  volcano: { icon: Mountain, color: 'text-rose-600 bg-rose-50', label: 'Volcano' },
}

export function GlobalSearch({ onClose, onResultClick }: { onClose?: () => void; onResultClick?: (result: SearchResult) => void }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [byType, setByType] = useState<Record<string, number>>({})
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      setByType({})
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=30`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
          setByType(data.byType || {})
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const filtered = activeFilter ? results.filter((r) => r.type === activeFilter) : results

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 p-4 pt-20">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b p-3 dark:border-zinc-700">
          <Search className="h-5 w-5 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search monitors, earthquakes, tsunami, volcanoes..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Type filters */}
        {Object.keys(byType).length > 0 && (
          <div className="flex gap-1 border-b p-2 dark:border-zinc-700">
            <button
              onClick={() => setActiveFilter(null)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                !activeFilter ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
              }`}
            >
              All ({results.length})
            </button>
            {Object.entries(byType).map(([type, count]) => {
              const config = TYPE_CONFIG[type]
              if (!config || count === 0) return null
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                    activeFilter === type ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                  }`}
                >
                  {config.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-zinc-400">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Start typing to search across 874 monitors and live environmental data</p>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div className="p-8 text-center text-zinc-400">
              <p className="text-sm">No results for "{query}"</p>
            </div>
          ) : (
            <ul className="divide-y dark:divide-zinc-700">
              {filtered.map((r) => {
                const config = TYPE_CONFIG[r.type] || TYPE_CONFIG.monitor
                const Icon = config.icon
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => onResultClick?.(r)}
                      className="flex w-full items-start gap-3 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{r.title}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-1">{r.description}</p>
                        {r.meta?.magnitude && (
                          <span className="mt-0.5 text-[10px] text-amber-600">M{r.meta.magnitude.toFixed(1)}</span>
                        )}
                        {r.meta?.realData && (
                          <span className="mt-0.5 ml-2 text-[10px] text-emerald-600">✓ Real data</span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2 text-center text-[10px] text-zinc-400 dark:border-zinc-700">
          {results.length > 0 && `${results.length} results · Score-sorted · Searches monitors + live data`}
        </div>
      </div>
    </div>
  )
}

export default GlobalSearch
