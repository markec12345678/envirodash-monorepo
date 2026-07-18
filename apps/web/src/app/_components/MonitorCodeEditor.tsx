'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Code2, X, Loader2, Upload, Check, AlertTriangle, Eye, FileCode } from 'lucide-react'

const CATEGORIES = [
  'atmospheric', 'climate', 'disaster', 'geological', 'hydrology', 'industrial',
  'infrastructure', 'oceanic', 'other', 'recreation', 'retail', 'services',
  'vegetation', 'weather', 'wildlife', 'environment',
]

const ACCENTS = [
  'emerald', 'teal', 'orange', 'rose', 'amber', 'pink', 'fuchsia',
  'violet', 'purple', 'cyan', 'green', 'red', 'sky', 'yellow', 'stone',
]

const TEMPLATE_CODE = `'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { X, RefreshCw, Loader2 } from 'lucide-react'

// Replace with your monitor's data fetching logic
async function fetchData() {
  // Example: fetch from your API
  // const res = await fetch('/api/your-endpoint')
  // return res.json()
  return {
    results: [
      { id: '1', name: 'Sample Location', lat: 46.05, lng: 14.50, status: 'stable', value: 42 }
    ]
  }
}

export function MyCustomMonitor({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const result = await fetchData()
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📊 My Monitor</h2>
          <div className="flex gap-1">
            <button onClick={load} className="rounded-md p-1.5 hover:bg-white/20">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            {onClose && <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
        ) : data?.results?.length ? (
          <ul className="space-y-2">
            {data.results.map((r: any) => (
              <li key={r.id} className="rounded-lg border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{r.name}</span>
                  <span className="font-bold">{r.value}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-zinc-500 py-8">No data</p>
        )}
      </div>
    </div>
  )
}

export default MyCustomMonitor
`

export function MonitorCodeEditor({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('environment')
  const [icon, setIcon] = useState('circle')
  const [accent, setAccent] = useState('emerald')
  const [tags, setTags] = useState('')
  const [sourceCode, setSourceCode] = useState(TEMPLATE_CODE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const publish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/user/published-monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          icon,
          accent,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          sourceCode,
          dataSource: 'Community published',
          realData: true,
          version: '1.0.0',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(`Monitor "${name}" published successfully! It's now available in the community registry.`)
      setName('')
      setDescription('')
      setTags('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📝 Monitor Code Editor</h2>
              <p className="text-xs text-emerald-100">Create and publish your own monitor</p>
            </div>
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
              <Code2 className="mb-2 h-12 w-12 text-zinc-400" />
              <p className="text-sm font-medium">Sign in to create monitors</p>
            </div>
          ) : (
            <form onSubmit={publish} className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Monitor name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Custom Monitor"
                    required
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this monitor tracks..."
                  required
                  rows={2}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Icon (Lucide)</label>
                  <input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="circle"
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Accent color</label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {ACCENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Tags (comma-sep)</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="slovenia, water, real-time"
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              {/* Code editor */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium">
                  <FileCode className="h-3 w-3" />
                  React Component Source Code * (max 50KB)
                </label>
                <div className="relative">
                  <textarea
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    required
                    rows={16}
                    spellCheck={false}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 dark:border-zinc-700"
                    style={{ minHeight: '300px', tabSize: 2 }}
                  />
                  <div className="absolute bottom-2 right-2 rounded bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
                    {sourceCode.length} chars / 50,000
                  </div>
                </div>
              </div>

              {/* Error/Success */}
              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-700">
                  <Check className="mr-1 inline h-3 w-3" />
                  {success}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !name || !description}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Publish to Registry
                </button>
                <button
                  type="button"
                  onClick={() => setSourceCode(TEMPLATE_CODE)}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Reset Template
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default MonitorCodeEditor
