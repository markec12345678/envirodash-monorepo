/**
 * Air Quality Monitor — API client
 * Fetches real-time air quality data from the Open-Meteo Air Quality API.
 *
 * @see https://open-meteo.com/en/docs/air-quality-api
 */

import { fetchJson, aqiToStatus, type MonitorLocation, type MonitorDataResponse } from '@envirodash/core'

const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1/air-quality'

/** Curated list of cities per country (used when ?country= is provided). */
const CITIES: Record<string, Array<{ name: string; lat: number; lng: number }>> = {
  SI: [
    { name: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
    { name: 'Maribor', lat: 46.5547, lng: 15.6459 },
    { name: 'Celje', lat: 46.2389, lng: 15.2675 },
    { name: 'Kranj', lat: 46.2389, lng: 14.3556 },
    { name: 'Koper', lat: 45.5481, lng: 13.7300 },
    { name: 'Novo Mesto', lat: 45.8039, lng: 15.1687 },
    { name: 'Velenje', lat: 46.3656, lng: 15.1164 },
    { name: 'Murska Sobota', lat: 46.6664, lng: 16.1622 },
  ],
  DE: [
    { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { name: 'Munich', lat: 48.1351, lng: 11.5820 },
    { name: 'Hamburg', lat: 53.5511, lng: 9.9937 },
    { name: 'Cologne', lat: 50.9375, lng: 6.9603 },
    { name: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
  ],
  IT: [
    { name: 'Rome', lat: 41.9028, lng: 12.4964 },
    { name: 'Milan', lat: 45.4642, lng: 9.1900 },
    { name: 'Naples', lat: 40.8518, lng: 14.2681 },
    { name: 'Turin', lat: 45.0703, lng: 7.6869 },
    { name: 'Florence', lat: 43.7696, lng: 11.2558 },
  ],
  FR: [
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
    { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
    { name: 'Toulouse', lat: 43.6047, lng: 1.4442 },
    { name: 'Nice', lat: 43.7102, lng: 7.2620 },
  ],
  GB: [
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
    { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
    { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
    { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  ],
  US: [
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
    { name: 'Houston', lat: 29.7604, lng: -95.3698 },
    { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
  ],
}

export interface AirQualityQuery {
  lat?: number
  lng?: number
  country?: string // ISO 3166-1 alpha-2 (SI, DE, IT, ...)
  limit?: number
}

interface OpenMeteoAirQualityResponse {
  current?: {
    time?: string
    pm10?: number
    pm2_5?: number
    carbon_monoxide?: number
    nitrogen_dioxide?: number
    sulphur_dioxide?: number
    ozone?: number
    us_aqi?: number
  }
}

/**
 * Fetch real-time air quality data for a single point or for multiple cities in a country.
 *
 * @example
 * // Single point
 * const data = await fetchAirQuality({ lat: 46.0569, lng: 14.5058 })
 *
 * @example
 * // All Slovenian cities
 * const data = await fetchAirQuality({ country: 'SI' })
 */
export async function fetchAirQuality(
  query: AirQualityQuery
): Promise<MonitorDataResponse> {
  const { lat, lng, country, limit = 10 } = query

  // Single-point query
  if (lat != null && lng != null) {
    const url = `${AIR_QUALITY_API}?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto`
    const data = await fetchJson<OpenMeteoAirQualityResponse>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })
    return {
      source: 'Open-Meteo Air Quality API (CAMS based)',
      count: 1,
      results: [normalizePoint(lat, lng, 'Custom location', data)],
      fetchedAt: new Date().toISOString(),
    }
  }

  // Country query — fetch each city sequentially (Open-Meteo free tier rate-limits concurrent requests)
  if (country) {
    const cities = (CITIES[country.toUpperCase()] || []).slice(0, limit)
    if (cities.length === 0) {
      throw new Error(
        `Country '${country}' not in curated city list. Available: ${Object.keys(CITIES).join(', ')}`
      )
    }

    const results: MonitorLocation[] = []
    for (const city of cities) {
      try {
        const url = `${AIR_QUALITY_API}?latitude=${city.lat}&longitude=${city.lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto`
        const data = await fetchJson<OpenMeteoAirQualityResponse>(url, {
          headers: { 'User-Agent': 'EnviroDash/1.0' },
          cache: 'no-store',
        })
        results.push(normalizePoint(city.lat, city.lng, city.name, data))
      } catch (err) {
        console.error(`AQ fetch failed for ${city.name}:`, err)
      }
    }

    return {
      source: 'Open-Meteo Air Quality API (CAMS based)',
      count: results.length,
      results,
      fetchedAt: new Date().toISOString(),
    }
  }

  throw new Error('Either lat/lng or country must be provided')
}

function normalizePoint(
  lat: number,
  lng: number,
  name: string,
  data: OpenMeteoAirQualityResponse
): MonitorLocation {
  const c = data.current || {}
  const aqi = c.us_aqi ?? null
  const status = aqiToStatus(aqi)
  return {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    name,
    lat,
    lng,
    status,
    value: aqi ?? undefined,
    unit: 'US AQI',
    lastUpdated: c.time || new Date().toISOString(),
    description: aqi != null ? `US AQI ${aqi} — ${statusLabel(status)}` : 'No AQI data available',
    metrics: {
      pm25: c.pm2_5 ?? NaN,
      pm10: c.pm10 ?? NaN,
      co: c.carbon_monoxide ?? NaN,
      no2: c.nitrogen_dioxide ?? NaN,
      so2: c.sulphur_dioxide ?? NaN,
      o3: c.ozone ?? NaN,
      us_aqi: aqi ?? NaN,
    },
  }
}

function statusLabel(status: 'stable' | 'moderate' | 'warning' | 'critical'): string {
  return {
    stable: 'Good air quality',
    moderate: 'Acceptable for most',
    warning: 'Unhealthy for sensitive groups',
    critical: 'Unhealthy for everyone',
  }[status]
}
