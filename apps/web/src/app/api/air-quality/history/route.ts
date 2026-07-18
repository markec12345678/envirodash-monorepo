import { NextRequest, NextResponse } from 'next/server'
import { fetchJson } from '@envirodash/core'

/**
 * Historical air quality data endpoint.
 * Returns hourly PM2.5, PM10, AQI for the past N hours (default 24h).
 *
 * GET /api/air-quality/history?lat=46.05&lng=14.50&hours=24
 * GET /api/air-quality/history?lat=46.05&lng=14.50&days=7
 *
 * Uses Open-Meteo Air Quality API which provides:
 *   - Past 6 months of historical data
 *   - Hourly resolution
 *   - PM2.5, PM10, US AQI, NO2, SO2, O3, CO
 *
 * @see https://open-meteo.com/en/docs/air-quality-api
 */

const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1/air-quality'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const hours = parseInt(searchParams.get('hours') || '24')
  const days = parseInt(searchParams.get('days') || '0')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  // Compute date range
  const endDate = new Date()
  const startDate = new Date()
  if (days > 0) {
    startDate.setDate(startDate.getDate() - days)
  } else {
    startDate.setHours(startDate.getHours() - hours)
  }

  const startDateStr = startDate.toISOString().slice(0, 10)
  const endDateStr = endDate.toISOString().slice(0, 10)

  const url = `${AIR_QUALITY_API}?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,us_aqi_pm2_5,us_aqi_pm10,us_aqi_ozone,us_aqi_nitrogen_dioxide,us_aqi_sulphur_dioxide,us_aqi_carbon_monoxide&timezone=auto&start_date=${startDateStr}&end_date=${endDateStr}`

  try {
    const data = await fetchJson<any>(url, {
      headers: { 'User-Agent': 'EnviroDash/1.0' },
      cache: 'no-store',
    })

    // Extract hourly data and limit to requested range
    const hourly = data.hourly || {}
    const times: string[] = hourly.time || []
    const pm25: (number | null)[] = hourly.pm2_5 || []
    const pm10: (number | null)[] = hourly.pm10 || []
    const aqi: (number | null)[] = hourly.us_aqi || []
    const no2: (number | null)[] = hourly.nitrogen_dioxide || []
    const o3: (number | null)[] = hourly.ozone || []

    // Build time series
    const series = times.map((t, i) => ({
      time: t,
      pm25: pm25[i],
      pm10: pm10[i],
      aqi: aqi[i],
      no2: no2[i],
      o3: o3[i],
    }))

    // Compute statistics
    const validAqi = aqi.filter((v) => v != null) as number[]
    const validPm25 = pm25.filter((v) => v != null) as number[]
    const stats = {
      avgAqi: validAqi.length ? Math.round(validAqi.reduce((a, b) => a + b, 0) / validAqi.length) : null,
      maxAqi: validAqi.length ? Math.max(...validAqi) : null,
      minAqi: validAqi.length ? Math.min(...validAqi) : null,
      avgPm25: validPm25.length ? +(validPm25.reduce((a, b) => a + b, 0) / validPm25.length).toFixed(1) : null,
      maxPm25: validPm25.length ? Math.max(...validPm25) : null,
      minPm25: validPm25.length ? Math.min(...validPm25) : null,
      samples: validAqi.length,
    }

    return NextResponse.json({
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      range: { start: startDateStr, end: endDateStr, hours: days > 0 ? days * 24 : hours },
      source: 'Open-Meteo Air Quality API (CAMS)',
      stats,
      series,
      fetchedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
