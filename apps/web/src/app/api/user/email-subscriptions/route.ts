import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listSubscriptions, createSubscription, deleteSubscription, toggleSubscription } from '@/lib/email'

/**
 * Email subscription management.
 *
 * GET    /api/user/email-subscriptions — list user's subscriptions
 * POST   /api/user/email-subscriptions — create subscription
 *   body: { email, events, minSeverity, minMagnitude? }
 * DELETE /api/user/email-subscriptions?id=<id> — delete subscription
 * PATCH  /api/user/email-subscriptions?id=<id>&active=true — toggle
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id || 'anonymous'
  const subs = await listSubscriptions(userId)
  return NextResponse.json({ subscriptions: subs, count: subs.length })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id || 'anonymous'
  const body = await request.json()

  if (!body.email || !Array.isArray(body.events)) {
    return NextResponse.json({ error: 'email and events are required' }, { status: 400 })
  }

  // Validate email
  try {
    new URL(`mailto:${body.email}`)
  } catch {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const validEvents = ['earthquake', 'tsunami', 'air-quality', 'wildfire', 'volcano']
  const events = body.events.filter((e: string) => validEvents.includes(e))
  if (events.length === 0) {
    return NextResponse.json({ error: 'At least one valid event required' }, { status: 400 })
  }

  const sub = await createSubscription(userId, {
    email: body.email,
    events,
    minSeverity: body.minSeverity === 'critical' ? 'critical' : 'warning',
    minMagnitude: body.minMagnitude ? parseFloat(body.minMagnitude) : undefined,
  })

  return NextResponse.json({ success: true, subscription: sub })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id || 'anonymous'
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await deleteSubscription(userId, id)
  return NextResponse.json({ success: true })
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
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await toggleSubscription(userId, id, active)
  return NextResponse.json({ success: true })
}
