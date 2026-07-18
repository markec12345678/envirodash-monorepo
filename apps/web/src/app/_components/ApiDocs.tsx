'use client'

import { useState } from 'react'
import { Code2, X, Copy, Check, ChevronDown, ChevronRight, Play } from 'lucide-react'

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'
  path: string
  description: string
  auth: 'none' | 'session' | 'api-key' | 'internal'
  params?: Array<{ name: string; type: string; required: boolean; description: string }>
  example?: string
  responseExample?: string
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-amber-100 text-amber-700',
  PUT: 'bg-amber-100 text-amber-700',
}

const AUTH_BADGES: Record<string, { label: string; color: string }> = {
  none: { label: 'Public', color: 'bg-emerald-100 text-emerald-700' },
  session: { label: 'Session', color: 'bg-blue-100 text-blue-700' },
  'api-key': { label: 'API Key', color: 'bg-violet-100 text-violet-700' },
  internal: { label: 'Internal', color: 'bg-zinc-100 text-zinc-700' },
}

const ENDPOINTS: ApiEndpoint[] = [
  // Public - Environmental Data
  { method: 'GET', path: '/api/air-quality', description: 'Real-time air quality (PM2.5, PM10, AQI)', auth: 'none',
    params: [
      { name: 'lat', type: 'number', required: false, description: 'Latitude for point query' },
      { name: 'lng', type: 'number', required: false, description: 'Longitude for point query' },
      { name: 'country', type: 'string', required: false, description: 'Country code (SI, DE, IT, FR, GB, US)' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default 10)' },
    ],
    example: 'curl "http://localhost:3000/api/air-quality?country=SI"',
    responseExample: '{"source":"Open-Meteo","count":8,"results":[{"name":"Ljubljana","us_aqi":55,"status":"moderate"}]}',
  },
  { method: 'GET', path: '/api/wildfire', description: 'Fire Weather Index (0-100)', auth: 'none',
    params: [
      { name: 'area', type: 'string', required: false, description: 'europe | california | australia | slovenia' },
      { name: 'lat', type: 'number', required: false, description: 'Latitude' },
      { name: 'lng', type: 'number', required: false, description: 'Longitude' },
    ],
    example: 'curl "http://localhost:3000/api/wildfire?area=europe"',
  },
  { method: 'GET', path: '/api/earthquake', description: 'Recent earthquakes (M2.5+, 24h) from USGS', auth: 'none',
    params: [
      { name: 'minMagnitude', type: 'number', required: false, description: 'Minimum magnitude (default 2.5)' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default 50)' },
    ],
    example: 'curl "http://localhost:3000/api/earthquake?minMagnitude=5&limit=10"',
  },
  { method: 'GET', path: '/api/tsunami', description: 'Active tsunami warnings from NOAA NTWC', auth: 'none',
    example: 'curl "http://localhost:3000/api/tsunami"',
  },
  { method: 'GET', path: '/api/volcano', description: 'USGS volcano alerts worldwide', auth: 'none',
    example: 'curl "http://localhost:3000/api/volcano"',
  },
  { method: 'GET', path: '/api/weather', description: 'Current weather from Open-Meteo', auth: 'none',
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'name', type: 'string', required: false, description: 'Location name' },
    ],
    example: 'curl "http://localhost:3000/api/weather?lat=46.05&lng=14.50&name=Ljubljana"',
  },
  { method: 'GET', path: '/api/glacier', description: 'Glacier conditions (12 major glaciers)', auth: 'none',
    params: [{ name: 'region', type: 'string', required: false, description: 'alps | himalaya | andes | arctic | all' }],
    example: 'curl "http://localhost:3000/api/glacier?region=alps"',
  },
  { method: 'GET', path: '/api/coral-reef', description: 'Coral reef sea surface temperature', auth: 'none',
    params: [{ name: 'region', type: 'string', required: false, description: 'pacific | caribbean | indian | red-sea | all' }],
    example: 'curl "http://localhost:3000/api/coral-reef?region=pacific"',
  },
  { method: 'GET', path: '/api/flood', description: 'Flood risk score (0-100)', auth: 'none',
    params: [{ name: 'region', type: 'string', required: false, description: 'europe | asia | us | all' }],
    example: 'curl "http://localhost:3000/api/flood?region=europe"',
  },
  { method: 'GET', path: '/api/drought', description: 'Drought severity (D0-D4 classification)', auth: 'none',
    params: [{ name: 'region', type: 'string', required: false, description: 'slovenia | europe | us | middle-east | australia | all' }],
    example: 'curl "http://localhost:3000/api/drought?region=slovenia"',
  },

  // History
  { method: 'GET', path: '/api/air-quality/history', description: 'Historical air quality (hourly, up to 6 months)', auth: 'none',
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'hours', type: 'number', required: false, description: 'Hours of history (default 24)' },
      { name: 'days', type: 'number', required: false, description: 'Days of history (overrides hours)' },
    ],
    example: 'curl "http://localhost:3000/api/air-quality/history?lat=46.05&lng=14.50&days=7"',
  },
  { method: 'GET', path: '/api/weather/history', description: 'Historical weather (hourly)', auth: 'none',
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'days', type: 'number', required: false, description: 'Days of history (default 7)' },
    ],
    example: 'curl "http://localhost:3000/api/weather/history?lat=46.05&lng=14.50&days=7"',
  },

  // Map & Export
  { method: 'GET', path: '/api/map/locations', description: 'Aggregated GeoJSON for map display', auth: 'none',
    example: 'curl "http://localhost:3000/api/map/locations"',
  },
  { method: 'GET', path: '/api/export', description: 'CSV/JSON data export', auth: 'none',
    params: [
      { name: 'format', type: 'string', required: true, description: 'csv | json' },
      { name: 'type', type: 'string', required: true, description: 'air-quality | wildfire | earthquake | tsunami | volcano | history' },
    ],
    example: 'curl -o data.csv "http://localhost:3000/api/export?format=csv&type=air-quality&country=SI"',
  },
  { method: 'GET', path: '/api/report', description: 'PDF environmental report', auth: 'none',
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'name', type: 'string', required: false, description: 'Location name' },
      { name: 'days', type: 'number', required: false, description: 'Report period in days (default 7)' },
    ],
    example: 'curl -o report.pdf "http://localhost:3000/api/report?lat=46.05&lng=14.50&name=Ljubljana"',
  },

  // Marketplace & Registry
  { method: 'GET', path: '/api/marketplace', description: 'Browse 874 monitor packages', auth: 'none',
    params: [
      { name: 'category', type: 'string', required: false, description: 'Filter by category' },
      { name: 'realData', type: 'boolean', required: false, description: 'Only real-data monitors' },
      { name: 'search', type: 'string', required: false, description: 'Search query' },
    ],
    example: 'curl "http://localhost:3000/api/marketplace?realData=true"',
  },
  { method: 'GET', path: '/api/monitor-registry', description: 'Browse community-published monitors', auth: 'none',
    params: [
      { name: 'category', type: 'string', required: false, description: 'Filter by category' },
      { name: 'search', type: 'string', required: false, description: 'Search query' },
      { name: 'sort', type: 'string', required: false, description: 'newest | downloads | rating' },
    ],
    example: 'curl "http://localhost:3000/api/monitor-registry?sort=downloads"',
  },

  // AI
  { method: 'POST', path: '/api/ai-chat', description: 'Natural-language environmental queries', auth: 'none',
    example: 'curl -X POST -H "Content-Type: application/json" -d \'{"message":"Kakšna je kakovost zraka v Ljubljani?"}\' "http://localhost:3000/api/ai-chat"',
  },
  { method: 'POST', path: '/api/vision', description: 'Satellite imagery analysis (VLM)', auth: 'none',
    example: 'curl -X POST -H "Content-Type: application/json" -d \'{"imageUrl":"https://example.com/satellite.jpg","type":"wildfire"}\' "http://localhost:3000/api/vision"',
  },

  // Authenticated
  { method: 'GET', path: '/api/user', description: 'Current session info', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user"',
  },
  { method: 'GET', path: '/api/user/geofences', description: 'List user geofences', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/geofences"',
  },
  { method: 'GET', path: '/api/user/dashboard', description: 'Get custom dashboard config', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/dashboard"',
  },
  { method: 'GET', path: '/api/user/api-keys', description: 'List API keys', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/api-keys"',
  },
  { method: 'GET', path: '/api/user/webhooks', description: 'List webhooks', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/webhooks"',
  },
  { method: 'GET', path: '/api/user/email-subscriptions', description: 'List email subscriptions', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/email-subscriptions"',
  },
  { method: 'GET', path: '/api/user/push-tokens', description: 'List mobile push tokens', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/push-tokens"',
  },
  { method: 'GET', path: '/api/user/published-monitors', description: 'List published monitors', auth: 'session',
    example: 'curl -b cookies.txt "http://localhost:3000/api/user/published-monitors"',
  },

  // Developer API
  { method: 'GET', path: '/api/v1', description: 'REST API v1 (requires API key)', auth: 'api-key',
    params: [
      { name: 'type', type: 'string', required: true, description: 'air-quality | wildfire | earthquake | tsunami | volcano | weather | glacier | coral-reef | flood | drought' },
    ],
    example: 'curl -H "Authorization: Bearer ed_live_xxx" "http://localhost:3000/api/v1?type=air-quality&country=SI"',
  },

  // Analytics
  { method: 'GET', path: '/api/analytics', description: 'Basic analytics summary', auth: 'none',
    params: [{ name: 'days', type: 'number', required: false, description: 'Period in days (default 7)' }],
    example: 'curl "http://localhost:3000/api/analytics?days=30"',
  },
  { method: 'GET', path: '/api/analytics/advanced', description: 'Advanced analytics (cohorts, funnels, heatmap)', auth: 'none',
    params: [{ name: 'days', type: 'number', required: false, description: 'Period in days (default 30)' }],
    example: 'curl "http://localhost:3000/api/analytics/advanced?days=30"',
  },

  // Health
  { method: 'GET', path: '/api/health', description: 'Health check endpoint', auth: 'none',
    example: 'curl "http://localhost:3000/api/health"',
  },
]

const CATEGORIES = [
  { name: 'Environmental Data', filter: (e: ApiEndpoint) => ['/api/air-quality', '/api/wildfire', '/api/earthquake', '/api/tsunami', '/api/volcano', '/api/weather', '/api/glacier', '/api/coral-reef', '/api/flood', '/api/drought'].some(p => e.path.startsWith(p)) },
  { name: 'Historical Data', filter: (e: ApiEndpoint) => e.path.includes('/history') },
  { name: 'Map & Export', filter: (e: ApiEndpoint) => ['/api/map', '/api/export', '/api/report'].some(p => e.path.startsWith(p)) },
  { name: 'Marketplace & Registry', filter: (e: ApiEndpoint) => e.path.startsWith('/api/marketplace') || e.path.startsWith('/api/monitor-registry') },
  { name: 'AI', filter: (e: ApiEndpoint) => e.path.startsWith('/api/ai') || e.path.startsWith('/api/vision') },
  { name: 'Authenticated (Session)', filter: (e: ApiEndpoint) => e.auth === 'session' },
  { name: 'Developer API (Key)', filter: (e: ApiEndpoint) => e.auth === 'api-key' },
  { name: 'Analytics', filter: (e: ApiEndpoint) => e.path.startsWith('/api/analytics') },
  { name: 'System', filter: (e: ApiEndpoint) => e.path === '/api/health' },
]

export function ApiDocs({ onClose }: { onClose?: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const copyExample = (path: string, example: string) => {
    navigator.clipboard.writeText(example)
    setCopied(path)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = ENDPOINTS.filter((e) => {
    if (search) {
      const hay = `${e.path} ${e.description}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📖 API Documentation</h2>
              <p className="text-xs text-emerald-100">{ENDPOINTS.length} endpoints · Interactive examples</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="border-b p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        {/* Endpoints */}
        <div className="flex-1 overflow-y-auto p-4">
          {CATEGORIES.map((cat) => {
            const catEndpoints = filtered.filter(cat.filter)
            if (catEndpoints.length === 0) return null
            return (
              <div key={cat.name} className="mb-6">
                <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">{cat.name}</h3>
                <div className="space-y-1">
                  {catEndpoints.map((ep) => (
                    <div key={`${ep.method}-${ep.path}`} className="rounded-lg border dark:border-zinc-700">
                      <button
                        onClick={() => setExpanded(expanded === `${ep.method}-${ep.path}` ? null : `${ep.method}-${ep.path}`)}
                        className="flex w-full items-center gap-2 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${METHOD_COLORS[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="flex-1 text-xs font-mono">{ep.path}</code>
                        <span className="hidden text-xs text-zinc-500 sm:block">{ep.description}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${AUTH_BADGES[ep.auth].color}`}>
                          {AUTH_BADGES[ep.auth].label}
                        </span>
                        {expanded === `${ep.method}-${ep.path}` ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
                      </button>

                      {expanded === `${ep.method}-${ep.path}` && (
                        <div className="border-t p-3 dark:border-zinc-700">
                          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">{ep.description}</p>

                          {ep.params && ep.params.length > 0 && (
                            <div className="mb-3">
                              <p className="mb-1 text-[10px] font-bold uppercase text-zinc-500">Parameters</p>
                              <div className="space-y-1">
                                {ep.params.map((p) => (
                                  <div key={p.name} className="flex items-center gap-2 text-xs">
                                    <code className="font-mono text-emerald-600 dark:text-emerald-400">{p.name}</code>
                                    <span className="text-zinc-400">{p.type}</span>
                                    {p.required && <span className="text-red-500">*</span>}
                                    <span className="text-zinc-500">{p.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {ep.example && (
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase text-zinc-500">Example</p>
                              <div className="relative rounded-md bg-zinc-950 p-3">
                                <pre className="overflow-x-auto text-[11px] text-zinc-100">
                                  <code>{ep.example}</code>
                                </pre>
                                <button
                                  onClick={() => copyExample(`${ep.method}-${ep.path}`, ep.example!)}
                                  className="absolute right-2 top-2 rounded p-1 text-zinc-400 hover:bg-zinc-800"
                                >
                                  {copied === `${ep.method}-${ep.path}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ApiDocs
