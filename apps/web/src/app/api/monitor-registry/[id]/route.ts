import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Get a single published monitor by ID (including source code).
 *
 * GET /api/monitor-registry/[id]
 */

const REGISTRY_DIR = join(process.cwd(), 'data', 'monitor-registry')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const registryFile = join(REGISTRY_DIR, '_registry.json')
    const raw = await readFile(registryFile, 'utf-8')
    const data = JSON.parse(raw)

    const monitor = (data.monitors || []).find((m: any) => m.id === id)

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Increment download count
    monitor.downloadCount = (monitor.downloadCount || 0) + 1
    await writeFile(registryFile, JSON.stringify(data, null, 2)).catch(() => {})

    return NextResponse.json({ monitor })
  } catch {
    return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
  }
}

import { writeFile } from 'fs/promises'
