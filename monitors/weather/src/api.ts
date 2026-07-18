/**
 * Weather Monitor — API client
 * Fetches current weather and 7-day forecast from Open-Meteo.
 * @see https://open-meteo.com/en/docs
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse } from '@envirodash/core'

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast'

export interface WeatherQuery {
  lat: number
  lng: number
  name?: string
}

interface OpenMeteoResponse {
  current?: {
    time?: string
    temperature_2m?: number
    relative_humidity_2m?: number
    apparent_temperature?: number
    precipitation?: number
    weather_code?: number
    wind_speed_10m?: number
    wind_direction_10m?: number
  }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    weather_code?: number[]
    precipitation_sum?: number[]
    wind_speed_10m_max?: number[]
  }
}

export async function fetchWeather(query: WeatherQuery): Promise<MonitorDataResponse> {
  const { lat, lng, name = 'Custom location' } = query
  const url = `${FORECAST_API}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`
  const data = await fetchJson<OpenMeteoResponse>(url, {
    headers: { 'User-Agent': 'EnviroDash/1.0' },
    cache: 'no-store',
  })

  const c = data.current || {}
  const temp = c.temperature_2m ?? null
  const status =
    temp == null ? 'stable' : temp >= 35 || temp <= -10 ? 'critical' : temp >= 30 || temp <= 0 ? 'warning' : temp >= 25 || temp <= 5 ? 'moderate' : 'stable'

  const result: MonitorLocation = {
    id: `weather-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    name,
    lat,
    lng,
    status,
    value: temp ?? undefined,
    unit: '°C',
    lastUpdated: c.time || new Date().toISOString(),
    description: `Temperature: ${temp?.toFixed(1)}°C (feels like ${c.apparent_temperature?.toFixed(1)}°C)`,
    metrics: {
      temperature: temp ?? NaN,
      humidity: c.relative_humidity_2m ?? NaN,
      wind: c.wind_speed_10m ?? NaN,
      precipitation: c.precipitation ?? NaN,
      wind_direction: c.wind_direction_10m ?? NaN,
      weather_code: c.weather_code ?? NaN,
    },
  }

  return {
    source: 'Open-Meteo Forecast API',
    count: 1,
    results: [result],
    fetchedAt: new Date().toISOString(),
  }
}
