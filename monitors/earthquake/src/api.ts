/**
 * Earthquake Monitor — API client
 * Fetches real-time earthquakes (M2.5+, last 24h) from USGS Earthquake Hazards.
 * @see https://earthquake.usgs.gov/fdsnws/event/1/
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse } from '@envirodash/core'

const USGS_API = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'

interface UsgsEarthquakeFeature {
  id: string
  properties?: {
    mag?: number
    place?: string
    time?: number
    alert?: string | null
    tsunami?: boolean | number
    type?: string
    title?: string
  }
  geometry?: {
    coordinates?: [number, number, number] // [lng, lat, depth]
  }
}

interface UsgsEarthquakeResponse {
  features?: UsgsEarthquakeFeature[]
  metadata?: { title?: string; generated?: number }
}

export interface EarthquakeQuery {
  /** Minimum magnitude (default: 2.5). */
  minMagnitude?: number
  /** Maximum number of results (default: 50). */
  limit?: number
}

export async function fetchEarthquakes(query: EarthquakeQuery = {}): Promise<MonitorDataResponse> {
  const { minMagnitude = 2.5, limit = 50 } = query
  const data = await fetchJson<UsgsEarthquakeResponse>(USGS_API, {
    headers: { 'User-Agent': 'EnviroDash/1.0' },
    cache: 'no-store',
    timeoutMs: 20000,
  })

  const all = (data.features || [])
    .filter((f) => (f.properties?.mag ?? 0) >= minMagnitude)
    .sort((a, b) => (b.properties?.mag ?? 0) - (a.properties?.mag ?? 0))
    .slice(0, limit)

  const results: MonitorLocation[] = all.map((f) => {
    const p = f.properties || {}
    const coords = f.geometry?.coordinates || [0, 0, 0]
    const mag = p.mag ?? 0
    const status = mag >= 6 ? 'critical' : mag >= 5 ? 'warning' : mag >= 4 ? 'moderate' : 'stable'
    return {
      id: `quake-${f.id}`,
      name: p.title || p.place || 'Unknown location',
      lat: coords[1],
      lng: coords[0],
      status,
      value: mag,
      unit: 'magnitude',
      lastUpdated: p.time ? new Date(p.time).toISOString() : undefined,
      description: `${p.title || p.place} — M${mag.toFixed(1)}, depth ${coords[2]?.toFixed(0)} km${p.tsunami ? ' · TSUNAMI WARNING' : ''}`,
      metrics: {
        magnitude: mag,
        depth: coords[2] ?? 0,
        tsunami: p.tsunami ? 1 : 0,
      },
    }
  })

  return {
    source: 'USGS Earthquake Hazards Program',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note: `Last 24 hours, M${minMagnitude}+. Sorted by magnitude (largest first).`,
  }
}
