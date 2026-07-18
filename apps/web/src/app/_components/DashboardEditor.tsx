'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, X, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, Save } from 'lucide-react'

interface DashboardCard {
  id: string
  type: 'air-quality' | 'wildfire' | 'earthquake' | 'tsunami' | 'volcano' | 'weather' | 'glacier' | 'coral-reef' | 'flood' | 'drought'
  title: string
  params: Record<string, any>
  order: number
}

const AVAILABLE_TYPES: { type: DashboardCard['type']; label: string; defaultParams: Record<string, any> }[] = [
  { type: 'air-quality', label: 'Air Quality', defaultParams: { country: 'SI' } },
  { type: 'wildfire', label: 'Wildfire Risk', defaultParams: { area: 'europe' } },
  { type: 'earthquake', label: 'Earthquakes', defaultParams: { limit: 10 } },
  { type: 'tsunami', label: 'Tsunami', defaultParams: {} },
  { type: 'volcano', label: 'Volcano', defaultParams: {} },
  { type: 'weather', label: 'Weather', defaultParams: { lat: 46.0569, lng: 14.5058, name: 'Ljubljana' } },
  { type: 'glacier', label: 'Glacier', defaultParams: { region: 'alps' } },
  { type: 'coral-reef', label: 'Coral Reef', defaultParams: { region: 'pacific' } },
  { type: 'flood', label: 'Flood', defaultParams: { region: 'europe' } },
  { type: 'drought', label: 'Drought', defaultParams: { region: 'slovenia' } },
]

interface DashboardEditorProps {
  onClose?: () => void
  onSave?: () => void
}

export function DashboardEditor({ onClose, onSave }: DashboardEditorProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cards, setCards] = useState<DashboardCard[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!session) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/user/dashboard')
      if (res.ok) {
        const data = await res.json()
        setCards(data.dashboard?.cards || [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session])

  const addCard = (type: DashboardCard['type']) => {
    const def = AVAILABLE_TYPES.find((t) => t.type === type)!
    const newCard: DashboardCard = {
      id: `card-${Date.now()}`,
      type,
      title: def.label,
      params: def.defaultParams,
      order: cards.length,
    }
    setCards([...cards, newCard])
  }

  const removeCard = (id: string) => {
    setCards(cards.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })))
  }

  const moveCard = (id: string, direction: 'up' | 'down') => {
    const idx = cards.findIndex((c) => c.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= cards.length) return
    const newCards = [...cards]
    ;[newCards[idx], newCards[newIdx]] = [newCards[newIdx], newCards[idx]]
    setCards(newCards.map((c, i) => ({ ...c, order: i })))
  }

  const updateTitle = (id: string, title: string) => {
    setCards(cards.map((c) => (c.id === id ? { ...c, title } : c)))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSave?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/dashboard', { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        setCards(data.dashboard.cards)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div>
            <h2 className="text-lg font-bold">🎛️ Customize Dashboard</h2>
            <p className="text-xs text-emerald-100">Pick monitors and reorder cards</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!session ? (
            <div className="flex flex-col items-center py-12 text-zinc-500">
              <p className="text-sm font-medium">Sign in to customize your dashboard</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              {/* Available types */}
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">Add monitors</h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => addCard(t.type)}
                      className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                      <Plus className="h-3 w-3" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current cards */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">
                  Your dashboard ({cards.length} cards)
                </h3>
                {cards.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No cards yet. Add monitors above.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cards.map((card, idx) => (
                      <li key={card.id} className="flex items-center gap-2 rounded-lg border bg-white p-3 dark:bg-zinc-800">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveCard(card.id, 'up')}
                            disabled={idx === 0}
                            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-700"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveCard(card.id, 'down')}
                            disabled={idx === cards.length - 1}
                            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-700"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <input
                            value={card.title}
                            onChange={(e) => updateTitle(card.id, e.target.value)}
                            className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-zinc-200 focus:border-emerald-400 focus:outline-none dark:hover:border-zinc-700"
                          />
                          <p className="text-[10px] text-zinc-500">
                            Type: {card.type} · Params: {JSON.stringify(card.params)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeCard(card.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {session && (
          <div className="flex items-center justify-between border-t bg-zinc-50 p-3 dark:bg-zinc-950/30">
            <button
              onClick={reset}
              disabled={saving}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-3 w-3" />
              Reset to default
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardEditor
