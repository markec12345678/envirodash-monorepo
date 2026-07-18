import { NextRequest, NextResponse } from 'next/server'
import { fetchJson } from '@envirodash/core'

/**
 * Historical weather data endpoint.
 * Returns hourly temperature, humidity, wind, precipitation for past N hours/days.
 *
 * GET /api/weather/history?lat=46.05&lng=14.50&hours=24
 * GET /api/weather/history?lat=46.05&lng=14.50&days=7
 *
 * Uses Open-Meteo Forecast API (Historical Forecast endpoint).
 *
 * @see https://open-meteo.com/en/docs/historical-weather-api
 */

const HISTORICAL_API = 'https://archive-api.open-meteo.com/v1/archive'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const hours = parseInt(searchParams.get('hours') || '24')
  const days = parseInt(searchParams.get('days') || '0')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const endDate = new Date()
  const startDate = new Date()
  if (days > 0) {
    startDate.setDate(startDate.getDate() - days)
  } else {
    startDate.setHours(startDate.getHours() - hours)
  }

  const startDateStr = startDate.toISOString().slice(0, 10)
  const endDateStr = endDate.toISOString().slice(0, 10)

  const url = `${HISTORICAL_API}?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto&start_date=${startDateStr}&end_date=${endDateStr}`

  try {
    const data = await fetchJson<any>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })

    const hourly = data.hourly || {}
    const times: string[] = hourly.time || []
    const temps: (number | null)[] = hourly.temperature_2m || []
    const humidity: (number | null)[] = hourly.relative_humidity_2m || []
    const precip: (number | null)[] = hourly.precipitation || []
    const wind: (number | null)[] = hourly.wind_speed_10m || []

    const series = times.map((t, i) => ({
      time: t,
      temperature: temps[i],
      humidity: humidity[i],
      precipitation: precip[i],
      wind: wind[i],
    }))

    const validTemps = temps.filter((v) => v != null) as number[]
    const validHumidity = humidity.filter((v) => v != null) as number[]
    const validPrecip = precip.filter((v) => v != null) as number[]
    const stats = {
      avgTemp: validTemps.length ? +(validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1) : null,
      maxTemp: validTemps.length ? Math.max(...validTemps) : null,
      minTemp: validTemps.length ? Math.min(...validTemps) : null,
      avgHumidity: validHumidity.length ? Math.round(validHumidity.reduce((a, b) => a + b, 0) / validHumidity.length) : null,
      totalPrecip: validPrecip.length ? +(validPrecip.reduce((a, b) => a + b, 0)).toFixed(1) : null,
      samples: validTemps.length,
    }

    return NextResponse.json({
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      range: { start: startDateStr, end: endDateStr, hours: days > 0 ? days * 24 : hours },
      source: 'Open-Meteo Archive API',
      stats,
      series,
      fetchedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
