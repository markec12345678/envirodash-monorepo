/**
 * Wildfire Monitor — API client
 * Calculates a Fire Weather Index (0-100) from Open-Meteo Forecast API.
 *
 * NOTE: This is a calculated proxy, not a satellite-based active-fire detection.
 * For active fires, register a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/
 */

import { fetchJson, fwiToStatus, type MonitorLocation, type MonitorDataResponse, type CityRef } from '@envirodash/core'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'

const CITIES: Record<string, CityRef[]> = {
  slovenia: [
    { name: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
    { name: 'Maribor', lat: 46.5547, lng: 15.6459 },
    { name: 'Koper', lat: 45.5481, lng: 13.7300 },
    { name: 'Novo Mesto', lat: 45.8039, lng: 15.1687 },
  ],
  europe: [
    { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
    { name: 'Athens', lat: 37.9838, lng: 23.7275 },
    { name: 'Rome', lat: 41.9028, lng: 12.4964 },
    { name: 'Lisbon', lat: 38.7223, lng: -9.1393 },
    { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
    { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
    { name: 'Palermo', lat: 38.1157, lng: 13.3615 },
    { name: 'Valencia', lat: 39.4699, lng: -0.3763 },
  ],
  california: [
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
    { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
    { name: 'Sacramento', lat: 38.5816, lng: -121.4944 },
    { name: 'Fresno', lat: 36.7378, lng: -119.7871 },
  ],
  australia: [
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth', lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
  ],
}

export interface WildfireQuery {
  lat?: number
  lng?: number
  area?: string // 'europe' | 'california' | 'australia' | 'slovenia'
  country?: string
}

interface OpenMeteoForecastResponse {
  current?: {
    time?: string
    temperature_2m?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    precipitation?: number
    weather_code?: number
  }
}

export async function fetchWildfire(query: WildfireQuery): Promise<MonitorDataResponse> {
  const { lat, lng, area = 'europe', country } = query

  if (lat != null && lng != null) {
    const url = `${FORECAST_API}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&timezone=auto`
    const data = await fetchJson<OpenMeteoForecastResponse>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })
    return {
      source: 'Open-Meteo Forecast API (calculated FWI proxy)',
      count: 1,
      results: [normalizePoint(lat, lng, 'Custom location', data)],
      fetchedAt: new Date().toISOString(),
    }
  }

  const cities = (country && CITIES[country]) || CITIES[area] || CITIES.europe
  const results: MonitorLocation[] = []
  for (const city of cities) {
    try {
      const url = `${FORECAST_API}?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&timezone=auto`
      const data = await fetchJson<OpenMeteoForecastResponse>(url, {
        headers: { 'User-Agent': 'EnviroDash/1.0' },
        cache: 'no-store',
      })
      results.push(normalizePoint(city.lat, city.lng, city.name, data))
    } catch (err) {
      console.error(`FW fetch failed for ${city.name}:`, err)
    }
  }

  return {
    source: 'Open-Meteo Forecast API (calculated FWI proxy)',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note: 'FWI is calculated from weather conditions. Values > 50 indicate very high fire danger.',
  }
}

function normalizePoint(lat: number, lng: number, name: string, data: OpenMeteoForecastResponse): MonitorLocation {
  const c = data.current || {}
  const temp = c.temperature_2m ?? null
  const humidity = c.relative_humidity_2m ?? null
  const wind = c.wind_speed_10m ?? null
  const precip = c.precipitation ?? null

  let fireRisk = 0
  if (temp != null) fireRisk += Math.max(0, Math.min(30, (temp - 5) * 0.6))
  if (humidity != null) fireRisk += Math.max(0, Math.min(30, (60 - humidity) * 0.7))
  if (wind != null) fireRisk += Math.max(0, Math.min(25, wind * 0.5))
  if (precip != null) fireRisk -= Math.min(20, precip * 10)
  fireRisk = Math.max(0, Math.min(100, Math.round(fireRisk)))

  const status = fwiToStatus(fireRisk)
  return {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    name,
    lat,
    lng,
    status,
    value: fireRisk,
    unit: '/ 100',
    lastUpdated: c.time || new Date().toISOString(),
    description: `Fire Weather Index ${fireRisk}/100 — ${statusLabel(status)}`,
    metrics: {
      temperature: temp ?? NaN,
      humidity: humidity ?? NaN,
      wind: wind ?? NaN,
      precipitation: precip ?? NaN,
      fwi: fireRisk,
    },
  }
}

function statusLabel(status: 'stable' | 'moderate' | 'warning' | 'critical'): string {
  return {
    stable: 'Low fire risk',
    moderate: 'Moderate fire risk',
    warning: 'High fire risk',
    critical: 'Extreme fire risk',
  }[status]
}
