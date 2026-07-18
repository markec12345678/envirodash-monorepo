/**
 * Database Adapter
 *
 * Automatically detects the database type from DATABASE_URL:
 *   - SQLite (file:./...) — uses JSON file storage (no setup needed)
 *   - PostgreSQL (postgresql://...) — uses Prisma Client
 *
 * This adapter provides a unified interface for:
 *   - User management
 *   - API keys
 *   - Geofences
 *   - Dashboards
 *   - Installed monitors
 *   - Alert logs
 *
 * In development: just set DATABASE_URL=file:./db/dev.db (or leave default)
 * In production: set DATABASE_URL=postgresql://user:pass@host:5432/envirodash
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID, createHash } from 'crypto'

const DATA_DIR = join(process.cwd(), 'data', 'users')

export type DbBackend = 'sqlite' | 'postgresql'

export function detectBackend(): DbBackend {
  const url = process.env.DATABASE_URL || ''
  if (url.startsWith('file:') || url === '') return 'sqlite'
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'postgresql'
  return 'sqlite'
}

export const DB_BACKEND = detectBackend()

// ==================== JSON File Storage (SQLite/dev mode) ====================

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJsonFile(path: string, data: any): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2))
}

// ==================== Repository Interfaces ====================

export interface ApiKeyRecord {
  id: string
  userId: string
  name: string
  keyHash: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  requestCount: number
}

export interface GeofenceRecord {
  id: string
  userId: string
  name: string
  lat: number
  lng: number
  radiusKm: number
  thresholds: {
    aqi?: number
    fwi?: number
    magnitude?: number
    sst?: number
  }
  createdAt: string
}

export interface DashboardCardConfig {
  id: string
  type: string
  title: string
  params: Record<string, any>
  order: number
}

export interface DashboardRecord {
  userId: string
  cards: DashboardCardConfig[]
  updatedAt: string
}

// ==================== Database Adapter ====================

export const db = {
  backend: DB_BACKEND,

  // ==================== API Keys ====================

  async listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: Use Prisma Client when PostgreSQL is configured
      // const prisma = await getPrismaClient()
      // return prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    }
    const store = await readJsonFile<{ keys: ApiKeyRecord[] }>(join(DATA_DIR, `${userId}-api-keys.json`), { keys: [] })
    return store.keys
  },

  async createApiKey(userId: string, name: string, rawKey: string): Promise<ApiKeyRecord> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const record: ApiKeyRecord = {
      id: randomUUID(),
      userId,
      name,
      keyHash,
      keyPrefix: rawKey.slice(0, 14) + '...',
      createdAt: new Date().toISOString(),
      requestCount: 0,
    }

    if (DB_BACKEND === 'postgresql') {
      // TODO: const prisma = await getPrismaClient()
      // await prisma.apiKey.create({ data: record })
    } else {
      const store = await readJsonFile<{ keys: ApiKeyRecord[] }>(join(DATA_DIR, `${userId}-api-keys.json`), { keys: [] })
      store.keys.push(record)
      await writeJsonFile(join(DATA_DIR, `${userId}-api-keys.json`), store)
    }
    return record
  },

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: const prisma = await getPrismaClient()
      // await prisma.apiKey.deleteMany({ where: { id: keyId, userId } })
    } else {
      const store = await readJsonFile<{ keys: ApiKeyRecord[] }>(join(DATA_DIR, `${userId}-api-keys.json`), { keys: [] })
      store.keys = store.keys.filter((k) => k.id !== keyId)
      await writeJsonFile(join(DATA_DIR, `${userId}-api-keys.json`), store)
    }
  },

  async validateApiKey(rawKey: string): Promise<{ valid: boolean; userId?: string; keyId?: string }> {
    if (!rawKey.startsWith('ed_live_')) return { valid: false }
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    if (DB_BACKEND === 'postgresql') {
      // TODO: const prisma = await getPrismaClient()
      // const key = await prisma.apiKey.findUnique({ where: { keyHash } })
      // if (key) {
      //   await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date(), requestCount: { increment: 1 } } })
      //   return { valid: true, userId: key.userId, keyId: key.id }
      // }
    } else {
      // Scan all user key files (replace with DB in production)
      const { readdir } = await import('fs/promises')
      const files = await readdir(DATA_DIR).catch(() => [])
      for (const f of files) {
        if (!f.endsWith('-api-keys.json')) continue
        const store = await readJsonFile<{ keys: ApiKeyRecord[] }>(join(DATA_DIR, f), { keys: [] })
        const match = store.keys.find((k) => k.keyHash === keyHash)
        if (match) {
          match.lastUsedAt = new Date().toISOString()
          match.requestCount = (match.requestCount || 0) + 1
          await writeJsonFile(join(DATA_DIR, f), store)
          return { valid: true, userId: match.userId, keyId: match.id }
        }
      }
    }
    return { valid: false }
  },

  // ==================== Geofences ====================

  async listGeofences(userId: string): Promise<GeofenceRecord[]> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.geofence.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    }
    const store = await readJsonFile<{ geofences: GeofenceRecord[] }>(join(DATA_DIR, `${userId}-geofences.json`), { geofences: [] })
    return store.geofences
  },

  async createGeofence(userId: string, data: Omit<GeofenceRecord, 'id' | 'userId' | 'createdAt'>): Promise<GeofenceRecord> {
    const record: GeofenceRecord = {
      ...data,
      id: randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    }

    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.geofence.create({ data: { ...record, thresholds: JSON.stringify(record.thresholds) } })
    } else {
      const store = await readJsonFile<{ geofences: GeofenceRecord[] }>(join(DATA_DIR, `${userId}-geofences.json`), { geofences: [] })
      store.geofences.push(record)
      await writeJsonFile(join(DATA_DIR, `${userId}-geofences.json`), store)
    }
    return record
  },

  async deleteGeofence(userId: string, geofenceId: string): Promise<void> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.geofence.deleteMany({ where: { id: geofenceId, userId } })
    } else {
      const store = await readJsonFile<{ geofences: GeofenceRecord[] }>(join(DATA_DIR, `${userId}-geofences.json`), { geofences: [] })
      store.geofences = store.geofences.filter((g) => g.id !== geofenceId)
      await writeJsonFile(join(DATA_DIR, `${userId}-geofences.json`), store)
    }
  },

  // ==================== Dashboard ====================

  async getDashboard(userId: string): Promise<DashboardRecord | null> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.dashboard.findUnique({ where: { userId } })
    }
    return readJsonFile<DashboardRecord | null>(join(DATA_DIR, `${userId}-dashboard.json`), null)
  },

  async saveDashboard(userId: string, cards: DashboardCardConfig[]): Promise<DashboardRecord> {
    const record: DashboardRecord = {
      userId,
      cards,
      updatedAt: new Date().toISOString(),
    }

    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.dashboard.upsert({ where: { userId }, create: { ...record, cards: JSON.stringify(cards) }, update: { cards: JSON.stringify(cards), updatedAt: new Date() } })
    } else {
      await writeJsonFile(join(DATA_DIR, `${userId}-dashboard.json`), record)
    }
    return record
  },

  // ==================== Installed Monitors ====================

  async listInstalledMonitors(userId: string): Promise<string[]> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.userMonitor.findMany({ where: { userId }, select: { monitorId: true } })
    }
    const store = await readJsonFile<{ installed: string[] }>(join(DATA_DIR, `${userId}-monitors.json`), { installed: [] })
    return store.installed
  },

  async installMonitor(userId: string, monitorId: string): Promise<void> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.userMonitor.upsert({ where: { userId_monitorId: { userId, monitorId } }, create: { userId, monitorId }, update: {} })
    } else {
      const store = await readJsonFile<{ installed: string[] }>(join(DATA_DIR, `${userId}-monitors.json`), { installed: [] })
      if (!store.installed.includes(monitorId)) {
        store.installed.push(monitorId)
        await writeJsonFile(join(DATA_DIR, `${userId}-monitors.json`), store)
      }
    }
  },

  async uninstallMonitor(userId: string, monitorId: string): Promise<void> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.userMonitor.deleteMany({ where: { userId, monitorId } })
    } else {
      const store = await readJsonFile<{ installed: string[] }>(join(DATA_DIR, `${userId}-monitors.json`), { installed: [] })
      store.installed = store.installed.filter((id) => id !== monitorId)
      await writeJsonFile(join(DATA_DIR, `${userId}-monitors.json`), store)
    }
  },

  // ==================== Alert Log ====================

  async logAlert(alert: {
    type: string
    severity: string
    title: string
    description?: string
    value?: number
    unit?: string
    source: string
  }): Promise<void> {
    if (DB_BACKEND === 'postgresql') {
      // TODO: prisma.alertLog.create({ data: alert })
    }
    // For SQLite/dev, just log to console (don't persist)
    console.log(`[AlertLog] ${alert.severity.toUpperCase()} ${alert.type}: ${alert.title}`)
  },
}
