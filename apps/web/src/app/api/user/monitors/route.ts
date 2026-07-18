import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * Per-user installed monitors API.
 * Stores installed monitor IDs in a simple JSON file per user.
 *
 * In production, replace with a database (Prisma + PostgreSQL).
 *
 * GET  /api/user/monitors — list installed monitors for current user
 * POST /api/user/monitors { "monitorId": "air-quality" } — install
 * DELETE /api/user/monitors?monitorId=air-quality — uninstall
 */

const USER_DATA_DIR = join(process.cwd(), 'data', 'users')

async function getUserFile(userId: string): Promise<{ installed: string[] }> {
  try {
    const path = join(USER_DATA_DIR, `${userId}.json`)
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { installed: [] }
  }
}

async function setUserFile(userId: string, data: { installed: string[] }) {
  await mkdir(USER_DATA_DIR, { recursive: true })
  const path = join(USER_DATA_DIR, `${userId}.json`)
  await writeFile(path, JSON.stringify(data, null, 2))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const data = await getUserFile(userId)

  return NextResponse.json({
    userId,
    installed: data.installed,
    count: data.installed.length,
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const { monitorId } = await request.json()

  if (!monitorId || typeof monitorId !== 'string') {
    return NextResponse.json({ error: 'monitorId is required' }, { status: 400 })
  }

  const data = await getUserFile(userId)
  if (!data.installed.includes(monitorId)) {
    data.installed.push(monitorId)
    await setUserFile(userId, data)
  }

  return NextResponse.json({
    success: true,
    installed: data.installed,
    count: data.installed.length,
    message: `Monitor '${monitorId}' installed`,
  })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const { searchParams } = new URL(request.url)
  const monitorId = searchParams.get('monitorId')

  if (!monitorId) {
    return NextResponse.json({ error: 'monitorId query parameter is required' }, { status: 400 })
  }

  const data = await getUserFile(userId)
  data.installed = data.installed.filter((id) => id !== monitorId)
  await setUserFile(userId, data)

  return NextResponse.json({
    success: true,
    installed: data.installed,
    count: data.installed.length,
    message: `Monitor '${monitorId}' uninstalled`,
  })
}
