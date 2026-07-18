/**
 * Glacier Monitor — API client
 * Fetches real-time snowfall, temperature, and precipitation data for major world glaciers
 * using the Open-Meteo Forecast API.
 *
 * While not a substitute for GLIMS satellite-based glacier extent data, this provides
 * real-time weather conditions at glacier locations that drive mass balance changes:
 *   - Snowfall (accumulation)
 *   - Temperature (ablation)
 *   - Precipitation
 *
 * @see https://open-meteo.com/en/docs
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse, type CityRef } from '@envirodash/core'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'

/** Major world glaciers with their coordinates. */
const GLACIERS: CityRef[] = [
  { name: 'Triglav Glacier (SLO)', lat: 46.378, lng: 13.836 },
  { name: 'Alps — Mont Blanc', lat: 45.832, lng: 6.864 },
  { name: 'Alps — Aletsch (CH)', lat: 46.435, lng: 8.005 },
  { name: 'Himalaya — Khumbu', lat: 27.966, lng: 86.860 },
  { name: 'Himalaya — Gangotri', lat: 30.933, lng: 79.033 },
  { name: 'Andes — Perito Moreno (AR)', lat: -50.498, lng: -73.137 },
  { name: 'Andes — Quelccaya (PE)', lat: -13.783, lng: -70.833 },
  { name: 'Alaska — Hubbard', lat: 60.050, lng: -137.250 },
  { name: 'Alaska — Mendenhall', lat: 58.433, lng: -134.500 },
  { name: 'Greenland — Jakobshavn', lat: 69.166, lng: -49.833 },
  { name: 'Iceland — Vatnajökull', lat: 64.416, lng: -16.766 },
  { name: 'Patagonia — Pío XI', lat: -49.333, lng: -74.0 },
]

interface OpenMeteoResponse {
  current?: {
    time?: string
    temperature_2m?: number
    precipitation?: number
    snowfall?: number
    rain?: number
    weather_code?: number
    snow_depth?: number
  }
  daily?: {
    time?: string[]
    snowfall_sum?: number[]
    precipitation_sum?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
}

export interface GlacierQuery {
  /** Filter by region: 'alps' | 'himalaya' | 'andes' | 'arctic' | 'antarctic' | 'all' */
  region?: string
  /** Single-point query */
  lat?: number
  lng?: number
  /** Custom glacier name for single-point query */
  name?: string
  /** Max number of glaciers to fetch (default: 12) */
  limit?: number
}

export async function fetchGlaciers(query: GlacierQuery = {}): Promise<MonitorDataResponse> {
  const { region = 'all', lat, lng, name, limit = 12 } = query

  if (lat != null && lng != null) {
    const url = `${FORECAST_API}?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,snowfall,rain,snow_depth,weather_code&daily=snowfall_sum,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`
    const data = await fetchJson<OpenMeteoResponse>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })
    return {
      source: 'Open-Meteo Forecast API (glacier weather)',
      count: 1,
      results: [normalizeGlacier(lat, lng, name || 'Custom location', data)],
      fetchedAt: new Date().toISOString(),
    }
  }

  // Filter glaciers by region
  let glaciers = GLACIERS
  if (region === 'alps') {
    glaciers = GLACIERS.filter((g) => g.name.includes('Alps') || g.name.includes('Triglav') || g.name.includes('Iceland'))
  } else if (region === 'himalaya') {
    glaciers = GLACIERS.filter((g) => g.name.includes('Himalaya'))
  } else if (region === 'andes') {
    glaciers = GLACIERS.filter((g) => g.name.includes('Andes') || g.name.includes('Patagonia'))
  } else if (region === 'arctic') {
    glaciers = GLACIERS.filter((g) => g.name.includes('Alaska') || g.name.includes('Greenland') || g.name.includes('Iceland'))
  }
  glaciers = glaciers.slice(0, limit)

  const results: MonitorLocation[] = []
  for (const g of glaciers) {
    try {
      const url = `${FORECAST_API}?latitude=${g.lat}&longitude=${g.lng}&current=temperature_2m,precipitation,snowfall,rain,snow_depth,weather_code&daily=snowfall_sum,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`
      const data = await fetchJson<OpenMeteoResponse>(url, {
        headers: { 'User-Agent': 'EnviroDash/1.0' },
        cache: 'no-store',
      })
      results.push(normalizeGlacier(g.lat, g.lng, g.name, data))
    } catch (e: any) {
      console.error(`Glacier fetch failed for ${g.name}:`, e.message)
    }
  }

  return {
    source: 'Open-Meteo Forecast API (glacier weather)',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note: 'Real-time weather at glacier locations. Snowfall indicates accumulation; positive temperature indicates ablation.',
  }
}

function normalizeGlacier(lat: number, lng: number, name: string, data: OpenMeteoResponse): MonitorLocation {
  const c = data.current || {}
  const temp = c.temperature_2m ?? null
  const snowfall = c.snowfall ?? null
  const precip = c.precipitation ?? null
  const snowDepth = c.snow_depth ?? null

  // Daily snowfall sum (last 24h)
  const dailySnow = data.daily?.snowfall_sum?.[0] ?? null
  const dailyPrecip = data.daily?.precipitation_sum?.[0] ?? null

  // Glacier "health" status: stable if temp < 0 and snowfall > 0, critical if temp > 5
  let status: 'stable' | 'moderate' | 'warning' | 'critical' = 'stable'
  if (temp != null) {
    if (temp > 5) status = 'critical'
    else if (temp > 0) status = 'warning'
    else if (temp > -5) status = 'moderate'
  }

  return {
    id: `glacier-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    name,
    lat,
    lng,
    status,
    value: temp ?? undefined,
    unit: '°C',
    lastUpdated: c.time || new Date().toISOString(),
    description: `${name}: ${temp?.toFixed(1)}°C, ${snowfall?.toFixed(1) || 0} mm snowfall/h, ${dailySnow?.toFixed(1) || 0} mm snowfall/day`,
    metrics: {
      temperature: temp ?? NaN,
      snowfall_hourly: snowfall ?? NaN,
      snowfall_daily: dailySnow ?? NaN,
      precipitation: precip ?? NaN,
      precipitation_daily: dailyPrecip ?? NaN,
      snow_depth: snowDepth ?? NaN,
    },
  }
}
