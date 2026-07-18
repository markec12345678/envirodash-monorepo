'use client'

import { useState, lazy, Suspense } from 'react'
import { Activity, Wind, Flame, Waves, Mountain, CloudSun, Snowflake, Fish, Droplets, Sun, Globe, Sparkles, Store, Shield, FileText, Map, Download, Layout, Key, BarChart3, Webhook, Mail, MessageSquare, Eye, Code2, Share2, TrendingUp, BookOpen, Settings as SettingsIcon, Play, Search } from 'lucide-react'
import { AIAssistant } from './_components/AIAssistant'
import { UserMenuWrapper } from './_components/UserMenu'
import { Marketplace } from './_components/Marketplace'
import { AlertCenter } from './_components/AlertCenter'
import { GeofenceManager } from './_components/GeofenceManager'
import { MapView } from './_components/MapView'
import { ExportDialog } from './_components/ExportDialog'
import { DashboardEditor } from './_components/DashboardEditor'
import { ApiKeyManager } from './_components/ApiKeyManager'
import { LanguageSelector } from './_components/LanguageSelector'
import { AnalyticsDashboard } from './_components/AnalyticsDashboard'
import { WebhookManager } from './_components/WebhookManager'
import { EmailSubscriptionManager } from './_components/EmailSubscriptionManager'
import { ChatPanel } from './_components/ChatPanel'
import { VisionAnalyzer } from './_components/VisionAnalyzer'
import { MonitorCodeEditor } from './_components/MonitorCodeEditor'
import { CollaborativeMap } from './_components/CollaborativeMap'
import { MonitorSandbox } from './_components/MonitorSandbox'
import { AdvancedAnalyticsDashboard } from './_components/AdvancedAnalyticsDashboard'
import { ApiDocs } from './_components/ApiDocs'
import { OnboardingWizard } from './_components/OnboardingWizard'
import { SettingsPanel } from './_components/SettingsPanel'
import { GlobalSearch } from './_components/GlobalSearch'
import { useLanguage } from './_components/LanguageProvider'

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
  { id: 'glacier', name: 'Glacier', icon: Snowflake, color: 'bg-cyan-500', realData: true, description: 'Open-Meteo (glacier weather)' },
  { id: 'coral-reef', name: 'Coral Reef', icon: Fish, color: 'bg-pink-500', realData: true, description: 'Open-Meteo Marine (SST)' },
  { id: 'flood', name: 'Flood', icon: Droplets, color: 'bg-sky-500', realData: true, description: 'Open-Meteo (precip)' },
  { id: 'drought', name: 'Drought', icon: Sun, color: 'bg-amber-500', realData: true, description: 'Open-Meteo (soil moist)' },
]

export default function Home() {
  const { t } = useLanguage()
  const [activeMonitor, setActiveMonitor] = useState<MonitorId | null>('air-quality')
  const [showAI, setShowAI] = useState(false)
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [showGeofences, setShowGeofences] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showDashboardEditor, setShowDashboardEditor] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [showEmailSubs, setShowEmailSubs] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showVision, setShowVision] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [showCollabMap, setShowCollabMap] = useState(false)
  const [showSandbox, setShowSandbox] = useState(false)
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false)
  const [showApiDocs, setShowApiDocs] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
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
            <AlertCenter />
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              title="Global search (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              title="Analytics dashboard"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <button
              onClick={() => setShowAdvancedAnalytics(true)}
              className="flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-300"
              title="Advanced analytics (cohorts, funnels, retention)"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </button>
            <button
              onClick={() => setShowApiDocs(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              title="API documentation"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">API Docs</span>
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              title="Start onboarding wizard"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Get Started</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
            <LanguageSelector />
            <button
              onClick={() => setShowDashboardEditor(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              title={t('btn.customize')}
            >
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.customize')}</span>
            </button>
            <button
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              title={t('btn.apiKeys')}
            >
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.apiKeys')}</span>
            </button>
            <button
              onClick={() => setShowWebhooks(!showWebhooks)}
              className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-950/50 dark:text-purple-300"
              title="Webhooks for external integrations"
            >
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </button>
            <button
              onClick={() => setShowEmailSubs(!showEmailSubs)}
              className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
              title="Email alert subscriptions"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showChat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
              title="Community chat"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              title={t('btn.export')}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.export')}</span>
            </button>
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-300"
              title={t('btn.map')}
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.map')}</span>
            </button>
            <button
              onClick={() => setShowCollabMap(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300"
              title="Start collaborative map session"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Collaborate</span>
            </button>
            <a
              href="/api/report?lat=46.0569&lng=14.5058&name=Ljubljana&days=7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
              title={t('btn.pdf')}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.pdf')}</span>
            </a>
            <button
              onClick={() => setShowGeofences(!showGeofences)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showGeofences
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.geofences')}</span>
            </button>
            <button
              onClick={() => setShowMarketplace(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.marketplace')}</span>
            </button>
            <button
              onClick={() => setShowCodeEditor(true)}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              title="Create your own monitor"
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </button>
            <button
              onClick={() => setShowSandbox(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
              title="Browse community-published monitors"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Sandbox</span>
            </button>
            <button
              onClick={() => setShowAI(!showAI)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showAI
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-300'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">{t('btn.ai')}</span>
            </button>
            <button
              onClick={() => setShowVision(!showVision)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showVision
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-300'
              }`}
              title="AI satellite imagery analysis"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Vision</span>
            </button>
            <UserMenuWrapper />
            <div className="hidden text-xs text-zinc-500 md:block">
              {MONITORS.filter((m) => m.realData).length} {t('app.realMonitors')} · {MONITORS.length} {t('app.totalMonitors')}
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

      {/* Marketplace — full-screen modal */}
      {showMarketplace && (
        <Marketplace onClose={() => setShowMarketplace(false)} />
      )}

      {/* Geofence Manager — floating panel */}
      {showGeofences && (
        <GeofenceManager onClose={() => setShowGeofences(false)} />
      )}

      {/* Map View — full-screen modal */}
      {showMap && (
        <MapView onClose={() => setShowMap(false)} />
      )}

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog onClose={() => setShowExport(false)} />
      )}

      {/* Dashboard Editor */}
      {showDashboardEditor && (
        <DashboardEditor onClose={() => setShowDashboardEditor(false)} />
      )}

      {/* API Key Manager */}
      {showApiKeys && (
        <ApiKeyManager onClose={() => setShowApiKeys(false)} />
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {/* Webhook Manager */}
      {showWebhooks && (
        <WebhookManager onClose={() => setShowWebhooks(false)} />
      )}

      {/* Email Subscription Manager */}
      {showEmailSubs && (
        <EmailSubscriptionManager onClose={() => setShowEmailSubs(false)} />
      )}

      {/* Community Chat */}
      {showChat && (
        <ChatPanel onClose={() => setShowChat(false)} />
      )}

      {/* AI Vision Analyzer */}
      {showVision && (
        <VisionAnalyzer onClose={() => setShowVision(false)} />
      )}

      {/* Monitor Code Editor */}
      {showCodeEditor && (
        <MonitorCodeEditor onClose={() => setShowCodeEditor(false)} />
      )}

      {/* Collaborative Map */}
      {showCollabMap && (
        <CollaborativeMap onClose={() => setShowCollabMap(false)} />
      )}

      {/* Monitor Sandbox */}
      {showSandbox && (
        <MonitorSandbox onClose={() => setShowSandbox(false)} />
      )}

      {/* Advanced Analytics */}
      {showAdvancedAnalytics && (
        <AdvancedAnalyticsDashboard onClose={() => setShowAdvancedAnalytics(false)} />
      )}

      {/* API Documentation */}
      {showApiDocs && (
        <ApiDocs onClose={() => setShowApiDocs(false)} />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onClose={() => setShowOnboarding(false)} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Global Search */}
      {showSearch && (
        <GlobalSearch onClose={() => setShowSearch(false)} />
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
