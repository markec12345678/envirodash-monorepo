import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

/**
 * Community Monitor Publishing System
 *
 * Users can publish their own monitor packages to the EnviroDash registry.
 * Other users can then install them from the Marketplace.
 *
 * GET    /api/user/published-monitors — list user's published monitors
 * POST   /api/user/published-monitors — publish a new monitor
 * DELETE /api/user/published-monitors?id=<id> — unpublish
 *
 * GET    /api/monitor-registry — browse all community-published monitors
 */

const REGISTRY_DIR = join(process.cwd(), 'data', 'monitor-registry')

interface PublishedMonitor {
  id: string
  publisherId: string
  publisherName: string
  name: string
  description: string
  category: string
  icon: string
  accent: string
  version: string
  sourceCode: string // monitor component source code
  manifest: Record<string, any>
  publishedAt: string
  updatedAt: string
  downloadCount: number
  rating: number
  ratingCount: number
  tags: string[]
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const userFile = join(REGISTRY_DIR, `${userId}-published.json`)

  try {
    const raw = await readFile(userFile, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json({ monitors: data.monitors || [], count: (data.monitors || []).length })
  } catch {
    return NextResponse.json({ monitors: [], count: 0 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const publisherName = session.user?.name || session.user?.email || 'Anonymous'
  const body = await request.json()

  // Validate required fields
  if (!body.name || !body.description || !body.category || !body.sourceCode) {
    return NextResponse.json(
      { error: 'name, description, category, and sourceCode are required' },
      { status: 400 }
    )
  }

  const validCategories = [
    'atmospheric', 'climate', 'disaster', 'geological', 'hydrology', 'industrial',
    'infrastructure', 'oceanic', 'other', 'recreation', 'retail', 'services',
    'vegetation', 'weather', 'wildlife', 'environment',
  ]

  if (!validCategories.includes(body.category)) {
    return NextResponse.json({ error: `Invalid category. Valid: ${validCategories.join(', ')}` }, { status: 400 })
  }

  // Source code size limit (50KB)
  if (body.sourceCode.length > 50000) {
    return NextResponse.json({ error: 'Source code must be less than 50KB' }, { status: 400 })
  }

  const monitor: PublishedMonitor = {
    id: randomUUID(),
    publisherId: userId,
    publisherName,
    name: body.name,
    description: body.description,
    category: body.category,
    icon: body.icon || 'circle',
    accent: body.accent || 'emerald',
    version: body.version || '1.0.0',
    sourceCode: body.sourceCode,
    manifest: {
      id: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: body.name,
      category: body.category,
      icon: body.icon || 'circle',
      description: body.description,
      dataSource: body.dataSource || 'Community published',
      realData: body.realData || false,
      free: true,
      accent: body.accent || 'emerald',
      publisher: publisherName,
      version: body.version || '1.0.0',
    },
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloadCount: 0,
    rating: 0,
    ratingCount: 0,
    tags: body.tags || [],
  }

  // Save to user's published monitors
  await mkdir(REGISTRY_DIR, { recursive: true })
  const userFile = join(REGISTRY_DIR, `${userId}-published.json`)

  let store: { monitors: PublishedMonitor[] }
  try {
    store = JSON.parse(await readFile(userFile, 'utf-8'))
  } catch {
    store = { monitors: [] }
  }

  // Check for duplicate name (update if exists)
  const existingIdx = store.monitors.findIndex((m) => m.name === body.name)
  if (existingIdx >= 0) {
    monitor.id = store.monitors[existingIdx].id
    monitor.publishedAt = store.monitors[existingIdx].publishedAt
    monitor.downloadCount = store.monitors[existingIdx].downloadCount
    monitor.rating = store.monitors[existingIdx].rating
    monitor.ratingCount = store.monitors[existingIdx].ratingCount
    store.monitors[existingIdx] = monitor
  } else {
    store.monitors.push(monitor)
  }

  await writeFile(userFile, JSON.stringify(store, null, 2))

  // Also save to global registry for discovery
  const registryFile = join(REGISTRY_DIR, '_registry.json')
  let registry: { monitors: PublishedMonitor[] }
  try {
    registry = JSON.parse(await readFile(registryFile, 'utf-8'))
  } catch {
    registry = { monitors: [] }
  }

  const regIdx = registry.monitors.findIndex((m) => m.id === monitor.id)
  if (regIdx >= 0) {
    registry.monitors[regIdx] = monitor
  } else {
    registry.monitors.push(monitor)
  }

  await writeFile(registryFile, JSON.stringify(registry, null, 2))

  return NextResponse.json({
    success: true,
    monitor: {
      ...monitor,
      sourceCode: undefined, // Don't return source code in response
    },
    message: `Monitor '${body.name}' published to community registry`,
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
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Remove from user's published
  const userFile = join(REGISTRY_DIR, `${userId}-published.json`)
  try {
    const store = JSON.parse(await readFile(userFile, 'utf-8'))
    store.monitors = store.monitors.filter((m: PublishedMonitor) => m.id !== id)
    await writeFile(userFile, JSON.stringify(store, null, 2))
  } catch {
    // ignore
  }

  // Remove from global registry
  const registryFile = join(REGISTRY_DIR, '_registry.json')
  try {
    const registry = JSON.parse(await readFile(registryFile, 'utf-8'))
    registry.monitors = registry.monitors.filter((m: PublishedMonitor) => m.id !== id)
    await writeFile(registryFile, JSON.stringify(registry, null, 2))
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true, message: 'Monitor unpublished' })
}
