import { describe, it, expect } from 'vitest'

/**
 * Tests for monitor manifest structure.
 * Validates that all monitor packages have the required manifest.json fields.
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

import { existsSync } from 'fs'

function findMonitorsDir(): string {
  const candidates = [
    process.env.MONITORS_DIR,
    join(process.cwd(), 'monitors'),
    join(process.cwd(), '..', 'monitors'),
    join(process.cwd(), '..', '..', 'monitors'),
    join(__dirname, '..', '..', '..', '..', 'monitors'),
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return join(process.cwd(), 'monitors')
}

const MONITORS_DIR = findMonitorsDir()

function getMonitorDirs(): string[] {
  try {
    return readdirSync(MONITORS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    return []
  }
}

const REQUIRED_FIELDS = ['id', 'name', 'category', 'icon', 'description', 'dataSource', 'realData', 'free']
const VALID_CATEGORIES = [
  'atmospheric', 'climate', 'disaster', 'geological', 'hydrology', 'industrial',
  'infrastructure', 'oceanic', 'other', 'recreation', 'retail', 'services',
  'vegetation', 'weather', 'wildlife', 'environment',
]
const VALID_ACCENTS = [
  'emerald', 'teal', 'orange', 'rose', 'amber', 'pink', 'fuchsia',
  'violet', 'purple', 'cyan', 'green', 'red', 'sky', 'yellow', 'stone',
]

describe('monitor manifests', () => {
  const monitorDirs = getMonitorDirs()

  it('finds monitor packages', () => {
    expect(monitorDirs.length).toBeGreaterThan(800)
  })

  // Test a sample of 10 monitors to keep test fast
  const sample = monitorDirs.slice(0, 10)

  sample.forEach((dir) => {
    describe(`monitors/${dir}`, () => {
      let manifest: any

      it('has manifest.json', () => {
        const path = join(MONITORS_DIR, dir, 'manifest.json')
        expect(() => readFileSync(path, 'utf-8')).not.toThrow()
        manifest = JSON.parse(readFileSync(path, 'utf-8'))
      })

      it('has all required fields', () => {
        REQUIRED_FIELDS.forEach((field) => {
          expect(manifest[field], `Missing field '${field}'`).toBeDefined()
        })
      })

      it('id matches directory name', () => {
        expect(manifest.id).toBe(dir)
      })

      it('has valid category', () => {
        expect(VALID_CATEGORIES).toContain(manifest.category)
      })

      it('realData is boolean', () => {
        expect(typeof manifest.realData).toBe('boolean')
      })

      it('free is boolean', () => {
        expect(typeof manifest.free).toBe('boolean')
      })

      it('has non-empty name and description', () => {
        expect(manifest.name.length).toBeGreaterThan(2)
        expect(manifest.description.length).toBeGreaterThan(10)
      })

      it('uses valid accent color (if specified)', () => {
        if (manifest.accent) {
          expect(VALID_ACCENTS).toContain(manifest.accent)
        }
      })
    })
  })
})

describe('real-data monitors', () => {
  const monitorDirs = getMonitorDirs()
  const realMonitors: any[] = []

  monitorDirs.forEach((dir) => {
    try {
      const manifest = JSON.parse(readFileSync(join(MONITORS_DIR, dir, 'manifest.json'), 'utf-8'))
      if (manifest.realData) {
        realMonitors.push(manifest)
      }
    } catch {
      // skip
    }
  })

  it('has at least 10 real-data monitors', () => {
    expect(realMonitors.length).toBeGreaterThanOrEqual(10)
  })

  it('includes all 10 expected real-data monitors', () => {
    const expectedIds = [
      'air-quality', 'wildfire', 'tsunami', 'volcano', 'earthquake',
      'weather', 'glacier', 'coral-reef', 'flood', 'drought',
    ]
    const actualIds = realMonitors.map((m) => m.id)
    expectedIds.forEach((id) => {
      expect(actualIds, `Missing real-data monitor: ${id}`).toContain(id)
    })
  })
})
