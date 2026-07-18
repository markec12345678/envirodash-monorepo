'use client'

import { useState, lazy, Suspense } from 'react'
import { Activity, Wind, Flame, Waves, Mountain, CloudSun, Snowflake, Fish, Droplets, Sun, Globe, Sparkles } from 'lucide-react'
import { AIAssistant } from './_components/AIAssistant'

// Lazy-load monitor packages — only the active monitor is compiled and shipped
const AirQualityMonitor = lazy(() => import('@envirodash/monitor-air-quality').then((m) => ({ default: m.AirQualityMonitor })))
const WildfireMonitor = lazy(() => import('@envirodash/monitor-wildfire').then((m) => ({ default: m.WildfireMonitor })))
const TsunamiMonitor = lazy(() => import('@envirodash/monitor-tsunami').then((m) => ({ default: m.TsunamiMonitor })))
const VolcanoMonitor = lazy(() => import('@envirodash/monitor-volcano').then((m) => ({ default: m.VolcanoMonitor })))
const EarthquakeMonitor = lazy(() => import('@envirodash/monitor-earthquake').then((m) => ({ default: m.EarthquakeMonitor })))
const WeatherMonitor = lazy(() => import('@envirodash/monitor-weather').then((m) => ({ default: m.WeatherMonitor })))
const GlacierMonitor = lazy(() => import('@envirodash/monitor-glacier').then((m) => ({ default: m.GlacierMonitor })))
const CoralReefMonitor = lazy(() => import('@envirodash/monitor-coral-reef').then((m) => ({ default: m.CoralReefMonitor })))
const FloodMonitor = lazy(() => import('@envirodash/monitor-flood').then((m) => ({ default: m.FloodMonitor })))
const DroughtMonitor = lazy(() => import('@envirodash/monitor-drought').then((m) => ({ default: m.DroughtMonitor })))

type MonitorId =
  | 'air-quality'
  | 'wildfire'
  | 'tsunami'
  | 'volcano'
  | 'earthquake'
  | 'weather'
  | 'glacier'
  | 'coral-reef'
  | 'flood'
  | 'drought'

interface MonitorMeta {
  id: MonitorId
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  realData: boolean
  description: string
}

const MONITORS: MonitorMeta[] = [
  { id: 'air-quality', name: 'Air Quality', icon: Wind, color: 'bg-emerald-500', realData: true, description: 'PM2.5, AQI (Open-Meteo)' },
  { id: 'wildfire', name: 'Wildfire Risk', icon: Flame, color: 'bg-orange-500', realData: true, description: 'FWI (Open-Meteo)' },
  { id: 'tsunami', name: 'Tsunami', icon: Waves, color: 'bg-cyan-500', realData: true, description: 'NOAA NTWC' },
  { id: 'volcano', name: 'Volcano', icon: Mountain, color: 'bg-rose-500', realData: true, description: 'USGS' },
  { id: 'earthquake', name: 'Earthquakes', icon: Activity, color: 'bg-amber-500', realData: true, description: 'USGS (24h)' },
  { id: 'weather', name: 'Weather', icon: CloudSun, color: 'bg-sky-500', realData: true, description: 'Open-Meteo' },
  { id: 'glacier', name: 'Glacier', icon: Snowflake, color: 'bg-cyan-500', realData: false, description: 'Planned v1.1' },
  { id: 'coral-reef', name: 'Coral Reef', icon: Fish, color: 'bg-pink-500', realData: false, description: 'Planned v1.1' },
  { id: 'flood', name: 'Flood', icon: Droplets, color: 'bg-sky-500', realData: false, description: 'Planned v1.1' },
  { id: 'drought', name: 'Drought', icon: Sun, color: 'bg-amber-500', realData: false, description: 'Planned v1.1' },
]

export default function Home() {
  const [activeMonitor, setActiveMonitor] = useState<MonitorId | null>('air-quality')
  const [showAI, setShowAI] = useState(false)
  const [aiQuery, setAiQuery] = useState<{ monitor: MonitorId; params: any } | null>(null)

  // When AI assistant returns an action, set the active monitor
  const handleAIAction = (monitor: string, params: any) => {
    if (MONITORS.some((m) => m.id === monitor)) {
      setActiveMonitor(monitor as MonitorId)
      setAiQuery({ monitor: monitor as MonitorId, params })
      setShowAI(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">🌍 EnviroDash</h1>
              <p className="text-[10px] text-zinc-500">Real-time environmental monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAI(!showAI)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showAI
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-300'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </button>
            <div className="hidden text-xs text-zinc-500 md:block">
              {MONITORS.filter((m) => m.realData).length} real-data monitors · {MONITORS.length} total
            </div>
          </div>
        </div>
      </header>

      {/* Monitor selector grid */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Select a monitor to view real-time data:
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
          {MONITORS.map((m) => {
            const Icon = m.icon
            const isActive = activeMonitor === m.id
            return (
              <button
                key={m.id}
                onClick={() => setActiveMonitor(isActive ? null : m.id)}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all hover:shadow-md ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800'
                }`}
                title={m.description}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{m.name}</span>
                {m.realData ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" title="Real-time data" />
                ) : (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-zinc-300" title="Planned" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Active monitor */}
      {activeMonitor && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          }
        >
          {activeMonitor === 'air-quality' && <AirQualityMonitor query={{ country: 'SI' }} onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'wildfire' && <WildfireMonitor query={{ area: 'europe' }} onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'tsunami' && <TsunamiMonitor onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'volcano' && <VolcanoMonitor onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'earthquake' && <EarthquakeMonitor onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'weather' && (
            <WeatherMonitor query={{ lat: 46.0569, lng: 14.5058, name: 'Ljubljana' }} onClose={() => setActiveMonitor(null)} />
          )}
          {activeMonitor === 'glacier' && <GlacierMonitor onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'coral-reef' && <CoralReefMonitor onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'flood' && <FloodMonitor onClose={() => setActiveMonitor(null)} />}
          {activeMonitor === 'drought' && <DroughtMonitor onClose={() => setActiveMonitor(null)} />}
        </Suspense>
      )}

      {/* AI Assistant — floating bottom-right panel */}
      {showAI && (
        <AIAssistant onClose={() => setShowAI(false)} onAction={handleAIAction} />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t bg-white/50 py-6 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-zinc-500">
          <p>
            <strong>🌍 EnviroDash</strong> · Real-time environmental monitoring platform
          </p>
          <p className="mt-1">
            Powered by <a href="https://open-meteo.com" className="text-emerald-600 hover:underline">Open-Meteo</a>
            , <a href="https://www.tsunami.gov" className="text-emerald-600 hover:underline">NOAA NTWC</a>
            , <a href="https://earthquake.usgs.gov" className="text-emerald-600 hover:underline">USGS</a>
            {' '}· Monorepo architecture · MIT License
          </p>
        </div>
      </footer>
    </main>
  )
}
