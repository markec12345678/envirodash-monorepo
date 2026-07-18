import { NextRequest, NextResponse } from 'next/server'
import { track, getAnalyticsSummary } from '@/lib/analytics'

/**
 * Analytics endpoints.
 *
 * POST /api/analytics — track an event (called from client)
 *   body: { type, name, sessionId, properties? }
 *
 * GET /api/analytics?days=7 — get analytics summary (admin only)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, sessionId, properties } = body

    if (!type || !name) {
      return NextResponse.json({ error: 'type and name are required' }, { status: 400 })
    }

    // Get IP for geolocation (anonymized)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'

    await track({
      type,
      name,
      sessionId,
      properties,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: ip === 'unknown' ? undefined : ip,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  try {
    const summary = await getAnalyticsSummary(days)
    return NextResponse.json(summary)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
