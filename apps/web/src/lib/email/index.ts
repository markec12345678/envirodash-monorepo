/**
 * EnviroDash Email Notification System
 *
 * Sends email alerts when environmental events match user criteria.
 * Uses Nodemailer with any SMTP provider (Gmail, SendGrid, Resend, AWS SES, etc.).
 *
 * Configuration (in .env):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM=EnviroDash <alerts@envirodash.si>
 *
 * Without SMTP config: emails are logged to console (dev mode).
 */

import nodemailer from 'nodemailer'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = join(process.cwd(), 'data', 'users')

export interface EmailSubscription {
  id: string
  userId: string
  email: string
  events: string[] // ['earthquake', 'tsunami', 'air-quality', 'wildfire', 'volcano']
  minSeverity: 'warning' | 'critical'
  minMagnitude?: number // For earthquakes only
  active: boolean
  createdAt: string
  lastSentAt?: string
  emailCount: number
}

interface EmailSubscriptionStore {
  subscriptions: EmailSubscription[]
}

// ==================== SMTP Transporter ====================

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null // Dev mode: log to console
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'EnviroDash <noreply@envirodash.si>'

// ==================== Storage ====================

async function getSubscriptions(userId: string): Promise<EmailSubscriptionStore> {
  try {
    const raw = await readFile(join(DATA_DIR, `${userId}-email-subs.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { subscriptions: [] }
  }
}

async function setSubscriptions(userId: string, store: EmailSubscriptionStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(join(DATA_DIR, `${userId}-email-subs.json`), JSON.stringify(store, null, 2))
}

// ==================== CRUD ====================

export async function listSubscriptions(userId: string): Promise<EmailSubscription[]> {
  const store = await getSubscriptions(userId)
  return store.subscriptions
}

export async function createSubscription(
  userId: string,
  data: { email: string; events: string[]; minSeverity: 'warning' | 'critical'; minMagnitude?: number }
): Promise<EmailSubscription> {
  const sub: EmailSubscription = {
    id: randomUUID(),
    userId,
    email: data.email,
    events: data.events,
    minSeverity: data.minSeverity,
    minMagnitude: data.minMagnitude,
    active: true,
    createdAt: new Date().toISOString(),
    emailCount: 0,
  }

  const store = await getSubscriptions(userId)
  store.subscriptions.push(sub)
  await setSubscriptions(userId, store)

  return sub
}

export async function deleteSubscription(userId: string, subId: string): Promise<void> {
  const store = await getSubscriptions(userId)
  store.subscriptions = store.subscriptions.filter((s) => s.id !== subId)
  await setSubscriptions(userId, store)
}

export async function toggleSubscription(userId: string, subId: string, active: boolean): Promise<void> {
  const store = await getSubscriptions(userId)
  const sub = store.subscriptions.find((s) => s.id === subId)
  if (sub) {
    sub.active = active
    await setSubscriptions(userId, store)
  }
}

// ==================== Email Sending ====================

interface AlertEvent {
  type: string
  severity: 'warning' | 'critical'
  title: string
  description: string
  location?: { name: string; lat: number; lng: number }
  value?: number
  unit?: string
  timestamp: string
  source: string
}

/**
 * Send alert emails to all matching subscriptions.
 * Called by the alerts-ws mini-service when new alerts are detected.
 */
export async function sendAlertEmails(event: AlertEvent): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  const { readdir } = await import('fs/promises')
  const files = await readdir(DATA_DIR).catch(() => [])

  for (const f of files) {
    if (!f.endsWith('-email-subs.json')) continue
    const userId = f.replace('-email-subs.json', '')
    const store = await getSubscriptions(userId)

    for (const sub of store.subscriptions) {
      if (!sub.active) continue
      if (!sub.events.includes(event.type)) continue
      if (event.severity === 'warning' && sub.minSeverity === 'critical') continue
      if (event.type === 'earthquake' && sub.minMagnitude && event.value && event.value < sub.minMagnitude) continue

      // Don't send more than 1 email per subscription per hour (rate limit)
      if (sub.lastSentAt) {
        const lastSent = new Date(sub.lastSentAt).getTime()
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        if (lastSent > oneHourAgo) continue
      }

      const success = await sendEmail(sub.email, event)
      if (success) {
        sent++
        sub.lastSentAt = new Date().toISOString()
        sub.emailCount++
      } else {
        failed++
      }
    }

    await setSubscriptions(userId, store)
  }

  return { sent, failed }
}

async function sendEmail(to: string, event: AlertEvent): Promise<boolean> {
  const transport = getTransporter()
  const severityEmoji = event.severity === 'critical' ? '🚨' : '⚠️'
  const severityColor = event.severity === 'critical' ? '#ef4444' : '#f59e0b'
  const eventIcon: Record<string, string> = {
    earthquake: '🌎',
    tsunami: '🌊',
    'air-quality': '💨',
    wildfire: '🔥',
    volcano: '🌋',
  }
  const icon = eventIcon[event.type] || '📍'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#14b8a6 100%);padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">
                🌍 EnviroDash Alert
              </h1>
              <p style="margin:4px 0 0;color:#d1fae5;font-size:12px;">
                Real-time environmental monitoring
              </p>
            </td>
          </tr>

          <!-- Alert banner -->
          <tr>
            <td style="background:${severityColor};padding:16px 32px;">
              <p style="margin:0;color:#fff;font-size:14px;font-weight:600;">
                ${severityEmoji} ${event.severity.toUpperCase()} — ${event.type.replace('-', ' ').toUpperCase()}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:24px 32px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#18181b;">
                ${icon} ${event.title}
              </h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
                ${event.description}
              </p>

              ${event.value != null ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;">
                    <div style="font-size:32px;font-weight:700;color:${severityColor};">
                      ${event.value}
                    </div>
                    <div style="font-size:11px;color:#71717a;text-transform:uppercase;">
                      ${event.unit || ''}
                    </div>
                  </td>
                </tr>
              </table>` : ''}

              ${event.location ? `
              <p style="margin:0 0 8px;font-size:12px;color:#71717a;">
                📍 <strong>Location:</strong> ${event.location.name}
                (${event.location.lat.toFixed(2)}, ${event.location.lng.toFixed(2)})
              </p>` : ''}

              <p style="margin:0 0 4px;font-size:12px;color:#71717a;">
                🕐 <strong>Time:</strong> ${new Date(event.timestamp).toLocaleString()}
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:#71717a;">
                📡 <strong>Source:</strong> ${event.source}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 24px;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}"
                 style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;">
                View Full Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:10px;color:#a1a1aa;text-align:center;">
                You received this email because you subscribed to EnviroDash alerts.<br>
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings" style="color:#a1a1aa;">Manage subscriptions</a>
                · Powered by open data from Open-Meteo, NOAA, USGS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `${severityEmoji} EnviroDash ${event.severity.toUpperCase()} Alert

${event.title}

${event.description}

${event.value != null ? `Value: ${event.value} ${event.unit || ''}\n` : ''}
${event.location ? `Location: ${event.location.name} (${event.location.lat.toFixed(2)}, ${event.location.lng.toFixed(2)})\n` : ''}
Time: ${new Date(event.timestamp).toLocaleString()}
Source: ${event.source}

View dashboard: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}

---
You received this email because you subscribed to EnviroDash alerts.
To unsubscribe, visit: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings
  `.trim()

  try {
    if (transport) {
      await transport.sendMail({
        from: FROM_ADDRESS,
        to,
        subject: `${severityEmoji} ${event.severity === 'critical' ? 'CRITICAL' : 'Warning'}: ${event.title}`,
        text,
        html,
      })
    } else {
      // Dev mode: log instead of sending
      console.log(`[Email] (dev mode) To: ${to} | Subject: ${event.title}`)
    }
    return true
  } catch (e: any) {
    console.error('[Email] Send failed:', e.message)
    return false
  }
}

/**
 * Send a test email to verify SMTP configuration.
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail(to, {
    type: 'test',
    severity: 'warning',
    title: 'EnviroDash Email Test',
    description: 'This is a test email from EnviroDash. If you received this, your email subscription is configured correctly.',
    timestamp: new Date().toISOString(),
    source: 'EnviroDash Email System',
  })
}
