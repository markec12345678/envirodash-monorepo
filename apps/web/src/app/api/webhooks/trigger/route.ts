import { NextRequest, NextResponse } from 'next/server'
import { triggerWebhooks } from '@/lib/webhooks'

/**
 * Internal endpoint to trigger webhooks for an alert.
 * Called by alerts-ws mini-service.
 *
 * POST /api/webhooks/trigger
 * body: { type, severity, title, description, location?, value?, unit?, timestamp, source }
 * header: x-internal-api-key
 */

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-internal-api-key')
  const expectedKey = process.env.INTERNAL_API_KEY || 'envirodash-internal'

  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await request.json()
    const result = await triggerWebhooks(event)

    return NextResponse.json({
      success: true,
      triggered: result.triggered,
      succeeded: result.succeeded,
      failed: result.failed,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
