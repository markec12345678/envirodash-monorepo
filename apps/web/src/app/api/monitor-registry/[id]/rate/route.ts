import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Rate a published monitor.
 * POST /api/monitor-registry/[id]/rate
 * body: { rating: number (1-5), userId: string }
 */

const REGISTRY_DIR = join(process.cwd(), 'data', 'monitor-registry')

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const body = await request.json()

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
  }

  try {
    const registryFile = join(REGISTRY_DIR, '_registry.json')
    const raw = await readFile(registryFile, 'utf-8')
    const data = JSON.parse(raw)

    const monitor = (data.monitors || []).find((m: any) => m.id === id)
    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    const oldTotal = (monitor.rating || 0) * (monitor.ratingCount || 0)
    monitor.ratingCount = (monitor.ratingCount || 0) + 1
    monitor.rating = (oldTotal + body.rating) / monitor.ratingCount

    await writeFile(registryFile, JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      rating: monitor.rating,
      ratingCount: monitor.ratingCount,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to rate' }, { status: 500 })
  }
}
