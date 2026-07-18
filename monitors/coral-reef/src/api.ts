/**
 * Coral Reef Monitor — API client
 * Fetches real-time sea surface temperature (SST) for major coral reef regions
 * using the Open-Meteo Marine API.
 *
 * Coral bleaching occurs when SST exceeds the long-term summer maximum by 1°C or more
 * for 4+ weeks (Degree Heating Weeks). This monitor provides the raw SST data;
 * bleaching alert levels are derived from comparing current SST to known thresholds.
 *
 * @see https://open-meteo.com/en/docs/marine-weather-api
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse, type CityRef } from '@envirodash/core'

const MARINE_API = 'https://marine-api.open-meteo.com/v1/marine'

/** Major coral reef regions with their coordinates. */
const REEFS: CityRef[] = [
  { name: 'Great Barrier Reef (AU)', lat: -18.287, lng: 147.700 },
  { name: 'Caribbean — Belize Barrier', lat: 17.300, lng: -87.900 },
  { name: 'Red Sea — Egypt', lat: 27.000, lng: 34.000 },
  { name: 'Maldive Atolls', lat: 3.200, lng: 73.220 },
  { name: 'Caribbean — Bonaire', lat: 12.150, lng: -68.270 },
  { name: 'Indonesia — Raja Ampat', lat: -0.500, lng: 130.500 },
  { name: 'Philippines — Tubbataha', lat: 8.850, lng: 119.900 },
  { name: 'Florida Keys (US)', lat: 24.700, lng: -81.000 },
  { name: 'Hawaii — Kaneohe Bay', lat: 21.450, lng: -157.800 },
  { name: 'Fiji — Astrolabe Reef', lat: -18.700, lng: 178.500 },
]

interface MarineResponse {
  current?: {
    time?: string
    sea_surface_temperature?: number
    wave_height?: number
    wave_direction?: number
  }
}

export interface CoralReefQuery {
  region?: 'all' | 'pacific' | 'caribbean' | 'indian' | 'red-sea'
  lat?: number
  lng?: number
  name?: string
  limit?: number
}

export async function fetchCoralReefs(query: CoralReefQuery = {}): Promise<MonitorDataResponse> {
  const { region = 'all', lat, lng, name, limit = 10 } = query

  if (lat != null && lng != null) {
    const url = `${MARINE_API}?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature,wave_height,wave_direction`
    const data = await fetchJson<MarineResponse>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })
    return {
      source: 'Open-Meteo Marine API (SST)',
      count: 1,
      results: [normalizeReef(lat, lng, name || 'Custom location', data)],
      fetchedAt: new Date().toISOString(),
    }
  }

  let reefs = REEFS
  if (region === 'pacific') reefs = REEFS.filter((r) => r.name.includes('Great Barrier') || r.name.includes('Fiji') || r.name.includes('Hawaii') || r.name.includes('Indonesia') || r.name.includes('Philippines'))
  else if (region === 'caribbean') reefs = REEFS.filter((r) => r.name.includes('Caribbean') || r.name.includes('Florida'))
  else if (region === 'indian') reefs = REEFS.filter((r) => r.name.includes('Maldiv'))
  else if (region === 'red-sea') reefs = REEFS.filter((r) => r.name.includes('Red Sea'))
  reefs = reefs.slice(0, limit)

  const results: MonitorLocation[] = []
  for (const r of reefs) {
    try {
      const url = `${MARINE_API}?latitude=${r.lat}&longitude=${r.lng}&current=sea_surface_temperature,wave_height,wave_direction`
      const data = await fetchJson<MarineResponse>(url, {
        headers: { 'User-Agent': 'EnviroDash/1.0' },
        cache: 'no-store',
      })
      results.push(normalizeReef(r.lat, r.lng, r.name, data))
    } catch (e: any) {
      console.error(`Coral reef fetch failed for ${r.name}:`, e.message)
    }
  }

  return {
    source: 'Open-Meteo Marine API (SST)',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note: 'Sea surface temperature (SST) drives coral bleaching. Bleaching risk: SST > 30°C = warning, SST > 31°C = critical.',
  }
}

function normalizeReef(lat: number, lng: number, name: string, data: MarineResponse): MonitorLocation {
  const c = data.current || {}
  const sst = c.sea_surface_temperature ?? null
  const waveHeight = c.wave_height ?? null

  // Coral bleaching thresholds (simplified)
  let status: 'stable' | 'moderate' | 'warning' | 'critical' = 'stable'
  if (sst != null) {
    if (sst >= 31) status = 'critical'
    else if (sst >= 30) status = 'warning'
    else if (sst >= 28) status = 'moderate'
  }

  return {
    id: `reef-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    name,
    lat,
    lng,
    status,
    value: sst ?? undefined,
    unit: '°C',
    lastUpdated: c.time || new Date().toISOString(),
    description: `${name}: SST ${sst?.toFixed(1)}°C — ${
      status === 'critical' ? 'BLEACHING RISK (severe)'
      : status === 'warning' ? 'bleaching likely'
      : status === 'moderate' ? 'thermal stress possible'
      : 'within safe range'
    }`,
    metrics: {
      sst: sst ?? NaN,
      wave_height: waveHeight ?? NaN,
      wave_direction: c.wave_direction ?? NaN,
    },
  }
}
