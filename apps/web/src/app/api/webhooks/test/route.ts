import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listWebhooks, sendTestWebhook } from '@/lib/webhooks'

/**
 * Test a webhook by sending a test payload.
 *
 * POST /api/webhooks/test?id=<webhookId>
 */

export async function POST(request: NextRequest) {
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

  const webhooks = await listWebhooks(userId)
  const webhook = webhooks.find((w) => w.id === id)

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  const result = await sendTestWebhook(webhook)

  return NextResponse.json({
    success: result.success,
    status: result.status,
    error: result.error,
    message: result.success
      ? `Webhook delivered successfully (HTTP ${result.status})`
      : `Webhook delivery failed: ${result.error || `HTTP ${result.status}`}`,
  })
}
