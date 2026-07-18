import { NextRequest, NextResponse } from 'next/server'
import { fetchJson } from '@envirodash/core'

/**
 * Data export endpoint — download environmental data as CSV or JSON.
 *
 * GET /api/export?format=csv&type=air-quality&country=SI
 * GET /api/export?format=json&type=earthquake&limit=50
 * GET /api/export?format=csv&type=history&lat=46.05&lng=14.50&days=7
 *
 * Supported types:
 *   - air-quality (current, by country or point)
 *   - wildfire (current, by area)
 *   - earthquake (last 24h, M2.5+)
 *   - tsunami (active warnings)
 *   - volcano (USGS alerts)
 *   - history (historical air quality time series)
 */

const baseUrl = `http://localhost:${process.env.PORT || 3000}`

function escapeCsv(value: any): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(rows: any[], columns: string[]): string {
  const header = columns.join(',')
  const dataRows = rows.map((r) => columns.map((c) => escapeCsv(r[c])).join(','))
  return [header, ...dataRows].join('\n')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') || 'json').toLowerCase()
  const type = searchParams.get('type') || 'air-quality'
  const country = searchParams.get('country') || 'SI'
  const area = searchParams.get('area') || 'europe'
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const days = parseInt(searchParams.get('days') || '7')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!['csv', 'json'].includes(format)) {
    return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 })
  }

  let data: any = null
  let rows: any[] = []
  let columns: string[] = []
  let filename = ''

  try {
    switch (type) {
      case 'air-quality': {
        const url = lat && lng
          ? `${baseUrl}/api/air-quality?lat=${lat}&lng=${lng}`
          : `${baseUrl}/api/air-quality?country=${country}&limit=${limit}`
        data = await fetchJson<any>(url)
        rows = (data.results || []).map((r: any) => ({
          location: r.name,
          lat: r.lat,
          lng: r.lng,
          status: r.status,
          us_aqi: r.value,
          pm25: r.metrics?.pm25,
          pm10: r.metrics?.pm10,
          no2: r.metrics?.no2,
          so2: r.metrics?.so2,
          o3: r.metrics?.o3,
          co: r.metrics?.co,
          last_updated: r.lastUpdated,
        }))
        columns = ['location', 'lat', 'lng', 'status', 'us_aqi', 'pm25', 'pm10', 'no2', 'so2', 'o3', 'co', 'last_updated']
        filename = `air-quality-${country}-${new Date().toISOString().slice(0, 10)}`
        break
      }

      case 'wildfire': {
        data = await fetchJson<any>(`${baseUrl}/api/wildfire?area=${area}&limit=${limit}`)
        rows = (data.results || []).map((r: any) => ({
          location: r.name,
          lat: r.lat,
          lng: r.lng,
          status: r.status,
          fwi: r.value,
          temperature: r.metrics?.temperature,
          humidity: r.metrics?.humidity,
          wind: r.metrics?.wind,
          precipitation: r.metrics?.precipitation,
          last_updated: r.lastUpdated,
        }))
        columns = ['location', 'lat', 'lng', 'status', 'fwi', 'temperature', 'humidity', 'wind', 'precipitation', 'last_updated']
        filename = `wildfire-${area}-${new Date().toISOString().slice(0, 10)}`
        break
      }

      case 'earthquake': {
        data = await fetchJson<any>(`${baseUrl}/api/earthquake?limit=${limit}`)
        rows = (data.results || []).map((r: any) => ({
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          magnitude: r.value,
          status: r.status,
          depth: r.metrics?.depth,
          tsunami: r.metrics?.tsunami ? 'YES' : 'NO',
          last_updated: r.lastUpdated,
        }))
        columns = ['name', 'lat', 'lng', 'magnitude', 'status', 'depth', 'tsunami', 'last_updated']
        filename = `earthquakes-${new Date().toISOString().slice(0, 10)}`
        break
      }

      case 'tsunami': {
        data = await fetchJson<any>(`${baseUrl}/api/tsunami`)
        rows = (data.results || []).map((r: any) => ({
          title: r.title,
          msg_type: r.msg_type,
          region: r.region,
          severity: r.severity,
          pub_date: r.pub_date,
          link: r.link,
        }))
        columns = ['title', 'msg_type', 'region', 'severity', 'pub_date', 'link']
        filename = `tsunami-${new Date().toISOString().slice(0, 10)}`
        break
      }

      case 'volcano': {
        data = await fetchJson<any>(`${baseUrl}/api/volcano`)
        rows = (data.results || []).map((r: any) => ({
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          status: r.status,
          alert: r.metrics?.alert,
          color: r.metrics?.color,
          country: r.metrics?.country,
          last_updated: r.lastUpdated,
        }))
        columns = ['name', 'lat', 'lng', 'status', 'alert', 'color', 'country', 'last_updated']
        filename = `volcanoes-${new Date().toISOString().slice(0, 10)}`
        break
      }

      case 'history': {
        if (!lat || !lng) {
          return NextResponse.json({ error: 'lat and lng required for history export' }, { status: 400 })
        }
        data = await fetchJson<any>(`${baseUrl}/api/air-quality/history?lat=${lat}&lng=${lng}&days=${days}`)
        rows = (data.series || []).map((s: any) => ({
          time: s.time,
          pm25: s.pm25,
          pm10: s.pm10,
          aqi: s.aqi,
          no2: s.no2,
          o3: s.o3,
        }))
        columns = ['time', 'pm25', 'pm10', 'aqi', 'no2', 'o3']
        filename = `air-quality-history-${lat}-${lng}-${days}d-${new Date().toISOString().slice(0, 10)}`
        break
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify({
        type,
        source: data?.source,
        count: rows.length,
        exportedAt: new Date().toISOString(),
        data: rows,
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }

    // CSV
    const csv = toCsv(rows, columns)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
