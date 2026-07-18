import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendTestEmail } from '@/lib/email'

/**
 * Send a test email to verify SMTP configuration.
 * POST /api/email/test?to=user@example.com
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to') || (session.user as any).email

  if (!to) {
    return NextResponse.json({ error: 'Email address required (?to=...)' }, { status: 400 })
  }

  const result = await sendTestEmail(to)

  return NextResponse.json({
    success: result.success,
    message: result.success
      ? `Test email sent to ${to}`
      : `Failed to send: ${result.error || 'SMTP not configured'}`,
    smtpConfigured: !!process.env.SMTP_HOST,
  })
}
