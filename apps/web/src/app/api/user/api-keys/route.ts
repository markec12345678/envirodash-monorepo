import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * API Key management for programmatic access.
 *
 * Users can generate API keys to use the EnviroDash REST API without
 * going through the web UI. Useful for:
 *   - Integration with external dashboards
 *   - Automated data collection
 *   - Mobile/desktop clients
 *
 * GET    /api/user/api-keys — list user's API keys
 * POST   /api/user/api-keys { name } — generate new key (returns key once)
 * DELETE /api/user/api-keys?id=<id> — revoke a key
 */

interface ApiKey {
  id: string
  name: string
  /** SHA-256 hash of the actual key (we never store plaintext) */
  keyHash: string
  /** First 12 chars of the key, for display (e.g. "ed_live_abc...") */
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  requestCount: number
}

interface ApiKeyStore {
  keys: ApiKey[]
}

const USER_DATA_DIR = join(process.cwd(), 'data', 'users')

async function getUserKeys(userId: string): Promise<ApiKeyStore> {
  try {
    const path = join(USER_DATA_DIR, `${userId}-api-keys.json`)
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { keys: [] }
  }
}

async function setUserKeys(userId: string, store: ApiKeyStore) {
  await mkdir(USER_DATA_DIR, { recursive: true })
  const path = join(USER_DATA_DIR, `${userId}-api-keys.json`)
  await writeFile(path, JSON.stringify(store, null, 2))
}

async function hashKey(key: string): Promise<string> {
  const { createHash } = await import('crypto')
  return createHash('sha256').update(key).digest('hex')
}

function generateApiKey(): string {
  const random = randomBytes(24).toString('hex')
  return `ed_live_${random}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const store = await getUserKeys(userId)

  // Don't return the hash
  const safeKeys = store.keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    requestCount: k.requestCount,
  }))

  return NextResponse.json({
    userId,
    keys: safeKeys,
    count: safeKeys.length,
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'anonymous'
  const body = await request.json()

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Limit to 5 keys per user
  const store = await getUserKeys(userId)
  if (store.keys.length >= 5) {
    return NextResponse.json({ error: 'Maximum 5 API keys per user' }, { status: 400 })
  }

  const rawKey = generateApiKey()
  const keyHash = await hashKey(rawKey)
  const newKey: ApiKey = {
    id: randomBytes(8).toString('hex'),
    name: body.name,
    keyHash,
    keyPrefix: rawKey.slice(0, 14) + '...',
    createdAt: new Date().toISOString(),
    requestCount: 0,
  }

  store.keys.push(newKey)
  await setUserKeys(userId, store)

  // Return the raw key ONCE — never again retrievable
  return NextResponse.json({
    success: true,
    key: rawKey,
    keyInfo: {
      id: newKey.id,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      createdAt: newKey.createdAt,
    },
    message: 'Save this key securely — it will not be shown again.',
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

  const store = await getUserKeys(userId)
  store.keys = store.keys.filter((k) => k.id !== id)
  await setUserKeys(userId, store)

  return NextResponse.json({
    success: true,
    message: 'API key revoked',
    remainingCount: store.keys.length,
  })
}

// Export helper for v1 API to validate keys
export async function validateApiKey(authHeader: string | null): Promise<{ valid: boolean; userId?: string; keyId?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false }
  }
  const rawKey = authHeader.slice(7)
  if (!rawKey.startsWith('ed_live_')) {
    return { valid: false }
  }

  const keyHash = await hashKey(rawKey)

  // Search all users' keys (this is O(n) — replace with DB lookup in production)
  try {
    const files = await readFile(join(USER_DATA_DIR, '..'), 'utf-8').catch(() => null)
    // For simplicity, scan all user-api-keys.json files
    const { readdir } = await import('fs/promises')
    const allFiles = await readdir(USER_DATA_DIR).catch(() => [])
    for (const f of allFiles) {
      if (!f.endsWith('-api-keys.json')) continue
      const raw = await readFile(join(USER_DATA_DIR, f), 'utf-8')
      const store: ApiKeyStore = JSON.parse(raw)
      const match = store.keys.find((k) => k.keyHash === keyHash)
      if (match) {
        const userId = f.replace('-api-keys.json', '')
        // Update lastUsedAt and requestCount
        match.lastUsedAt = new Date().toISOString()
        match.requestCount = (match.requestCount || 0) + 1
        await writeFile(join(USER_DATA_DIR, f), JSON.stringify(store, null, 2))
        return { valid: true, userId, keyId: match.id }
      }
    }
  } catch (e) {
    // ignore
  }
  return { valid: false }
}
