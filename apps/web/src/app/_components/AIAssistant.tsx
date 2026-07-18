'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, X, Loader2, MapPin, Wind, Flame, Waves, Mountain, Activity, CloudSun } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  action?: {
    monitor?: string
    params?: any
    summary?: string
  }
  timestamp?: string
}

interface AIAssistantProps {
  onClose?: () => void
  onAction?: (monitor: string, params: any) => void
  showClose?: boolean
}

const SUGGESTED_QUERIES = [
  { text: 'Kakšna je kakovost zraka v Ljubljani?', icon: Wind },
  { text: 'Ali so v Evropi trenutno požari?', icon: Flame },
  { text: 'Kateri potresi so se zgodili danes?', icon: Activity },
  { text: 'Ali obstaja nevarnost cunamija?', icon: Waves },
  { text: 'Kakšno je vreme v Mariboru?', icon: CloudSun },
  { text: 'Prikaži aktivne vulkane', icon: Mountain },
]

export function AIAssistant({ onClose, onAction, showClose = true }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Pozdravljen! Sem EnviroDash AI asistent. Vprašajte me o kakovosti zraka, požarih, potresih, cunamijih, vulkanih ali vremenu — odprl sem pravi monitor z real-time podatki.',
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const r = data.response || {}
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: r.answer || 'Oprostite, nisem razumel vašega vprašanja.',
        action:
          r.action === 'open_monitor' && r.monitor
            ? { monitor: r.monitor, params: r.params, summary: r.summary }
            : undefined,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Napaka: ${e.message}. Poskusite znova.`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleAction = (action: NonNullable<ChatMessage['action']>) => {
    if (onAction && action.monitor) {
      onAction(action.monitor, action.params || {})
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex h-[600px] w-[400px] flex-col overflow-hidden rounded-xl border-2 border-violet-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">✨ EnviroDash AI</h2>
              <p className="text-[10px] text-violet-100">Natural-language environmental queries</p>
            </div>
          </div>
          {showClose && (
            <button onClick={onClose} className="rounded-md p-1.5 text-white hover:bg-white/20" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.action && (
                <button
                  onClick={() => handleAction(m.action!)}
                  className="mt-2 flex items-center gap-2 rounded-md bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                >
                  <MapPin className="h-3 w-3" />
                  {m.action.summary || `Open ${m.action.monitor} monitor`}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="border-t bg-zinc-50 p-3 dark:bg-zinc-950/30">
          <p className="mb-2 text-[10px] text-zinc-500">Suggested questions:</p>
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_QUERIES.map((q) => {
              const Icon = q.icon
              return (
                <button
                  key={q.text}
                  onClick={() => sendMessage(q.text)}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-700 transition-colors hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Icon className="h-3 w-3" />
                  {q.text}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t bg-white p-3 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Vprašajte o okoljskih podatkih..."
            disabled={loading}
            className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AIAssistant
