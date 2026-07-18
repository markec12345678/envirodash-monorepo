import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listPushTokens, registerPushToken, deletePushToken, togglePushToken, sendTestPush } from '@/lib/push'

/**
 * Push token management for mobile push notifications.
 *
 * GET    /api/user/push-tokens — list user's push tokens
 * POST   /api/user/push-tokens — register/update a token
 *   body: { token, platform, deviceName?, events?, minSeverity? }
 * DELETE /api/user/push-tokens?id=<id> — delete a token
 * PATCH  /api/user/push-tokens?id=<id>&active=true — toggle
 * POST   /api/user/push-tokens?id=<id>&action=test — send test notification
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id || 'anonymous'
  const tokens = await listPushTokens(userId)
  // Mask token for display
  const safe = tokens.map((t) => ({
    ...t,
    token: t.token.slice(0, 30) + '...',
  }))
  return NextResponse.json({ tokens: safe, count: safe.length })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id || 'anonymous'
  const body = await request.json()

  // Check if this is a test request
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const id = url.searchParams.get('id')

  if (action === 'test' && id) {
    const tokens = await listPushTokens(userId)
    const token = tokens.find((t) => t.id === id)
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }
    const result = await sendTestPush(token.token)
    return NextResponse.json({
      success: result.success,
      message: result.success
        ? 'Test notification sent'
        : `Failed: ${result.error}`,
    })
  }

  // Regular registration
  if (!body.token || !body.platform) {
    return NextResponse.json(
      { error: 'token and platform are required' },
      { status: 400 }
    )
  }

  if (!body.token.startsWith('ExponentPushToken[')) {
    return NextResponse.json(
      { error: 'Invalid Expo push token format' },
      { status: 400 }
    )
  }

  const pushToken = await registerPushToken(userId, {
    token: body.token,
    platform: body.platform,
    deviceName: body.deviceName,
    events: body.events,
    minSeverity: body.minSeverity,
  })

  return NextResponse.json({ success: true, pushToken })
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
  await deletePushToken(userId, id)
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
  await togglePushToken(userId, id, active)
  return NextResponse.json({ success: true })
}
