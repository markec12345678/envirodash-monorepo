import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listWebhooks, createWebhook, deleteWebhook, toggleWebhook } from '@/lib/webhooks'

/**
 * Webhook management endpoints.
 *
 * GET    /api/user/webhooks — list user's webhooks
 * POST   /api/user/webhooks — create a webhook
 *   body: { name, url, events, minSeverity }
 * DELETE /api/user/webhooks?id=<id> — delete a webhook
 * PATCH  /api/user/webhooks?id=<id>&active=true — toggle active state
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const webhooks = await listWebhooks(userId)

  // Don't return secrets
  const safe = webhooks.map((w) => ({
    ...w,
    secret: w.secret.slice(0, 8) + '...', // Only show prefix
  }))

  return NextResponse.json({ webhooks: safe, count: safe.length })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const body = await request.json()

  if (!body.name || !body.url || !Array.isArray(body.events)) {
    return NextResponse.json(
      { error: 'name, url, and events are required' },
      { status: 400 }
    )
  }

  // Validate URL
  try {
    new URL(body.url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Validate events
  const validEvents = ['earthquake', 'tsunami', 'air-quality', 'wildfire', 'volcano']
  const events = body.events.filter((e: string) => validEvents.includes(e))
  if (events.length === 0) {
    return NextResponse.json(
      { error: `events must contain at least one of: ${validEvents.join(', ')}` },
      { status: 400 }
    )
  }

  const webhook = await createWebhook(userId, {
    name: body.name,
    url: body.url,
    events,
    minSeverity: body.minSeverity === 'critical' ? 'critical' : 'warning',
  })

  // Return with full secret (only shown once)
  return NextResponse.json({
    success: true,
    webhook: {
      ...webhook,
      secret: webhook.secret, // Full secret for initial setup
    },
    message: 'Save the secret securely — it will not be shown again in full.',
  })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await deleteWebhook(userId, id)
  return NextResponse.json({ success: true, message: 'Webhook deleted' })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const active = searchParams.get('active') === 'true'

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await toggleWebhook(userId, id, active)
  return NextResponse.json({ success: true, message: `Webhook ${active ? 'activated' : 'deactivated'}` })
}
