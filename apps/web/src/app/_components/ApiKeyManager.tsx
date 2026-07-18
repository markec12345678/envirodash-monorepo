'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Key, Plus, Trash2, X, Loader2, Copy, Check, AlertTriangle } from 'lucide-react'

interface ApiKeyInfo {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  requestCount: number
}

export function ApiKeyManager({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    if (!session) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/user/api-keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewlyCreatedKey(data.key)
      setNewKeyName('')
      setShowCreate(false)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    setActionLoading(true)
    try {
      await fetch(`/api/user/api-keys?id=${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setActionLoading(false)
    }
  }

  const copyKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed right-4 top-16 z-[60] flex max-h-[85vh] w-[420px] flex-col overflow-hidden rounded-xl border-2 border-zinc-700 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🔑 API Keys</h2>
              <p className="text-xs text-zinc-300">Programmatic access to EnviroDash</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-md bg-white/20 p-1.5 text-white hover:bg-white/30"
              aria-label="Create new key"
            >
              <Plus className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-md p-1.5 text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Newly created key (shown once) */}
        {newlyCreatedKey && (
          <div className="mb-4 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3 dark:bg-emerald-950/30">
            <div className="mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                API Key Created — Save It Now!
              </p>
            </div>
            <p className="mb-2 text-xs text-emerald-700 dark:text-emerald-400">
              This key will be shown only once. Copy it now and store it securely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs dark:bg-zinc-900">
                {newlyCreatedKey}
              </code>
              <button
                onClick={copyKey}
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="mt-2 text-xs text-zinc-500 hover:underline"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form onSubmit={create} className="mb-4 rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-800">
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Key name (for your reference)
            </label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Dashboard"
              required
              className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Generate Key
            </button>
          </form>
        )}

        {!session ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Key className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm font-medium">Sign in to manage API keys</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Key className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm font-medium">No API keys yet</p>
            <p className="mt-1 text-xs">Click + to generate your first key.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="rounded-lg border p-3 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{k.name}</p>
                    <code className="text-[10px] text-zinc-500">{k.keyPrefix}</code>
                  </div>
                  <button
                    onClick={() => revoke(k.id)}
                    disabled={actionLoading}
                    className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
                  <div>
                    <strong>Created:</strong> {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Requests:</strong> {k.requestCount}
                  </div>
                  {k.lastUsedAt && (
                    <div className="col-span-2">
                      <strong>Last used:</strong> {new Date(k.lastUsedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Usage example */}
        {keys.length > 0 && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs dark:bg-blue-950/30">
            <p className="font-bold text-blue-700 dark:text-blue-300">Usage example:</p>
            <pre className="mt-1 overflow-x-auto text-[10px] text-blue-700 dark:text-blue-400">
{`curl -H "Authorization: Bearer ed_live_xxx" \\
  "http://localhost:3000/api/v1?type=air-quality&country=SI"`}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiKeyManager
