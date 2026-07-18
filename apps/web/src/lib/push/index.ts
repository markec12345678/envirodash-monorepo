/**
 * EnviroDash Mobile Push Notification System
 *
 * Manages Expo push tokens and sends push notifications for environmental alerts.
 * Uses Expo Push Notifications API (https://expo.dev/push-notification-service)
 *
 * Flow:
 *   1. Mobile app registers with Expo → gets push token
 *   2. Mobile app sends token to /api/user/push-tokens
 *   3. When alert triggered → /api/push/send sends notification to all matching tokens
 *
 * Requirements:
 *   - Expo Push Notifications (free, no setup needed for dev)
 *   - Mobile app must request permissions and get Expo push token
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = join(process.cwd(), 'data', 'users')

export interface PushToken {
  id: string
  userId: string
  token: string // ExponentPushToken[xxx]
  platform: 'ios' | 'android' | 'web'
  deviceName?: string
  events: string[] // ['earthquake', 'tsunami', 'air-quality', 'wildfire', 'volcano']
  minSeverity: 'warning' | 'critical'
  active: boolean
  createdAt: string
  lastSentAt?: string
  notificationCount: number
}

interface PushTokenStore {
  tokens: PushToken[]
}

async function getTokens(userId: string): Promise<PushTokenStore> {
  try {
    const raw = await readFile(join(DATA_DIR, `${userId}-push-tokens.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { tokens: [] }
  }
}

async function setTokens(userId: string, store: PushTokenStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(join(DATA_DIR, `${userId}-push-tokens.json`), JSON.stringify(store, null, 2))
}

export async function listPushTokens(userId: string): Promise<PushToken[]> {
  const store = await getTokens(userId)
  return store.tokens
}

export async function registerPushToken(
  userId: string,
  data: { token: string; platform: 'ios' | 'android' | 'web'; deviceName?: string; events?: string[]; minSeverity?: 'warning' | 'critical' }
): Promise<PushToken> {
  const store = await getTokens(userId)

  // Check if token already exists (update instead of duplicate)
  const existing = store.tokens.find((t) => t.token === data.token)
  if (existing) {
    existing.platform = data.platform
    existing.deviceName = data.deviceName
    existing.events = data.events || existing.events
    existing.minSeverity = data.minSeverity || existing.minSeverity
    existing.active = true
    await setTokens(userId, store)
    return existing
  }

  const pushToken: PushToken = {
    id: randomUUID(),
    userId,
    token: data.token,
    platform: data.platform,
    deviceName: data.deviceName,
    events: data.events || ['earthquake', 'tsunami', 'wildfire', 'volcano'],
    minSeverity: data.minSeverity || 'warning',
    active: true,
    createdAt: new Date().toISOString(),
    notificationCount: 0,
  }

  store.tokens.push(pushToken)
  await setTokens(userId, store)

  return pushToken
}

export async function deletePushToken(userId: string, tokenId: string): Promise<void> {
  const store = await getTokens(userId)
  store.tokens = store.tokens.filter((t) => t.id !== tokenId)
  await setTokens(userId, store)
}

export async function togglePushToken(userId: string, tokenId: string, active: boolean): Promise<void> {
  const store = await getTokens(userId)
  const token = store.tokens.find((t) => t.id === tokenId)
  if (token) {
    token.active = active
    await setTokens(userId, store)
  }
}

/**
 * Send push notifications to all matching tokens for an alert.
 * Called by alerts-ws when new environmental alerts are detected.
 */
export async function sendPushNotifications(event: {
  type: string
  severity: 'warning' | 'critical'
  title: string
  description: string
  value?: number
  unit?: string
  timestamp: string
  source: string
}): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  const { readdir } = await import('fs/promises')
  const files = await readdir(DATA_DIR).catch(() => [])

  const allTokens: { token: PushToken; userId: string }[] = []

  for (const f of files) {
    if (!f.endsWith('-push-tokens.json')) continue
    const userId = f.replace('-push-tokens.json', '')
    const store = await getTokens(userId)
    for (const t of store.tokens) {
      if (!t.active) continue
      if (!t.events.includes(event.type)) continue
      if (event.severity === 'warning' && t.minSeverity === 'critical') continue
      allTokens.push({ token: t, userId })
    }
  }

  if (allTokens.length === 0) {
    return { sent: 0, failed: 0 }
  }

  // Expo Push API accepts up to 600 tickets per request
  const batchSize = 100
  const severityEmoji = event.severity === 'critical' ? '🚨' : '⚠️'
  const eventIcons: Record<string, string> = {
    earthquake: '🌎',
    tsunami: '🌊',
    'air-quality': '💨',
    wildfire: '🔥',
    volcano: '🌋',
  }
  const icon = eventIcons[event.type] || '📍'

  const title = `${severityEmoji} ${icon} ${event.title}`
  const body = event.description.length > 100
    ? event.description.slice(0, 100) + '...'
    : event.description

  for (let i = 0; i < allTokens.length; i += batchSize) {
    const batch = allTokens.slice(i, i + batchSize)

    const messages = batch.map(({ token }) => ({
      to: token.token,
      title,
      body,
      data: {
        type: event.type,
        severity: event.severity,
        value: event.value,
        unit: event.unit,
        timestamp: event.timestamp,
        source: event.source,
        url: `/`,
      },
      sound: 'default',
      priority: event.severity === 'critical' ? 'high' : 'normal',
      channelId: event.severity === 'critical' ? 'critical-alerts' : 'environmental-alerts',
      _displayInForeground: true,
    }))

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(messages),
      })

      const data = await res.json()

      if (data.data) {
        for (let j = 0; j < data.data.length; j++) {
          const ticket = data.data[j]
          if (ticket.status === 'ok') {
            sent++
            // Update lastSentAt and count
            const { token, userId } = batch[j]
            token.lastSentAt = new Date().toISOString()
            token.notificationCount++
            const store = await getTokens(userId)
            const t = store.tokens.find((x) => x.id === token.id)
            if (t) {
              t.lastSentAt = token.lastSentAt
              t.notificationCount = token.notificationCount
              await setTokens(userId, store)
            }
          } else {
            failed++
          }
        }
      }
    } catch (e: any) {
      console.error('[Push] Send failed:', e.message)
      failed += batch.length
    }
  }

  return { sent, failed }
}

/**
 * Send a test push notification to verify a token.
 */
export async function sendTestPush(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: '🌍 EnviroDash Test',
        body: 'If you received this, push notifications are working correctly!',
        data: { type: 'test' },
        sound: 'default',
        _displayInForeground: true,
      }),
    })

    const data = await res.json()

    if (data.data && data.data[0]?.status === 'ok') {
      return { success: true }
    }

    return { success: false, error: data.data?.[0]?.message || data.message || 'Unknown error' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
