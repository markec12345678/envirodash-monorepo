import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Community Monitor Registry
 *
 * Browse all community-published monitors.
 *
 * GET /api/monitor-registry — list all published monitors
 * GET /api/monitor-registry?category=climate — filter by category
 * GET /api/monitor-registry?search=air — search by name/description
 * GET /api/monitor-registry?sort=downloads — sort by downloads/rating/newest
 */

const REGISTRY_DIR = join(process.cwd(), 'data', 'monitor-registry')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.toLowerCase()
  const sort = searchParams.get('sort') || 'newest'
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const registryFile = join(REGISTRY_DIR, '_registry.json')
    const raw = await readFile(registryFile, 'utf-8')
    const data = JSON.parse(raw)

    let monitors = data.monitors || []

    // Filter by category
    if (category) {
      monitors = monitors.filter((m: any) => m.category === category)
    }

    // Filter by search
    if (search) {
      monitors = monitors.filter((m: any) => {
        const hay = `${m.name} ${m.description} ${m.tags?.join(' ') || ''}`.toLowerCase()
        return hay.includes(search)
      })
    }

    // Sort
    switch (sort) {
      case 'downloads':
        monitors.sort((a: any, b: any) => (b.downloadCount || 0) - (a.downloadCount || 0))
        break
      case 'rating':
        monitors.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
        break
      case 'newest':
      default:
        monitors.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        break
    }

    // Limit
    monitors = monitors.slice(0, limit)

    // Don't return source code in list view
    const safe = monitors.map((m: any) => ({
      ...m,
      sourceCode: undefined,
    }))

    return NextResponse.json({
      monitors: safe,
      count: safe.length,
      total: data.monitors?.length || 0,
      filters: { category, search, sort },
    })
  } catch {
    return NextResponse.json({
      monitors: [],
      count: 0,
      total: 0,
      message: 'No community monitors published yet',
    })
  }
}
