import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * Per-user custom dashboard layout.
 *
 * Users can pick which monitor cards to show on their dashboard and in what order.
 * Stored as JSON per user.
 *
 * GET    /api/user/dashboard — get user's dashboard config
 * POST   /api/user/dashboard — save dashboard config
 *   body: { cards: [{ id, type, params, order }] }
 */

interface DashboardCard {
  id: string
  type: 'air-quality' | 'wildfire' | 'earthquake' | 'tsunami' | 'volcano' | 'weather' | 'glacier' | 'coral-reef' | 'flood' | 'drought'
  title: string
  params: Record<string, any>
  order: number
}

interface DashboardConfig {
  cards: DashboardCard[]
  updatedAt: string
}

const USER_DATA_DIR = join(process.cwd(), 'data', 'users')

async function getUserDashboard(userId: string): Promise<DashboardConfig | null> {
  try {
    const path = join(USER_DATA_DIR, `${userId}-dashboard.json`)
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function setUserDashboard(userId: string, config: DashboardConfig) {
  await mkdir(USER_DATA_DIR, { recursive: true })
  const path = join(USER_DATA_DIR, `${userId}-dashboard.json`)
  await writeFile(path, JSON.stringify(config, null, 2))
}

const DEFAULT_DASHBOARD: DashboardConfig = {
  cards: [
    { id: 'card-aq', type: 'air-quality', title: 'Air Quality — Slovenia', params: { country: 'SI' }, order: 0 },
    { id: 'card-eq', type: 'earthquake', title: 'Earthquakes (24h)', params: { limit: 5 }, order: 1 },
    { id: 'card-wf', type: 'wildfire', title: 'Wildfire Risk — Europe', params: { area: 'europe' }, order: 2 },
    { id: 'card-tsunami', type: 'tsunami', title: 'Tsunami Warnings', params: {}, order: 3 },
  ],
  updatedAt: new Date().toISOString(),
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const config = (await getUserDashboard(userId)) || DEFAULT_DASHBOARD

  return NextResponse.json({
    userId,
    dashboard: config,
    isDefault: config === DEFAULT_DASHBOARD,
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const body = await request.json()

  if (!body.cards || !Array.isArray(body.cards)) {
    return NextResponse.json({ error: 'cards array is required' }, { status: 400 })
  }

  // Validate cards
  const validTypes = ['air-quality', 'wildfire', 'earthquake', 'tsunami', 'volcano', 'weather', 'glacier', 'coral-reef', 'flood', 'drought']
  const cleaned: DashboardCard[] = body.cards
    .filter((c: any) => c && validTypes.includes(c.type))
    .map((c: any, i: number) => ({
      id: c.id || `card-${i}`,
      type: c.type,
      title: c.title || c.type,
      params: c.params || {},
      order: typeof c.order === 'number' ? c.order : i,
    }))
    .sort((a: DashboardCard, b: DashboardCard) => a.order - b.order)

  const config: DashboardConfig = {
    cards: cleaned,
    updatedAt: new Date().toISOString(),
  }

  await setUserDashboard(userId, config)

  return NextResponse.json({
    success: true,
    dashboard: config,
    message: `Dashboard saved with ${cleaned.length} cards`,
  })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  await setUserDashboard(userId, DEFAULT_DASHBOARD)

  return NextResponse.json({
    success: true,
    message: 'Dashboard reset to default',
    dashboard: DEFAULT_DASHBOARD,
  })
}
