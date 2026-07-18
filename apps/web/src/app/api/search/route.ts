import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { fetchJson } from '@envirodash/core'

/**
 * Advanced full-text search across:
 *   - All 874 monitor packages (name, description, category, tags)
 *   - Live environmental data (earthquakes, tsunami, volcanoes)
 *   - Community-published monitors
 *
 * GET /api/search?q=air+quality+Slovenia&limit=20
 *
 * Returns unified results with type, relevance score, and action.
 */

const MONITORS_DIR = join(process.cwd(), '..', '..', 'monitors')
const REGISTRY_DIR = join(process.cwd(), 'data', 'monitor-registry')

interface SearchResult {
  type: 'monitor' | 'community-monitor' | 'earthquake' | 'tsunami' | 'volcano' | 'air-quality'
  id: string
  title: string
  description: string
  category?: string
  url?: string
  score: number
  meta?: Record<string, any>
}

function calculateScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let score = 0

  // Exact match
  if (t === q) score += 100

  // Starts with
  if (t.startsWith(q)) score += 50

  // Contains all words
  const queryWords = q.split(/\s+/).filter((w) => w.length > 1)
  const allWordsPresent = queryWords.every((w) => t.includes(w))
  if (allWordsPresent) score += 30

  // Contains any word
  queryWords.forEach((w) => {
    if (t.includes(w)) score += 10
  })

  // Word boundary matches
  queryWords.forEach((w) => {
    const regex = new RegExp(`\\b${w}`, 'gi')
    const matches = t.match(regex)
    if (matches) score += matches.length * 5
  })

  return score
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20')
  const types = searchParams.get('types')?.split(',') || ['monitor', 'earthquake', 'tsunami', 'volcano']

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], count: 0, query: q, hint: 'Query must be at least 2 characters' })
  }

  const results: SearchResult[] = []
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`

  // ==================== Search Monitors ====================
  if (types.includes('monitor')) {
    try {
      const entries = await readdir(MONITORS_DIR, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        try {
          const manifestPath = join(MONITORS_DIR, entry.name, 'manifest.json')
          const raw = await readFile(manifestPath, 'utf-8')
          const m = JSON.parse(raw)

          const searchText = `${m.name} ${m.description} ${m.category} ${m.id} ${m.dataSource || ''}`
          const score = calculateScore(q, searchText)

          if (score > 0) {
            results.push({
              type: 'monitor',
              id: m.id,
              title: m.name,
              description: m.description,
              category: m.category,
              url: m.realData ? `monitor:${m.id}` : undefined,
              score,
              meta: {
                realData: m.realData,
                free: m.free,
                icon: m.icon,
                accent: m.accent,
                dataSource: m.dataSource,
              },
            })
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }
  }

  // ==================== Search Community Monitors ====================
  if (types.includes('monitor')) {
    try {
      const registryRaw = await readFile(join(REGISTRY_DIR, '_registry.json'), 'utf-8')
      const registry = JSON.parse(registryRaw)
      for (const m of registry.monitors || []) {
        const searchText = `${m.name} ${m.description} ${m.category} ${m.tags?.join(' ') || ''} ${m.publisherName}`
        const score = calculateScore(q, searchText)
        if (score > 0) {
          results.push({
            type: 'community-monitor',
            id: m.id,
            title: m.name,
            description: m.description,
            category: m.category,
            score,
            meta: {
              publisher: m.publisherName,
              version: m.version,
              rating: m.rating,
              downloadCount: m.downloadCount,
            },
          })
        }
      }
    } catch {
      // skip
    }
  }

  // ==================== Search Live Earthquakes ====================
  if (types.includes('earthquake')) {
    try {
      const data = await fetchJson<any>(`${baseUrl}/api/earthquake?limit=50`, { cache: 'no-store' })
      for (const eq of data.results || []) {
        const searchText = `${eq.name} ${eq.description} M${eq.value} earthquake`
        const score = calculateScore(q, searchText)
        if (score > 0) {
          results.push({
            type: 'earthquake',
            id: eq.id,
            title: `M${eq.value?.toFixed(1)} — ${eq.name}`,
            description: eq.description || '',
            score: score + 20, // Boost live data
            meta: {
              magnitude: eq.value,
              lat: eq.lat,
              lng: eq.lng,
              status: eq.status,
              timestamp: eq.lastUpdated,
            },
          })
        }
      }
    } catch {
      // skip
    }
  }

  // ==================== Search Tsunami ====================
  if (types.includes('tsunami')) {
    try {
      const data = await fetchJson<any>(`${baseUrl}/api/tsunami`, { cache: 'no-store' })
      for (const t of data.results || []) {
        const searchText = `${t.title} ${t.description} tsunami ${t.region} ${t.msg_type}`
        const score = calculateScore(q, searchText)
        if (score > 0) {
          results.push({
            type: 'tsunami',
            id: t.id,
            title: `🌊 ${t.title}`,
            description: t.description || '',
            score: score + 20,
            meta: { msgType: t.msg_type, region: t.region, severity: t.severity },
          })
        }
      }
    } catch {
      // skip
    }
  }

  // ==================== Search Volcanoes ====================
  if (types.includes('volcano')) {
    try {
      const data = await fetchJson<any>(`${baseUrl}/api/volcano`, { cache: 'no-store' })
      for (const v of data.results || []) {
        const searchText = `${v.name} ${v.description} volcano ${v.metrics?.alert} ${v.metrics?.country}`
        const score = calculateScore(q, searchText)
        if (score > 0) {
          results.push({
            type: 'volcano',
            id: v.id,
            title: `🌋 ${v.name}`,
            description: v.description || '',
            score: score + 20,
            meta: { alert: v.metrics?.alert, country: v.metrics?.country, status: v.status },
          })
        }
      }
    } catch {
      // skip
    }
  }

  // Sort by score (descending) and limit
  results.sort((a, b) => b.score - a.score)
  const limited = results.slice(0, limit)

  // Group by type for summary
  const byType: Record<string, number> = {}
  results.forEach((r) => {
    byType[r.type] = (byType[r.type] || 0) + 1
  })

  return NextResponse.json({
    query: q,
    results: limited,
    count: limited.length,
    totalMatches: results.length,
    byType,
    searchedAt: new Date().toISOString(),
  })
}
