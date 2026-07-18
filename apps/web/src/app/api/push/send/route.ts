import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotifications } from '@/lib/push'

/**
 * Internal endpoint to trigger push notifications.
 * Called by alerts-ws mini-service when new environmental alerts are detected.
 *
 * POST /api/push/send
 * body: { type, severity, title, description, value?, unit?, timestamp, source }
 *
 * Requires internal API key (INTERNAL_API_KEY env var) for security.
 */

export async function POST(request: NextRequest) {
  // Verify internal API key
  const apiKey = request.headers.get('x-internal-api-key')
  const expectedKey = process.env.INTERNAL_API_KEY || 'envirodash-internal'

  if (apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await request.json()
    const result = await sendPushNotifications(event)

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: result.sent + result.failed,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
