'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Webhook, Plus, Trash2, X, Loader2, Send, Check, AlertTriangle, Power } from 'lucide-react'

interface WebhookRecord {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  minSeverity: 'warning' | 'critical'
  active: boolean
  createdAt: string
  lastTriggeredAt?: string
  lastResponseStatus?: number
  triggerCount: number
  failureCount: number
}

const EVENT_TYPES = [
  { id: 'earthquake', label: 'Earthquakes (M5+)', icon: '🌎' },
  { id: 'tsunami', label: 'Tsunami Warnings', icon: '🌊' },
  { id: 'air-quality', label: 'Critical Air Quality', icon: '💨' },
  { id: 'wildfire', label: 'High Wildfire Risk', icon: '🔥' },
  { id: 'volcano', label: 'Volcano Alerts', icon: '🌋' },
]

export function WebhookManager({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

  // Form state
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['earthquake'])
  const [minSeverity, setMinSeverity] = useState<'warning' | 'critical'>('warning')

  const load = async () => {
    if (!session) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/user/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
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
    setActionLoading('create')
    setError(null)
    try {
      const res = await fetch('/api/user/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events, minSeverity }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewlyCreatedSecret(data.webhook.secret)
      setName(''); setUrl(''); setEvents(['earthquake']); setMinSeverity('warning')
      setShowCreate(false)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    setActionLoading(`delete-${id}`)
    try {
      await fetch(`/api/user/webhooks?id=${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  const toggle = async (id: string, active: boolean) => {
    setActionLoading(`toggle-${id}`)
    try {
      await fetch(`/api/user/webhooks?id=${id}&active=${!active}`, { method: 'PATCH' })
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  const test = async (id: string) => {
    setActionLoading(`test-${id}`)
    setTestResults((prev) => ({ ...prev, [id]: { success: false, message: 'Sending test...' } }))
    try {
      const res = await fetch(`/api/webhooks/test?id=${id}`, { method: 'POST' })
      const data = await res.json()
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: data.success, message: data.message },
      }))
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: e.message },
      }))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="fixed right-4 top-16 z-[60] flex max-h-[85vh] w-[440px] flex-col overflow-hidden rounded-xl border-2 border-purple-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-purple-600 to-fuchsia-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🔌 Webhooks</h2>
              <p className="text-xs text-purple-100">External integrations for alerts</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-md bg-white/20 p-1.5 text-white hover:bg-white/30"
            >
              <Plus className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-md p-1.5 text-white hover:bg-white/30">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Newly created secret */}
        {newlyCreatedSecret && (
          <div className="mb-4 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3 dark:bg-emerald-950/30">
            <div className="mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Webhook Secret — Save It Now!
              </p>
            </div>
            <p className="mb-2 text-xs text-emerald-700 dark:text-emerald-400">
              Use this secret to verify webhook signatures (HMAC-SHA256).
            </p>
            <code className="block w-full break-all rounded bg-white px-2 py-1 text-[10px] dark:bg-zinc-900">
              {newlyCreatedSecret}
            </code>
            <button
              onClick={() => setNewlyCreatedSecret(null)}
              className="mt-2 text-xs text-zinc-500 hover:underline"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form onSubmit={create} className="mb-4 rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-800">
            <label className="mb-1 block text-xs font-medium">Webhook name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Slack #alerts"
              required
              className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <label className="mb-1 block text-xs font-medium">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              required
              type="url"
              className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <label className="mb-1 block text-xs font-medium">Events to subscribe</label>
            <div className="mb-2 flex flex-wrap gap-1">
              {EVENT_TYPES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setEvents((prev) =>
                      prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]
                    )
                  }}
                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                    events.includes(e.id)
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-700'
                  }`}
                >
                  {e.icon} {e.label}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs font-medium">Minimum severity</label>
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value as 'warning' | 'critical')}
              className="mb-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="warning">Warning + Critical</option>
              <option value="critical">Critical only</option>
            </select>
            <button
              type="submit"
              disabled={actionLoading === 'create'}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading === 'create' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create Webhook
            </button>
          </form>
        )}

        {!session ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Webhook className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm font-medium">Sign in to manage webhooks</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Webhook className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm font-medium">No webhooks yet</p>
            <p className="mt-1 text-xs">Click + to add your first webhook.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {webhooks.map((w) => (
              <li key={w.id} className="rounded-lg border p-3 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${w.active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span className="text-sm font-bold">{w.name}</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-zinc-500">{w.url}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggle(w.id, w.active)}
                      disabled={actionLoading === `toggle-${w.id}`}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title={w.active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => test(w.id)}
                      disabled={actionLoading === `test-${w.id}`}
                      className="rounded p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      title="Send test"
                    >
                      {actionLoading === `test-${w.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => remove(w.id)}
                      disabled={actionLoading === `delete-${w.id}`}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {w.events.map((e) => {
                    const ev = EVENT_TYPES.find((x) => x.id === e)
                    return (
                      <span key={e} className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        {ev?.icon} {ev?.label.split(' ')[0] || e}
                      </span>
                    )
                  })}
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] dark:bg-zinc-800">
                    min: {w.minSeverity}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-zinc-500">
                  <div>Triggers: <strong>{w.triggerCount}</strong></div>
                  <div>Failures: <strong>{w.failureCount}</strong></div>
                  <div>Last: {w.lastResponseStatus || '—'}</div>
                </div>

                {testResults[w.id] && (
                  <div className={`mt-2 rounded p-2 text-[10px] ${
                    testResults[w.id].success
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/30'
                  }`}>
                    {testResults[w.id].success ? <Check className="mr-1 inline h-3 w-3" /> : <AlertTriangle className="mr-1 inline h-3 w-3" />}
                    {testResults[w.id].message}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Integration example */}
        {webhooks.length > 0 && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs dark:bg-blue-950/30">
            <p className="font-bold text-blue-700 dark:text-blue-300">Verifying signatures:</p>
            <pre className="mt-1 overflow-x-auto text-[10px] text-blue-700 dark:text-blue-400">
{`const crypto = require('crypto')
const sig = req.headers['x-envirodash-signature']
const payload = JSON.stringify(req.body)
const expected = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex')
if (sig === expected) {
  // Valid webhook
}`}
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

export default WebhookManager
