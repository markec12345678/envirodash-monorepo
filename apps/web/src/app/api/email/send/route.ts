import { NextRequest, NextResponse } from 'next/server'
import { sendAlertEmails } from '@/lib/email'

/**
 * Internal endpoint to send alert emails.
 * Called by alerts-ws mini-service.
 *
 * POST /api/email/send
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
    const result = await sendAlertEmails(event)

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
