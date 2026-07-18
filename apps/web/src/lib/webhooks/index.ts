/**
 * Webhooks system for external integrations.
 *
 * Users can register webhook URLs that will receive POST requests when
 * environmental events match their criteria.
 *
 * Use cases:
 *   - Send alert to Slack when earthquake M5+ detected
 *   - Trigger IFTTT/Zapier when air quality critical
 *   - Notify own backend when tsunami warning issued
 *   - Push to Discord when volcano alert upgraded
 *
 * Webhook payload:
 *   {
 *     event: 'earthquake' | 'tsunami' | 'air-quality' | 'wildfire' | 'volcano',
 *     severity: 'warning' | 'critical',
 *     title: string,
 *     description: string,
 *     location?: { name, lat, lng },
 *     value?: number,
 *     unit?: string,
 *     timestamp: string,
 *     source: string
 *   }
 *
 * Delivery:
 *   - POST request with JSON body
 *   - X-EnviroDash-Signature header with HMAC-SHA256 (using webhook secret)
 *   - Retry up to 3 times with exponential backoff (1s, 5s, 30s)
 *   - Timeout: 10 seconds per attempt
 */

import { createHmac } from 'crypto'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = join(process.cwd(), 'data', 'users')

export interface Webhook {
  id: string
  userId: string
  name: string
  url: string
  secret: string // Used for HMAC signature
  events: string[] // ['earthquake', 'tsunami', 'air-quality', 'wildfire', 'volcano']
  minSeverity: 'warning' | 'critical' // Only trigger for this severity or higher
  active: boolean
  createdAt: string
  lastTriggeredAt?: string
  lastResponseStatus?: number
  triggerCount: number
  failureCount: number
}

interface WebhookStore {
  webhooks: Webhook[]
}

async function getUserWebhooks(userId: string): Promise<WebhookStore> {
  try {
    const raw = await readFile(join(DATA_DIR, `${userId}-webhooks.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { webhooks: [] }
  }
}

async function setUserWebhooks(userId: string, store: WebhookStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(join(DATA_DIR, `${userId}-webhooks.json`), JSON.stringify(store, null, 2))
}

export async function listWebhooks(userId: string): Promise<Webhook[]> {
  const store = await getUserWebhooks(userId)
  return store.webhooks
}

export async function createWebhook(
  userId: string,
  data: { name: string; url: string; events: string[]; minSeverity: 'warning' | 'critical' }
): Promise<Webhook> {
  const webhook: Webhook = {
    id: randomUUID(),
    userId,
    name: data.name,
    url: data.url,
    secret: randomUUID() + randomUUID(),
    events: data.events,
    minSeverity: data.minSeverity,
    active: true,
    createdAt: new Date().toISOString(),
    triggerCount: 0,
    failureCount: 0,
  }

  const store = await getUserWebhooks(userId)
  store.webhooks.push(webhook)
  await setUserWebhooks(userId, store)

  return webhook
}

export async function deleteWebhook(userId: string, webhookId: string): Promise<void> {
  const store = await getUserWebhooks(userId)
  store.webhooks = store.webhooks.filter((w) => w.id !== webhookId)
  await setUserWebhooks(userId, store)
}

export async function toggleWebhook(userId: string, webhookId: string, active: boolean): Promise<void> {
  const store = await getUserWebhooks(userId)
  const webhook = store.webhooks.find((w) => w.id === webhookId)
  if (webhook) {
    webhook.active = active
    await setUserWebhooks(userId, store)
  }
}

/**
 * Compute HMAC-SHA256 signature for webhook payload.
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Trigger all matching webhooks for an alert event.
 * Called by the alerts-ws mini-service or directly from monitor endpoints.
 */
export async function triggerWebhooks(event: {
  type: string // 'earthquake' | 'tsunami' | 'air-quality' | 'wildfire' | 'volcano'
  severity: 'warning' | 'critical'
  title: string
  description: string
  location?: { name: string; lat: number; lng: number }
  value?: number
  unit?: string
  timestamp: string
  source: string
}): Promise<{ triggered: number; succeeded: number; failed: number }> {
  let triggered = 0
  let succeeded = 0
  let failed = 0

  const { readdir } = await import('fs/promises')
  const files = await readdir(DATA_DIR).catch(() => [])

  for (const f of files) {
    if (!f.endsWith('-webhooks.json')) continue

    const store = await getUserWebhooks(f.replace('-webhooks.json', ''))

    for (const webhook of store.webhooks) {
      // Check if webhook matches this event
      if (!webhook.active) continue
      if (!webhook.events.includes(event.type)) continue
      if (event.severity === 'warning' && webhook.minSeverity === 'critical') continue

      triggered++

      const payload = JSON.stringify({
        event: event.type,
        severity: event.severity,
        title: event.title,
        description: event.description,
        location: event.location,
        value: event.value,
        unit: event.unit,
        timestamp: event.timestamp,
        source: event.source,
      })

      const signature = signPayload(payload, webhook.secret)

      // Retry up to 3 times with exponential backoff
      let success = false
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000)

          const res = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-EnviroDash-Signature': `sha256=${signature}`,
              'X-EnviroDash-Event': event.type,
              'User-Agent': 'EnviroDash-Webhooks/1.0',
            },
            body: payload,
            signal: controller.signal,
          })

          clearTimeout(timeout)

          webhook.lastResponseStatus = res.status
          webhook.lastTriggeredAt = new Date().toISOString()

          if (res.ok || res.status < 500) {
            success = true
            break
          }
          // 5xx error: retry
        } catch (e) {
          // Network error: retry
        }

        // Exponential backoff: 1s, 5s, 30s
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(5, attempt)))
        }
      }

      webhook.triggerCount++
      if (!success) {
        webhook.failureCount++
        failed++
      } else {
        succeeded++
      }
    }

    // Persist updated webhook stats
    await setUserWebhooks(f.replace('-webhooks.json', ''), store)
  }

  return { triggered, succeeded, failed }
}

/**
 * Send a test webhook delivery.
 */
export async function sendTestWebhook(webhook: Webhook): Promise<{ success: boolean; status?: number; error?: string }> {
  const payload = JSON.stringify({
    event: 'test',
    severity: 'warning',
    title: 'EnviroDash Webhook Test',
    description: `This is a test webhook delivery for "${webhook.name}". If you received this, your webhook is configured correctly.`,
    timestamp: new Date().toISOString(),
    source: 'EnviroDash',
  })

  const signature = signPayload(payload, webhook.secret)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EnviroDash-Signature': `sha256=${signature}`,
        'X-EnviroDash-Event': 'test',
        'User-Agent': 'EnviroDash-Webhooks/1.0',
      },
      body: payload,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    return { success: res.ok, status: res.status }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
