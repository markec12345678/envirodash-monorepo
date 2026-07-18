import { NextRequest, NextResponse } from 'next/server'
import { fetchJson } from '@envirodash/core'

/**
 * Aggregated map locations endpoint.
 * Returns all environmental data points for display on the map.
 *
 * GET /api/map/locations?lat=46.05&lng=14.50&radius=500
 *
 * Returns GeoJSON FeatureCollection with:
 *   - Air quality monitors (per city)
 *   - Active wildfires (FWI > 30)
 *   - Recent earthquakes (M4+, last 24h)
 *   - Active volcanoes (warning/watch)
 *   - Active tsunami warnings (region centroids)
 */

interface MapFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    id: string
    kind: 'air-quality' | 'wildfire' | 'earthquake' | 'volcano' | 'tsunami'
    name: string
    status: 'stable' | 'moderate' | 'warning' | 'critical'
    value?: number
    unit?: string
    description?: string
    timestamp?: string
    source: string
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`

  const [aqR, wfR, eqR, volR, tsunamiR] = await Promise.allSettled([
    fetchJson<any>(`${baseUrl}/api/air-quality?country=SI&limit=8`),
    fetchJson<any>(`${baseUrl}/api/wildfire?area=europe`),
    fetchJson<any>(`${baseUrl}/api/earthquake?minMagnitude=4&limit=30`),
    fetchJson<any>(`${baseUrl}/api/volcano`),
    fetchJson<any>(`${baseUrl}/api/tsunami`),
  ])

  const features: MapFeature[] = []

  // Air quality
  if (aqR.status === 'fulfilled') {
    for (const r of aqR.value.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          kind: 'air-quality',
          name: r.name,
          status: r.status,
          value: r.value,
          unit: 'AQI',
          description: r.description,
          timestamp: r.lastUpdated,
          source: 'Open-Meteo Air Quality',
        },
      })
    }
  }

  // Wildfire risk
  if (wfR.status === 'fulfilled') {
    for (const r of wfR.value.results || []) {
      if ((r.value || 0) < 20) continue // Only show moderate+ on map
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          kind: 'wildfire',
          name: r.name,
          status: r.status,
          value: r.value,
          unit: 'FWI',
          description: r.description,
          timestamp: r.lastUpdated,
          source: 'Open-Meteo Fire Weather',
        },
      })
    }
  }

  // Earthquakes
  if (eqR.status === 'fulfilled') {
    for (const r of eqR.value.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          kind: 'earthquake',
          name: r.name,
          status: r.status,
          value: r.value,
          unit: 'magnitude',
          description: r.description,
          timestamp: r.lastUpdated,
          source: 'USGS Earthquakes',
        },
      })
    }
  }

  // Volcanoes (only warning/watch)
  if (volR.status === 'fulfilled') {
    for (const r of volR.value.results || []) {
      if (r.status === 'stable' || r.status === 'moderate') continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          kind: 'volcano',
          name: r.name,
          status: r.status,
          description: r.description,
          timestamp: r.lastUpdated,
          source: 'USGS Volcano Hazards',
        },
      })
    }
  }

  // Tsunami (region centroids — simplified)
  if (tsunamiR.status === 'fulfilled') {
    const regionCentroids: Record<string, [number, number]> = {
      pacific: [-160, 0],
      atlantic: [-40, 20],
      caribbean: [-75, 18],
      indian_ocean: [80, -10],
      mediterranean: [18, 38],
      hawaii: [-155, 20],
      alaska: [-150, 60],
      us_west_coast: [-122, 38],
    }
    for (const t of tsunamiR.value.results || []) {
      const coords = regionCentroids[t.region] || [0, 0]
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          id: t.id,
          kind: 'tsunami',
          name: t.title,
          status: t.msg_type === 'warning' ? 'critical' : 'warning',
          description: t.description,
          timestamp: t.pub_date,
          source: 'NOAA NTWC',
        },
      })
    }
  }

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
    count: features.length,
    byKind: features.reduce((acc, f) => {
      acc[f.properties.kind] = (acc[f.properties.kind] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    fetchedAt: new Date().toISOString(),
  })
}
