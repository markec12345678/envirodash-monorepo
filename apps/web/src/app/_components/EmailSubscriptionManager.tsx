'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Mail, Plus, Trash2, X, Loader2, Send, Check, Power, AlertTriangle } from 'lucide-react'

interface Subscription {
  id: string
  email: string
  events: string[]
  minSeverity: 'warning' | 'critical'
  minMagnitude?: number
  active: boolean
  createdAt: string
  lastSentAt?: string
  emailCount: number
}

const EVENT_TYPES = [
  { id: 'earthquake', label: 'Earthquakes', icon: '🌎' },
  { id: 'tsunami', label: 'Tsunami', icon: '🌊' },
  { id: 'air-quality', label: 'Air Quality', icon: '💨' },
  { id: 'wildfire', label: 'Wildfire', icon: '🔥' },
  { id: 'volcano', label: 'Volcano', icon: '🌋' },
]

export function EmailSubscriptionManager({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [events, setEvents] = useState<string[]>(['earthquake'])
  const [minSeverity, setMinSeverity] = useState<'warning' | 'critical'>('warning')
  const [minMagnitude, setMinMagnitude] = useState('5')

  const load = async () => {
    if (!session) { setLoading(false); return }
    try {
      const res = await fetch('/api/user/email-subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubs(data.subscriptions || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('create')
    try {
      const res = await fetch('/api/user/email-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, events, minSeverity, minMagnitude: parseFloat(minMagnitude) }),
      })
      if (res.ok) {
        setEmail(''); setEvents(['earthquake']); setMinSeverity('warning'); setMinMagnitude('5')
        setShowCreate(false)
        await load()
      }
    } finally { setActionLoading(null) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this subscription?')) return
    setActionLoading(`delete-${id}`)
    try {
      await fetch(`/api/user/email-subscriptions?id=${id}`, { method: 'DELETE' })
      await load()
    } finally { setActionLoading(null) }
  }

  const toggle = async (id: string, active: boolean) => {
    setActionLoading(`toggle-${id}`)
    try {
      await fetch(`/api/user/email-subscriptions?id=${id}&active=${!active}`, { method: 'PATCH' })
      await load()
    } finally { setActionLoading(null) }
  }

  const sendTest = async () => {
    setActionLoading('test')
    setTestResult(null)
    try {
      const res = await fetch('/api/email/test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data.message)
    } finally { setActionLoading(null) }
  }

  return (
    <div className="fixed right-4 top-16 z-[60] flex max-h-[85vh] w-[440px] flex-col overflow-hidden rounded-xl border-2 border-blue-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📧 Email Alerts</h2>
              <p className="text-xs text-blue-100">Critical environmental alerts via email</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowCreate(!showCreate)} className="rounded-md bg-white/20 p-1.5 hover:bg-white/30">
              <Plus className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/30">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Test email button */}
        <button
          onClick={sendTest}
          disabled={actionLoading === 'test'}
          className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/30 dark:text-blue-300"
        >
          {actionLoading === 'test' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Send Test Email
        </button>
        {testResult && (
          <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-[10px] text-zinc-600 dark:bg-zinc-800">
            {testResult}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form onSubmit={create} className="mb-4 rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-800">
            <label className="mb-1 block text-xs font-medium">Email address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alerts@your-company.com"
              required
              type="email"
              className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <label className="mb-1 block text-xs font-medium">Events</label>
            <div className="mb-2 flex flex-wrap gap-1">
              {EVENT_TYPES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEvents((prev) => prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id])}
                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${events.includes(e.id) ? 'bg-blue-600 text-white' : 'bg-white border border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-700'}`}
                >
                  {e.icon} {e.label}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs font-medium">Minimum severity</label>
            <select value={minSeverity} onChange={(e) => setMinSeverity(e.target.value as any)}
              className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <option value="warning">Warning + Critical</option>
              <option value="critical">Critical only</option>
            </select>
            {events.includes('earthquake') && (
              <>
                <label className="mb-1 block text-xs font-medium">Min earthquake magnitude</label>
                <input value={minMagnitude} onChange={(e) => setMinMagnitude(e.target.value)} type="number" step="0.1" min="2.5"
                  className="mb-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </>
            )}
            <button type="submit" disabled={actionLoading === 'create'}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {actionLoading === 'create' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Subscribe
            </button>
          </form>
        )}

        {!session ? (
          <div className="flex flex-col items-center py-12 text-zinc-500">
            <Mail className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm">Sign in to manage subscriptions</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-zinc-500">
            <Mail className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm">No subscriptions yet</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={s.id} className="rounded-lg border p-3 dark:border-zinc-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span className="text-sm font-bold">{s.email}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.events.map((e) => {
                        const ev = EVENT_TYPES.find((x) => x.id === e)
                        return <span key={e} className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{ev?.icon} {ev?.label}</span>
                      })}
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] dark:bg-zinc-800">min: {s.minSeverity}</span>
                      {s.minMagnitude && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700 dark:bg-amber-950/50">M≥{s.minMagnitude}</span>}
                    </div>
                    <div className="mt-2 text-[9px] text-zinc-500">
                      Sent: <strong>{s.emailCount}</strong> · Last: {s.lastSentAt ? new Date(s.lastSentAt).toLocaleString() : 'never'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggle(s.id, s.active)} disabled={actionLoading === `toggle-${s.id}`} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <Power className="h-3 w-3" />
                    </button>
                    <button onClick={() => remove(s.id)} disabled={actionLoading === `delete-${s.id}`} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          SMTP must be configured to send emails. Without SMTP_HOST, emails are logged to console only.
        </div>
      </div>
    </div>
  )
}

export default EmailSubscriptionManager
