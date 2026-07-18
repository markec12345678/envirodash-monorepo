import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { MonitorManifest } from '@envirodash/core'

/**
 * Marketplace API — list all available monitor packages.
 *
 * Reads all monitor manifest.json files from /monitors/* and returns them
 * as a list, sorted by:
 *   1. realData monitors first (real-time data)
 *   2. then by category
 *   3. then by name
 *
 * GET /api/marketplace
 * GET /api/marketplace?category=environment
 * GET /api/marketplace?realData=true
 * GET /api/marketplace?search=air
 */

const MONITORS_DIR = join(process.cwd(), '..', '..', 'monitors')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const realData = searchParams.get('realData')
  const search = searchParams.get('search')?.toLowerCase()
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    const entries = await readdir(MONITORS_DIR, { withFileTypes: true })
    const monitorDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

    const monitors: (MonitorManifest & { installed?: boolean })[] = []

    for (const dir of monitorDirs) {
      try {
        const manifestPath = join(MONITORS_DIR, dir, 'manifest.json')
        const raw = await readFile(manifestPath, 'utf-8')
        const manifest = JSON.parse(raw) as MonitorManifest

        // Apply filters
        if (category && manifest.category !== category) continue
        if (realData === 'true' && !manifest.realData) continue
        if (realData === 'false' && manifest.realData) continue
        if (search) {
          const haystack = `${manifest.name} ${manifest.description} ${manifest.id}`.toLowerCase()
          if (!haystack.includes(search)) continue
        }

        monitors.push(manifest)
      } catch (e) {
        // Skip monitors without manifest.json
      }
    }

    // Sort: realData first, then by category, then by name
    monitors.sort((a, b) => {
      if (a.realData !== b.realData) return a.realData ? -1 : 1
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.name.localeCompare(b.name)
    })

    // Category counts
    const categories: Record<string, number> = {}
    for (const m of monitors) {
      categories[m.category] = (categories[m.category] || 0) + 1
    }

    return NextResponse.json({
      total: monitors.length,
      shown: Math.min(monitors.length, limit),
      monitors: monitors.slice(0, limit),
      categories,
      filters: { category, realData, search },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to read monitors', details: error.message },
      { status: 500 }
    )
  }
}
