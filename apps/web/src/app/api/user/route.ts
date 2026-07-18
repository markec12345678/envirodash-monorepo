import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Get current user session.
 * GET /api/user/session
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user?.id || (session.user as any)?.id,
      email: session.user?.email,
      name: session.user?.name,
      image: session.user?.image,
      role: (session.user as any)?.role,
      tenantId: (session.user as any)?.tenantId,
      plan: (session.user as any)?.plan,
    },
    expires: session.expires,
  })
}
