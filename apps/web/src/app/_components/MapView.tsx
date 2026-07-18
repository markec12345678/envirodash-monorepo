'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Loader2, X, Layers, RefreshCw } from 'lucide-react'

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

const STATUS_COLORS: Record<string, string> = {
  stable: '#10b981',
  moderate: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
}

const KIND_ICONS: Record<string, string> = {
  'air-quality': '💨',
  wildfire: '🔥',
  earthquake: '🌎',
  volcano: '🌋',
  tsunami: '🌊',
}

const KIND_LABELS: Record<string, string> = {
  'air-quality': 'Air Quality',
  wildfire: 'Wildfire Risk',
  earthquake: 'Earthquake',
  volcano: 'Volcano',
  tsunami: 'Tsunami',
}

interface MapViewProps {
  onClose?: () => void
  showClose?: boolean
}

export function MapView({ onClose, showClose = true }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [features, setFeatures] = useState<MapFeature[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [visibleKinds, setVisibleKinds] = useState<Set<string>>(
    new Set(['air-quality', 'wildfire', 'earthquake', 'volcano', 'tsunami'])
  )
  const [activeFeature, setActiveFeature] = useState<MapFeature | null>(null)
  const [showLegend, setShowLegend] = useState(true)

  const loadLocations = async () => {
    try {
      const res = await fetch('/api/map/locations')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFeatures(data.features || [])
      setCounts(data.byKind || {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [14.5058, 46.0569], // Ljubljana
      zoom: 4,
    })

    mapRef.current = map

    map.on('load', () => {
      // Add source for environmental features
      map.addSource('enviro-features', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Add circle layer for each kind
      map.addLayer({
        id: 'enviro-points',
        type: 'circle',
        source: 'enviro-features',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'kind'], 'earthquake'],
            ['+', 8, ['*', 2, ['get', 'value']]],
            ['==', ['get', 'kind'], 'wildfire'],
            12,
            ['==', ['get', 'kind'], 'volcano'],
            14,
            10,
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'stable', STATUS_COLORS.stable,
            'moderate', STATUS_COLORS.moderate,
            'warning', STATUS_COLORS.warning,
            'critical', STATUS_COLORS.critical,
            '#71717a',
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.85,
        },
      })

      // Click handler
      map.on('click', 'enviro-points', (e: any) => {
        if (e.features && e.features[0]) {
          setActiveFeature(e.features[0] as MapFeature)
        }
      })

      // Cursor pointer on hover
      map.on('mouseenter', 'enviro-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'enviro-points', () => {
        map.getCanvas().style.cursor = ''
      })

      // Popups on hover
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
      map.on('mousemove', 'enviro-points', (e: any) => {
        if (e.features && e.features[0]) {
          const f = e.features[0]
          const props = f.properties
          popup
            .setLngLat(f.geometry.coordinates)
            .setHTML(
              `<div style="font-family: -apple-system, sans-serif; padding: 4px;">
                <div style="font-weight: bold; font-size: 12px;">${KIND_ICONS[props.kind] || ''} ${props.name}</div>
                <div style="font-size: 10px; color: #71717a;">${KIND_LABELS[props.kind] || props.kind}</div>
                ${props.value ? `<div style="font-size: 11px; margin-top: 2px;"><strong>${props.value}</strong> ${props.unit || ''}</div>` : ''}
              </div>`
            )
            .addTo(map)
        }
      })
      map.on('mouseleave', 'enviro-points', () => popup.remove())
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update features on map when data or filters change
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getSource('enviro-features')) return
    const filtered = features.filter((f) => visibleKinds.has(f.properties.kind))
    ;(mapRef.current.getSource('enviro-features') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: filtered,
    })
  }, [features, visibleKinds])

  const toggleKind = (kind: string) => {
    setVisibleKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-lg font-bold">🌍 Environmental Map</h2>
              <p className="text-xs text-emerald-100">
                {features.length} data points · {Object.values(counts).reduce((a, b) => a + b, 0)} active events
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
            >
              <Layers className="h-3 w-3" /> Legend
            </button>
            <button
              onClick={() => {
                setLoading(true)
                loadLocations()
              }}
              className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {showClose && (
              <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Map container */}
        <div className="relative flex-1">
          <div ref={mapContainer} className="h-full w-full" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Loading environmental data…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Legend overlay */}
          {showLegend && (
            <div className="absolute right-4 top-4 w-56 rounded-lg border bg-white/95 p-3 shadow-lg dark:bg-zinc-900/95">
              <h3 className="mb-2 text-xs font-bold uppercase text-zinc-700 dark:text-zinc-300">Layers</h3>
              {Object.entries(KIND_LABELS).map(([kind, label]) => (
                <label key={kind} className="flex items-center gap-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={visibleKinds.has(kind)}
                    onChange={() => toggleKind(kind)}
                    className="h-3 w-3"
                  />
                  <span className="text-base">{KIND_ICONS[kind]}</span>
                  <span className="flex-1">{label}</span>
                  <span className="rounded-full bg-zinc-100 px-1.5 text-[10px] font-medium dark:bg-zinc-800">
                    {counts[kind] || 0}
                  </span>
                </label>
              ))}
              <div className="mt-2 border-t pt-2">
                <h3 className="mb-1 text-xs font-bold uppercase text-zinc-700 dark:text-zinc-300">Status</h3>
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2 py-0.5 text-[11px]">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active feature detail panel */}
          {activeFeature && (
            <div className="absolute bottom-4 left-4 w-72 rounded-lg border-2 border-emerald-500 bg-white p-3 shadow-xl dark:bg-zinc-900">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{KIND_ICONS[activeFeature.properties.kind]}</span>
                    <h3 className="text-sm font-bold">{activeFeature.properties.name}</h3>
                  </div>
                  <p className="text-[10px] text-zinc-500">{KIND_LABELS[activeFeature.properties.kind]}</p>
                </div>
                <button onClick={() => setActiveFeature(null)} className="rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {activeFeature.properties.value != null && (
                <div className="mb-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: STATUS_COLORS[activeFeature.properties.status] }}
                  >
                    {activeFeature.properties.value} {activeFeature.properties.unit}
                  </span>
                </div>
              )}
              {activeFeature.properties.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{activeFeature.properties.description}</p>
              )}
              {activeFeature.properties.timestamp && (
                <p className="mt-1 text-[10px] text-zinc-500">
                  {new Date(activeFeature.properties.timestamp).toLocaleString()}
                </p>
              )}
              <p className="mt-1 text-[10px] text-zinc-500">Source: {activeFeature.properties.source}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapView
