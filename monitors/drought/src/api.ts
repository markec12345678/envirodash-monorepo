/**
 * Drought Monitor — API client
 * Calculates a simplified drought severity score (0-100) based on:
 *   - Soil moisture (low = drought)
 *   - Temperature (high = drought)
 *   - Recent precipitation (low = drought)
 *   - Humidity (low = drought)
 *
 * Uses Open-Meteo Forecast API (free, no API key required).
 *
 * This is a calculated proxy. For official drought classifications refer to:
 *   - US: US Drought Monitor (https://droughtmonitor.unl.edu/)
 *   - Europe: European Drought Observatory (https://edo.jrc.ec.europa.eu/)
 *
 * @see https://open-meteo.com/en/docs
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse, type CityRef } from '@envirodash/core'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'

/** Major agricultural regions and cities. */
const DROUGHT_PRONE: CityRef[] = [
  { name: 'Ljubljana (SI)', lat: 46.0569, lng: 14.5058 },
  { name: 'Maribor (SI)', lat: 46.5547, lng: 15.6459 },
  { name: 'Murska Sobota (SI)', lat: 46.6664, lng: 16.1622 },
  { name: 'Madrid (ES)', lat: 40.4168, lng: -3.7038 },
  { name: 'Athens (GR)', lat: 37.9838, lng: 23.7275 },
  { name: 'Rome (IT)', lat: 41.9028, lng: 12.4964 },
  { name: 'Palermo (IT)', lat: 38.1157, lng: 13.3615 },
  { name: 'Lisbon (PT)', lat: 38.7223, lng: -9.1393 },
  { name: 'Phoenix (US)', lat: 33.4484, lng: -112.0740 },
  { name: 'Las Vegas (US)', lat: 36.1699, lng: -115.1398 },
  { name: 'Los Angeles (US)', lat: 34.0522, lng: -118.2437 },
  { name: 'Sydney (AU)', lat: -33.8688, lng: 151.2093 },
  { name: 'Cairo (EG)', lat: 30.0444, lng: 31.2357 },
  { name: 'Dubai (AE)', lat: 25.2048, lng: 55.2708 },
]

interface OpenMeteoResponse {
  current?: {
    time?: string
    temperature_2m?: number
    relative_humidity_2m?: number
    precipitation?: number
    soil_moisture_0_1cm?: number
    soil_moisture_1_3cm?: number
    soil_moisture_3_9cm?: number
    soil_moisture_9_27cm?: number
  }
  daily?: {
    time?: string[]
    precipitation_sum?: number[]
  }
}

export interface DroughtQuery {
  region?: 'europe' | 'us' | 'middle-east' | 'australia' | 'slovenia' | 'all'
  lat?: number
  lng?: number
  name?: string
  limit?: number
}

export async function fetchDroughts(query: DroughtQuery = {}): Promise<MonitorDataResponse> {
  const { region = 'europe', lat, lng, name, limit = 12 } = query

  if (lat != null && lng != null) {
    const url = `${FORECAST_API}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,soil_moisture_9_27cm&daily=precipitation_sum&timezone=auto`
    const data = await fetchJson<OpenMeteoResponse>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })
    return {
      source: 'Open-Meteo Forecast API (drought proxy)',
      count: 1,
      results: [normalizeDrought(lat, lng, name || 'Custom location', data)],
      fetchedAt: new Date().toISOString(),
    }
  }

  let locations = DROUGHT_PRONE
  if (region === 'slovenia') locations = DROUGHT_PRONE.filter((d) => d.name.includes('(SI)'))
  else if (region === 'us') locations = DROUGHT_PRONE.filter((d) => d.name.includes('(US)'))
  else if (region === 'middle-east') locations = DROUGHT_PRONE.filter((d) => d.name.includes('Cairo') || d.name.includes('Dubai'))
  else if (region === 'australia') locations = DROUGHT_PRONE.filter((d) => d.name.includes('(AU)'))
  else if (region === 'europe') locations = DROUGHT_PRONE.filter((d) => !d.name.includes('(US)') && !d.name.includes('(AU)') && !d.name.includes('Cairo') && !d.name.includes('Dubai'))
  locations = locations.slice(0, limit)

  const results: MonitorLocation[] = []
  for (const loc of locations) {
    try {
      const url = `${FORECAST_API}?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,relative_humidity_2m,precipitation,soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,soil_moisture_9_27cm&daily=precipitation_sum&timezone=auto`
      const data = await fetchJson<OpenMeteoResponse>(url, {
        headers: { 'User-Agent': 'EnviroDash/1.0' },
        cache: 'no-store',
      })
      results.push(normalizeDrought(loc.lat, loc.lng, loc.name, data))
    } catch (e: any) {
      console.error(`Drought fetch failed for ${loc.name}:`, e.message)
    }
  }

  return {
    source: 'Open-Meteo Forecast API (drought proxy)',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note: 'Drought score (0-100) calculated from soil moisture, temperature, humidity, and precipitation. Score > 50 = severe drought conditions.',
  }
}

function normalizeDrought(lat: number, lng: number, name: string, data: OpenMeteoResponse): MonitorLocation {
  const c = data.current || {}
  const temp = c.temperature_2m ?? null
  const humidity = c.relative_humidity_2m ?? null
  const precip = c.precipitation ?? null
  const dailyPrecip = data.daily?.precipitation_sum?.[0] ?? null
  const soilTop = c.soil_moisture_0_1cm ?? null
  const soilDeep = c.soil_moisture_9_27cm ?? null

  // Drought score (0-100):
  // - Soil moisture 0-1cm (m³/m³): typical 0.05-0.40, lower = drought. 0-30 points.
  // - Soil moisture 9-27cm: typical 0.10-0.40, lower = drought. 0-25 points.
  // - Temperature above 20°C: +1 point per degree. 0-20 points.
  // - Humidity below 50%: +1 point per % below. 0-15 points.
  // - No precipitation in 24h: +10 points.
  let score = 0
  if (soilTop != null) {
    // 0.40 = saturated (0 pts), 0.05 = bone dry (30 pts)
    score += Math.max(0, Math.min(30, (0.40 - soilTop) * 85))
  }
  if (soilDeep != null) {
    score += Math.max(0, Math.min(25, (0.40 - soilDeep) * 71))
  }
  if (temp != null && temp > 20) {
    score += Math.min(20, (temp - 20) * 1.5)
  }
  if (humidity != null && humidity < 50) {
    score += Math.min(15, (50 - humidity) * 0.5)
  }
  if (dailyPrecip != null && dailyPrecip < 1) {
    score += 10
  }
  score = Math.max(0, Math.min(100, Math.round(score)))

  // D0-D4 classification (US Drought Monitor equivalent)
  let status: 'stable' | 'moderate' | 'warning' | 'critical' = 'stable'
  let droughtClass = 'D0 (Abnormally Dry)'
  if (score >= 80) { status = 'critical'; droughtClass = 'D4 (Exceptional Drought)' }
  else if (score >= 65) { status = 'critical'; droughtClass = 'D3 (Extreme Drought)' }
  else if (score >= 50) { status = 'warning'; droughtClass = 'D2 (Severe Drought)' }
  else if (score >= 35) { status = 'warning'; droughtClass = 'D1 (Moderate Drought)' }
  else if (score >= 20) { status = 'moderate'; droughtClass = 'D0 (Abnormally Dry)' }
  else { status = 'stable'; droughtClass = 'No drought' }

  return {
    id: `drought-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    name,
    lat,
    lng,
    status,
    value: score,
    unit: '/ 100',
    lastUpdated: c.time || new Date().toISOString(),
    description: `${name}: ${droughtClass} — score ${score}/100`,
    metrics: {
      drought_score: score,
      temperature: temp ?? NaN,
      humidity: humidity ?? NaN,
      precipitation_24h: dailyPrecip ?? NaN,
      soil_moisture_top: soilTop ?? NaN,
      soil_moisture_deep: soilDeep ?? NaN,
    },
  }
}
