import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

/**
 * Per-user geofences — saved locations with alert thresholds.
 *
 * A geofence is a circular area around a point where the user wants to be
 * notified when environmental conditions exceed a threshold.
 *
 * Storage: data/users/<userId>-geofences.json (replace with Prisma+PostgreSQL in production)
 *
 * GET    /api/user/geofences — list user's geofences
 * POST   /api/user/geofences — create a geofence
 *   body: { name, lat, lng, radiusKm, thresholds: { aqi?: number, fwi?: number, magnitude?: number } }
 * PUT    /api/user/geofences?id=<id> — update a geofence
 * DELETE /api/user/geofences?id=<id> — delete a geofence
 */

interface GeofenceThreshold {
  /** Notify if US AQI exceeds this value */
  aqi?: number
  /** Notify if Fire Weather Index exceeds this value */
  fwi?: number
  /** Notify if earthquake magnitude within radius exceeds this value */
  magnitude?: number
  /** Notify if sea surface temperature exceeds this value (coral reefs) */
  sst?: number
}

interface Geofence {
  id: string
  name: string
  lat: number
  lng: number
  radiusKm: number
  thresholds: GeofenceThreshold
  createdAt: string
  lastAlertedAt?: Record<string, string> // keyed by alert type
}

const USER_DATA_DIR = join(process.cwd(), 'data', 'users')

async function getUserGeofences(userId: string): Promise<Geofence[]> {
  try {
    const path = join(USER_DATA_DIR, `${userId}-geofences.json`)
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw).geofences || []
  } catch {
    return []
  }
}

async function setUserGeofences(userId: string, geofences: Geofence[]) {
  await mkdir(USER_DATA_DIR, { recursive: true })
  const path = join(USER_DATA_DIR, `${userId}-geofences.json`)
  await writeFile(path, JSON.stringify({ geofences }, null, 2))
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const geofences = await getUserGeofences(userId)

  return NextResponse.json({
    userId,
    geofences,
    count: geofences.length,
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const body = await request.json()

  if (!body.name || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json(
      { error: 'name, lat, lng are required' },
      { status: 400 }
    )
  }

  const geofence: Geofence = {
    id: randomUUID(),
    name: body.name,
    lat: body.lat,
    lng: body.lng,
    radiusKm: body.radiusKm || 50,
    thresholds: body.thresholds || { aqi: 150, fwi: 50, magnitude: 5 },
    createdAt: new Date().toISOString(),
  }

  const geofences = await getUserGeofences(userId)
  geofences.push(geofence)
  await setUserGeofences(userId, geofences)

  return NextResponse.json({
    success: true,
    geofence,
    count: geofences.length,
    message: `Geofence '${geofence.name}' created`,
  })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
  }

  const geofences = await getUserGeofences(userId)
  const filtered = geofences.filter((g) => g.id !== id)
  await setUserGeofences(userId, filtered)

  return NextResponse.json({
    success: true,
    count: filtered.length,
    message: `Geofence deleted`,
  })
}

// Helper export — used by alerts-ws mini-service to check geofences (via HTTP fetch)
export { haversineDistanceKm }
