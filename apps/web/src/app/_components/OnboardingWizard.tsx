'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sparkles, ChevronRight, ChevronLeft, Check, X, MapPin, Bell, Shield, BarChart3, Globe, Zap } from 'lucide-react'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to EnviroDash',
    icon: Globe,
    color: 'from-emerald-500 to-teal-600',
    content: 'Real-time environmental monitoring with 10 data sources, AI assistant, and multi-channel alerts.',
  },
  {
    id: 'language',
    title: 'Choose your language',
    icon: Globe,
    color: 'from-blue-500 to-indigo-600',
    options: [
      { code: 'sl', label: '🇸🇮 Slovenščina' },
      { code: 'en', label: '🇬🇧 English' },
      { code: 'de', label: '🇩🇪 Deutsch' },
      { code: 'it', label: '🇮🇹 Italiano' },
      { code: 'fr', label: '🇫🇷 Français' },
      { code: 'es', label: '🇪🇸 Español' },
      { code: 'hr', label: '🇭🇷 Hrvatski' },
    ],
  },
  {
    id: 'monitors',
    title: 'Select your monitors',
    icon: BarChart3,
    color: 'from-violet-500 to-purple-600',
    description: 'Pick the environmental monitors you care about. You can change this later.',
    options: [
      { id: 'air-quality', label: '💨 Air Quality', desc: 'PM2.5, AQI from Open-Meteo' },
      { id: 'wildfire', label: '🔥 Wildfire Risk', desc: 'Fire Weather Index' },
      { id: 'earthquake', label: '🌎 Earthquakes', desc: 'M2.5+ from USGS' },
      { id: 'tsunami', label: '🌊 Tsunami', desc: 'NOAA warnings' },
      { id: 'volcano', label: '🌋 Volcano', desc: 'USGS alerts' },
      { id: 'weather', label: '⛅ Weather', desc: 'Temperature, humidity, wind' },
      { id: 'glacier', label: '🏔️ Glacier', desc: '12 major glaciers' },
      { id: 'coral-reef', label: '🐠 Coral Reef', desc: 'Sea surface temperature' },
      { id: 'flood', label: '🌊 Flood Risk', desc: '14 river basins' },
      { id: 'drought', label: '☀️ Drought', desc: 'D0-D4 classification' },
    ],
  },
  {
    id: 'alerts',
    title: 'Set up alerts',
    icon: Bell,
    color: 'from-amber-500 to-orange-600',
    description: 'Choose how you want to be notified about environmental events.',
    options: [
      { id: 'websocket', label: '🌐 In-browser alerts', desc: 'Real-time toast notifications' },
      { id: 'push', label: '📱 Mobile push', desc: 'Expo push notifications' },
      { id: 'email', label: '📧 Email alerts', desc: 'Critical alerts via SMTP' },
      { id: 'webhook', label: '🔌 Webhooks', desc: 'Slack, IFTTT, custom integrations' },
      { id: 'desktop', label: '🖥️ Desktop notifications', desc: 'Browser notification API' },
    ],
  },
  {
    id: 'location',
    title: 'Set your location',
    icon: MapPin,
    color: 'from-rose-500 to-pink-600',
    description: 'We\'ll show environmental data for your area first.',
    presets: [
      { name: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
      { name: 'Maribor', lat: 46.5547, lng: 15.6459 },
      { name: 'Koper', lat: 45.5481, lng: 13.7300 },
      { name: 'Celje', lat: 46.2389, lng: 15.2675 },
      { name: 'Zagreb', lat: 45.815, lng: 15.9819 },
      { name: 'Trieste', lat: 45.6495, lng: 13.7768 },
      { name: 'Vienna', lat: 48.2082, lng: 16.3738 },
      { name: 'Munich', lat: 48.1351, lng: 11.5820 },
    ],
  },
  {
    id: 'features',
    title: 'Explore features',
    icon: Zap,
    color: 'from-cyan-500 to-blue-600',
    features: [
      { icon: '✨', name: 'AI Assistant', desc: 'Ask natural-language questions about environmental data' },
      { icon: '🛰️', name: 'AI Vision', desc: 'Analyze satellite imagery with VLM' },
      { icon: '🗺️', name: 'Interactive Map', desc: 'Color-coded environmental data on MapLibre map' },
      { icon: '🤝', name: 'Collaborative Map', desc: 'Share map sessions with colleagues in real-time' },
      { icon: '📊', name: 'Analytics Dashboard', desc: 'Privacy-first analytics with PostHog/Plausible support' },
      { icon: '📈', name: 'Advanced Insights', desc: 'Cohorts, funnels, retention, heatmap analysis' },
      { icon: '📦', name: 'Marketplace', desc: '874 monitor packages (10 real + 864 demo)' },
      { icon: '📝', name: 'Code Editor', desc: 'Create and publish your own monitors' },
      { icon: '🔑', name: 'Developer API', desc: 'REST API with rate limiting and API keys' },
      { icon: '📥', name: 'Data Export', desc: 'CSV/JSON export for all monitor types' },
      { icon: '📄', name: 'PDF Reports', desc: '2-page environmental summary reports' },
      { icon: '💬', name: 'Community Chat', desc: '11 rooms for real-time discussion' },
    ],
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    icon: Check,
    color: 'from-emerald-500 to-teal-600',
    content: 'Your EnviroDash is configured. Start exploring real-time environmental data!',
  },
]

export function OnboardingWizard({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [step, setStep] = useState(0)
  const [selectedLang, setSelectedLang] = useState('sl')
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set(['air-quality', 'earthquake', 'tsunami']))
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set(['websocket', 'desktop']))
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lng: number } | null>(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const finish = async () => {
    // Save preferences to localStorage
    localStorage.setItem('envirodash-lang', selectedLang)
    localStorage.setItem('envirodash-onboarded', 'true')
    localStorage.setItem('envirodash-monitors', JSON.stringify(Array.from(selectedMonitors)))
    localStorage.setItem('envirodash-alerts', JSON.stringify(Array.from(selectedAlerts)))
    if (selectedLocation) {
      localStorage.setItem('envirodash-location', JSON.stringify(selectedLocation))
    }

    // If logged in, save to dashboard config
    if (session?.user) {
      try {
        const cards = Array.from(selectedMonitors).map((id, i) => ({
          id: `card-${id}`,
          type: id,
          title: id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          params: id === 'weather' && selectedLocation
            ? { lat: selectedLocation.lat, lng: selectedLocation.lng, name: selectedLocation.name }
            : {},
          order: i,
        }))
        await fetch('/api/user/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards }),
        })
      } catch {
        // non-critical
      }
    }

    onClose?.()
  }

  const skip = () => {
    localStorage.setItem('envirodash-onboarded', 'true')
    onClose?.()
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={skip}
            className="absolute right-4 top-4 z-10 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Skip
          </button>
        )}

        {/* Close */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            style={{ display: isLast ? 'block' : 'none' }}
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-8">
          {/* Step header */}
          <div className="mb-6 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${current.color} text-white shadow-lg`}>
              <current.icon className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{current.title}</h2>
            {current.content && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{current.content}</p>
            )}
            {current.description && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{current.description}</p>
            )}
          </div>

          {/* Step content */}
          <div className="mb-6">
            {/* Welcome */}
            {current.id === 'welcome' && (
              <div className="space-y-3 text-center">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { icon: '🌍', label: '10 Data Sources' },
                    { icon: '🤖', label: 'AI Assistant' },
                    { icon: '🛰️', label: 'Satellite Vision' },
                    { icon: '🗺️', label: 'Interactive Map' },
                    { icon: '🔔', label: '4 Alert Channels' },
                    { icon: '📊', label: 'Analytics' },
                  ].map((f) => (
                    <div key={f.label} className="rounded-lg border p-3 text-center dark:border-zinc-700">
                      <div className="text-2xl">{f.icon}</div>
                      <div className="mt-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language */}
            {current.id === 'language' && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {current.options?.map((opt: any) => (
                  <button
                    key={opt.code}
                    onClick={() => setSelectedLang(opt.code)}
                    className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                      selectedLang === opt.code
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Monitors */}
            {current.id === 'monitors' && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {current.options?.map((opt: any) => {
                  const selected = selectedMonitors.has(opt.id)
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggle(selectedMonitors, opt.id, setSelectedMonitors)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">{opt.label.split(' ')[0]}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{opt.label.split(' ').slice(1).join(' ')}</div>
                        <div className="text-[10px] text-zinc-500">{opt.desc}</div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-emerald-500" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Alerts */}
            {current.id === 'alerts' && (
              <div className="grid grid-cols-1 gap-2">
                {current.options?.map((opt: any) => {
                  const selected = selectedAlerts.has(opt.id)
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggle(selectedAlerts, opt.id, setSelectedAlerts)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">{opt.label.split(' ')[0]}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{opt.label.split(' ').slice(1).join(' ')}</div>
                        <div className="text-[10px] text-zinc-500">{opt.desc}</div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-amber-500" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Location */}
            {current.id === 'location' && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {current.presets?.map((preset: any) => {
                  const selected = selectedLocation?.name === preset.name
                  return (
                    <button
                      key={preset.name}
                      onClick={() => setSelectedLocation(preset)}
                      className={`rounded-lg border p-3 text-center transition-all ${
                        selected
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      <MapPin className={`mx-auto mb-1 h-4 w-4 ${selected ? 'text-rose-500' : 'text-zinc-400'}`} />
                      <span className="text-xs font-medium">{preset.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Features */}
            {current.id === 'features' && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {current.features?.map((f: any) => (
                  <div key={f.name} className="flex items-center gap-2 rounded-lg border p-2 dark:border-zinc-700">
                    <span className="text-lg">{f.icon}</span>
                    <div>
                      <div className="text-xs font-bold">{f.name}</div>
                      <div className="text-[10px] text-zinc-500">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Done */}
            {current.id === 'done' && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                  <Check className="h-10 w-10 text-emerald-600" />
                </div>
                <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>✅ Language: {selectedLang.toUpperCase()}</p>
                  <p>✅ Monitors: {selectedMonitors.size} selected</p>
                  <p>✅ Alerts: {selectedAlerts.size} channels</p>
                  {selectedLocation && <p>✅ Location: {selectedLocation.name}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {!isFirst ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="text-[10px] text-zinc-400">
              Step {step + 1} of {STEPS.length}
            </div>

            {isLast ? (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2 text-sm font-bold text-white hover:from-emerald-700 hover:to-teal-800"
              >
                <Sparkles className="h-4 w-4" />
                Start Exploring
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-sm font-bold text-white hover:from-emerald-700 hover:to-teal-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
