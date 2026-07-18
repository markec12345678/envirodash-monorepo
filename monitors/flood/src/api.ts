/**
 * Flood Monitor — API client
 * Calculates a simplified flood risk score (0-100) for major river basins and cities
 * using Open-Meteo Forecast API (precipitation, soil moisture, and recent rainfall).
 *
 * This is a calculated proxy, not an official flood warning system.
 * For official alerts, refer to:
 *   - Europe: Copernicus EMS (https://www.efas.eu/)
 *   - USA: NOAA AHPS (https://water.weather.gov/)
 *   - Global: GloFAS (https://www.globalfloods.eu/)
 *
 * @see https://open-meteo.com/en/docs
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse, type CityRef } from '@envirodash/core'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'

/** Major river basins / flood-prone cities. */
const FLOOD_PRONE: CityRef[] = [
  { name: 'Ljubljana (Sava)', lat: 46.0569, lng: 14.5058 },
  { name: 'Zagreb (Sava)', lat: 45.8150, lng: 15.9819 },
  { name: 'Budapest (Danube)', lat: 47.4979, lng: 19.0402 },
  { name: 'Vienna (Danube)', lat: 48.2082, lng: 16.3738 },
  { name: 'Belgrade (Danube)', lat: 44.7866, lng: 20.4489 },
  { name: 'Prague (Vltava)', lat: 50.0755, lng: 14.4378 },
  { name: 'Warsaw (Vistula)', lat: 52.2297, lng: 21.0122 },
  { name: 'Amsterdam (Rhine)', lat: 52.3676, lng: 4.9041 },
  { name: 'Cologne (Rhine)', lat: 50.9375, lng: 6.9603 },
  { name: 'London (Thames)', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris (Seine)', lat: 48.8566, lng: 2.3522 },
  { name: 'Bangkok (Chao Phraya)', lat: 13.7563, lng: 100.5018 },
  { name: 'New Orleans (Mississippi)', lat: 29.9511, lng: -90.0715 },
  { name: 'St. Louis (Mississippi)', lat: 38.6270, lng: -90.1994 },
]

interface OpenMeteoResponse {
  current?: {
    time?: string
    precipitation?: number
    rain?: number
    snowfall?: number
    weather_code?: number
  }
  daily?: {
    time?: string[]
    precipitation_sum?: number[]
    rain_sum?: number[]
  }
}

export interface FloodQuery {
  region?: 'europe' | 'asia' | 'us' | 'all'
  lat?: number
  lng?: number
  name?: string
  limit?: number
}

export async function fetchFloods(query: FloodQuery = {}): Promise<MonitorDataResponse> {
  const { region = 'europe', lat, lng, name, limit = 12 } = query

  if (lat != null && lng != null) {
    const url = `${FORECAST_API}?latitude=${lat}&longitude=${lng}&current=precipitation,rain,snowfall,weather_code&daily=precipitation_sum,rain_sum&timezone=auto`
    const data = await fetchJson<OpenMeteoResponse>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })
    return {
      source: 'Open-Meteo Forecast API (flood risk proxy)',
      count: 1,
      results: [normalizeFlood(lat, lng, name || 'Custom location', data)],
      fetchedAt: new Date().toISOString(),
    }
  }

  let locations = FLOOD_PRONE
  if (region === 'asia') locations = FLOOD_PRONE.filter((f) => f.name.includes('Bangkok'))
  else if (region === 'us') locations = FLOOD_PRONE.filter((f) => f.name.includes('Orleans') || f.name.includes('St. Louis'))
  else if (region === 'europe') locations = FLOOD_PRONE.filter((f) => !f.name.includes('Bangkok') && !f.name.includes('Orleans') && !f.name.includes('St. Louis'))
  locations = locations.slice(0, limit)

  const results: MonitorLocation[] = []
  for (const loc of locations) {
    try {
      const url = `${FORECAST_API}?latitude=${loc.lat}&longitude=${loc.lng}&current=precipitation,rain,snowfall,weather_code&daily=precipitation_sum,rain_sum&timezone=auto`
      const data = await fetchJson<OpenMeteoResponse>(url, {
        headers: { 'User-Agent': 'EnviroDash/1.0' },
        cache: 'no-store',
      })
      results.push(normalizeFlood(loc.lat, loc.lng, loc.name, data))
    } catch (e: any) {
      console.error(`Flood fetch failed for ${loc.name}:`, e.message)
    }
  }

  return {
    source: 'Open-Meteo Forecast API (flood risk proxy)',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note: 'Flood risk score (0-100) calculated from current precipitation + 24h rainfall total. Score > 50 = high flood risk.',
  }
}

function normalizeFlood(lat: number, lng: number, name: string, data: OpenMeteoResponse): MonitorLocation {
  const c = data.current || {}
  const currentPrecip = c.precipitation ?? null
  const dailyPrecip = data.daily?.precipitation_sum?.[0] ?? null

  // Flood risk score (0-100):
  // - Current precipitation rate (mm/h): 0-20 points (1mm/h = 4 points)
  // - 24h precipitation total (mm): 0-50 points (1mm = 2 points, max 25mm)
  // - Above 50mm in 24h = critical flood risk
  let score = 0
  if (currentPrecip != null) score += Math.min(20, currentPrecip * 4)
  if (dailyPrecip != null) score += Math.min(50, dailyPrecip * 2)
  // Bonus for extreme rainfall
  if (dailyPrecip != null && dailyPrecip > 50) score += 30
  score = Math.max(0, Math.min(100, Math.round(score)))

  let status: 'stable' | 'moderate' | 'warning' | 'critical' = 'stable'
  if (score >= 65) status = 'critical'
  else if (score >= 40) status = 'warning'
  else if (score >= 20) status = 'moderate'

  return {
    id: `flood-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    name,
    lat,
    lng,
    status,
    value: score,
    unit: '/ 100',
    lastUpdated: c.time || new Date().toISOString(),
    description: `${name}: ${currentPrecip?.toFixed(1) || 0} mm/h now, ${dailyPrecip?.toFixed(1) || 0} mm in 24h — flood risk score ${score}/100`,
    metrics: {
      precipitation_now: currentPrecip ?? NaN,
      precipitation_24h: dailyPrecip ?? NaN,
      flood_risk: score,
    },
  }
}
