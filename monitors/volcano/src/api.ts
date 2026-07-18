/**
 * Volcano Monitor — API client
 * Fetches real-time volcano alerts from USGS Volcano Hazards Program.
 * @see https://volcanoes.usgs.gov/vsc/api/
 */

import { fetchJson, type MonitorLocation, type MonitorDataResponse } from '@envirodash/core'

const USGS_API = 'https://volcanoes.usgs.gov/vsc/api/v1/getVolcanoAlerts.json'

interface UsgsVolcanoFeature {
  properties?: {
    volid?: number
    vnum?: string
    volcname?: string
    volccountry?: string
    alert?: string // NORMAL | ADVISORY | WATCH | WARNING
    color?: string // GREEN | YELLOW | ORANGE | RED
    summary?: string
    pubdate?: number
  }
  geometry?: {
    coordinates?: [number, number] // [lng, lat]
  }
}

interface UsgsVolcanoResponse {
  features?: UsgsVolcanoFeature[]
}

export async function fetchVolcanoes(): Promise<MonitorDataResponse> {
  const data = await fetchJson<UsgsVolcanoResponse>(USGS_API, {
    headers: { 'User-Agent': 'EnviroDash/1.0' },
    cache: 'no-store',
    timeoutMs: 20000,
  })

  const results: MonitorLocation[] = (data.features || []).map((f) => {
    const p = f.properties || {}
    const coords = f.geometry?.coordinates || [0, 0]
    const alert = (p.alert || 'NORMAL').toUpperCase()
    const status =
      alert === 'WARNING'
        ? 'critical'
        : alert === 'WATCH'
          ? 'warning'
          : alert === 'ADVISORY'
            ? 'moderate'
            : 'stable'
    return {
      id: `volcano-${p.volid || p.vnum || p.volcname}`,
      name: p.volcname || 'Unknown Volcano',
      lat: coords[1],
      lng: coords[0],
      status,
      value: alert === 'WARNING' ? 4 : alert === 'WATCH' ? 3 : alert === 'ADVISORY' ? 2 : 1,
      unit: 'alert level',
      lastUpdated: p.pubdate ? new Date(p.pubdate).toISOString() : undefined,
      description: p.summary || `${p.volcname} (${p.volccountry || 'Unknown country'}) — alert level: ${alert}`,
      metrics: {
        alert,
        color: p.color || 'GREEN',
        country: p.volccountry || 'Unknown',
      },
    }
  })

  return {
    source: 'USGS Volcano Hazards Program',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
  }
}
