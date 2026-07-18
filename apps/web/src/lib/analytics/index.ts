/**
 * EnviroDash Analytics
 *
 * Lightweight, privacy-first analytics that works without external services.
 * Tracks:
 *   - Page views
 *   - Monitor opens
 *   - API calls
 *   - AI queries
 *   - Feature usage
 *
 * In production, can forward to:
 *   - PostHog (NEXT_PUBLIC_POSTHOG_KEY)
 *   - Plausible (NEXT_PUBLIC_PLAUSIBLE_DOMAIN)
 *   - Google Analytics (NEXT_PUBLIC_GA_MEASUREMENT_ID)
 *
 * Storage:
 *   - Dev: in-memory + JSON file
 *   - Prod: forwards to external service + Prisma AuditEvent table
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const ANALYTICS_FILE = join(DATA_DIR, 'analytics.json')

export interface AnalyticsEvent {
  type: string // e.g. 'page_view', 'monitor_open', 'api_call', 'ai_query'
  name: string // e.g. 'air-quality', 'wildfire', '/api/air-quality'
  userId?: string
  sessionId?: string
  properties?: Record<string, any>
  timestamp: string
  userAgent?: string
  ip?: string
}

interface AnalyticsStore {
  events: AnalyticsEvent[]
  dailyStats: Record<string, {
    pageViews: number
    monitorOpens: number
    apiCalls: number
    aiQueries: number
    uniqueUsers: Set<string>
  }>
}

// In-memory cache (per-instance)
let memoryStore: AnalyticsStore = {
  events: [],
  dailyStats: {},
}

// Load persisted stats on startup
async function loadStore(): Promise<void> {
  try {
    const raw = await readFile(ANALYTICS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    // Convert Set from array (Sets don't serialize)
    Object.keys(parsed.dailyStats || {}).forEach((date) => {
      parsed.dailyStats[date].uniqueUsers = new Set(parsed.dailyStats[date].uniqueUsers || [])
    })
    memoryStore = parsed
  } catch {
    // Fresh start
  }
}

let savePending = false
async function persistStore(): Promise<void> {
  if (savePending) return
  savePending = true
  setTimeout(async () => {
    savePending = false
    try {
      await mkdir(DATA_DIR, { recursive: true })
      // Convert Sets to arrays for JSON
      const serializable = {
        events: memoryStore.events.slice(-1000), // Keep last 1000 events
        dailyStats: Object.fromEntries(
          Object.entries(memoryStore.dailyStats).map(([date, stats]) => [
            date,
            { ...stats, uniqueUsers: Array.from(stats.uniqueUsers) },
          ])
        ),
      }
      await writeFile(ANALYTICS_FILE, JSON.stringify(serializable, null, 2))
    } catch (e) {
      console.error('[Analytics] Failed to persist:', e)
    }
  }, 5000) // Debounce writes every 5 seconds
}

// Load on module import
loadStore()

/**
 * Track an analytics event.
 */
export async function track(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
  const fullEvent: AnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  // Store in memory
  memoryStore.events.push(fullEvent)
  if (memoryStore.events.length > 1000) {
    memoryStore.events = memoryStore.events.slice(-1000)
  }

  // Update daily stats
  const today = fullEvent.timestamp.slice(0, 10)
  if (!memoryStore.dailyStats[today]) {
    memoryStore.dailyStats[today] = {
      pageViews: 0,
      monitorOpens: 0,
      apiCalls: 0,
      aiQueries: 0,
      uniqueUsers: new Set(),
    }
  }
  const stats = memoryStore.dailyStats[today]

  switch (fullEvent.type) {
    case 'page_view':
      stats.pageViews++
      break
    case 'monitor_open':
      stats.monitorOpens++
      break
    case 'api_call':
      stats.apiCalls++
      break
    case 'ai_query':
      stats.aiQueries++
      break
  }
  if (fullEvent.userId) {
    stats.uniqueUsers.add(fullEvent.userId)
  }

  // Persist (debounced)
  persistStore()

  // Forward to external analytics (if configured)
  forwardToExternal(fullEvent)
}

/**
 * Forward event to external analytics service.
 */
async function forwardToExternal(event: AnalyticsEvent): Promise<void> {
  // PostHog
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (posthogKey) {
    try {
      await fetch('https://app.posthog.com/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: posthogKey,
          event: event.type,
          distinct_id: event.userId || event.sessionId || 'anonymous',
          properties: {
            ...event.properties,
            name: event.name,
            timestamp: event.timestamp,
          },
        }),
      })
    } catch {
      // Silently fail (analytics shouldn't break the app)
    }
  }

  // Plausible (server-side)
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN
  if (plausibleDomain) {
    try {
      await fetch('https://plausible.io/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': event.userAgent || 'EnviroDash/1.0',
          'X-Forwarded-For': event.ip || '127.0.0.1',
        },
        body: JSON.stringify({
          domain: plausibleDomain,
          name: event.type,
          url: `https://${plausibleDomain}/${event.name}`,
          props: event.properties,
        }),
      })
    } catch {
      // ignore
    }
  }
}

/**
 * Get analytics summary.
 */
export async function getAnalyticsSummary(days = 7): Promise<{
  totalEvents: number
  totalPageViews: number
  totalMonitorOpens: number
  totalApiCalls: number
  totalAiQueries: number
  uniqueUsers: number
  topMonitors: Array<{ name: string; count: number }>
  dailyBreakdown: Array<{ date: string; events: number; users: number }>
}> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const recentEvents = memoryStore.events.filter(
    (e) => new Date(e.timestamp) >= cutoff
  )

  // Top monitors
  const monitorCounts: Record<string, number> = {}
  recentEvents
    .filter((e) => e.type === 'monitor_open')
    .forEach((e) => {
      monitorCounts[e.name] = (monitorCounts[e.name] || 0) + 1
    })

  const topMonitors = Object.entries(monitorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Daily breakdown
  const dailyBreakdown: Array<{ date: string; events: number; users: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    const stats = memoryStore.dailyStats[dateStr]
    dailyBreakdown.push({
      date: dateStr,
      events: stats ? stats.pageViews + stats.monitorOpens + stats.apiCalls + stats.aiQueries : 0,
      users: stats ? stats.uniqueUsers.size : 0,
    })
  }

  // Unique users across all days
  const allUsers = new Set<string>()
  Object.values(memoryStore.dailyStats).forEach((stats) => {
    stats.uniqueUsers.forEach((u) => allUsers.add(u))
  })

  return {
    totalEvents: recentEvents.length,
    totalPageViews: recentEvents.filter((e) => e.type === 'page_view').length,
    totalMonitorOpens: recentEvents.filter((e) => e.type === 'monitor_open').length,
    totalApiCalls: recentEvents.filter((e) => e.type === 'api_call').length,
    totalAiQueries: recentEvents.filter((e) => e.type === 'ai_query').length,
    uniqueUsers: allUsers.size,
    topMonitors,
    dailyBreakdown,
  }
}

/**
 * Client-side tracking helper (uses fetch to /api/analytics).
 */
export function trackClientEvent(
  type: string,
  name: string,
  properties?: Record<string, any>
): void {
  if (typeof window === 'undefined') return

  // Generate/get session ID
  let sessionId = sessionStorage.getItem('envirodash-session')
  if (!sessionId) {
    sessionId = `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem('envirodash-session', sessionId)
  }

  // Fire and forget
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, name, sessionId, properties }),
  }).catch(() => {})
}
