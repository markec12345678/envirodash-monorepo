'use client'

import { X, Search, Settings, Sparkles, Map, Share2, Download, Store, Keyboard, Activity } from 'lucide-react'

interface HelpDialogProps {
  onClose?: () => void
  onAction?: (action: string) => void
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Global Search', icon: Search, handler: 'search' },
  { keys: ['Ctrl', ','], action: 'Settings', icon: Settings, handler: 'settings' },
  { keys: ['Ctrl', 'J'], action: 'AI Assistant', icon: Sparkles, handler: 'ai' },
  { keys: ['Ctrl', 'M'], action: 'Map View', icon: Map, handler: 'map' },
  { keys: ['Ctrl', 'L'], action: 'Collaborative Map', icon: Share2, handler: 'collaborate' },
  { keys: ['Ctrl', 'E'], action: 'Export Data', icon: Download, handler: 'export' },
  { keys: ['Ctrl', 'B'], action: 'Marketplace', icon: Store, handler: 'marketplace' },
  { keys: ['Ctrl', 'H'], action: 'This Help', icon: Keyboard, handler: 'help' },
  { keys: ['Esc'], action: 'Close any dialog', icon: X, handler: 'close' },
  { keys: ['1', '-', '0'], action: 'Quick switch to monitor 1-10', icon: Activity, handler: null },
  { keys: ['R'], action: 'Refresh current monitor', icon: Activity, handler: 'refresh' },
  { keys: ['?'], action: 'Show this help', icon: Keyboard, handler: 'help' },
]

const FEATURES = [
  { icon: '🌍', name: '10 Real-time Data Sources', desc: 'Air quality, wildfire, earthquake, tsunami, volcano, weather, glacier, coral reef, flood, drought' },
  { icon: '🤖', name: 'AI Assistant', desc: 'Natural-language queries about environmental data' },
  { icon: '🛰️', name: 'AI Vision (VLM)', desc: 'Satellite imagery analysis for wildfire, volcano, flood, glacier, coral reef' },
  { icon: '🗺️', name: 'Interactive Map', desc: 'MapLibre GL JS with color-coded environmental data' },
  { icon: '🤝', name: 'Collaborative Map', desc: 'Real-time shared map sessions with cursors and chat' },
  { icon: '📊', name: 'Analytics Dashboard', desc: 'Privacy-first analytics with PostHog/Plausible support' },
  { icon: '📈', name: 'Advanced Insights', desc: 'Cohorts, funnels, retention, heatmap analysis' },
  { icon: '🔔', name: '4-Channel Alerts', desc: 'WebSocket, mobile push, email, webhooks' },
  { icon: '📦', name: 'Marketplace', desc: '874 monitor packages (10 real + 864 demo)' },
  { icon: '📝', name: 'Code Editor', desc: 'Create and publish your own monitors' },
  { icon: '🔑', name: 'Developer API', desc: 'REST API v1 with rate limiting and API keys' },
  { icon: '📥', name: 'Data Export', desc: 'CSV/JSON export for all monitor types' },
  { icon: '📄', name: 'PDF Reports', desc: '2-page environmental summary reports' },
  { icon: '💬', name: 'Community Chat', desc: '11 rooms for real-time discussion' },
  { icon: '🛡️', name: 'Geofences', desc: 'Custom alert thresholds for saved locations' },
  { icon: '🌐', name: '7 Languages', desc: 'SL, EN, DE, IT, FR, ES, HR' },
  { icon: '📱', name: 'PWA + Mobile', desc: 'Offline mode, installable, Expo mobile app' },
  { icon: '🔐', name: 'SSO/SAML', desc: 'Google, GitHub, Email, SAML enterprise login' },
]

export function HelpDialog({ onClose, onAction }: HelpDialogProps) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">⌨️ Keyboard Shortcuts & Help</h2>
              <p className="text-xs text-emerald-100">All features and shortcuts in one place</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Shortcuts */}
          <h3 className="mb-3 text-sm font-bold uppercase text-zinc-500">Keyboard Shortcuts</h3>
          <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SHORTCUTS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.action}
                  onClick={() => s.handler && onAction?.(s.handler)}
                  disabled={!s.handler}
                  className="flex items-center gap-3 rounded-lg border p-2 text-left hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="flex-1">
                    <span className="text-xs font-medium">{s.action}</span>
                  </div>
                  <div className="flex gap-1">
                    {s.keys.map((k, i) => (
                      <kbd key={i} className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Features */}
          <h3 className="mb-3 text-sm font-bold uppercase text-zinc-500">All Features ({FEATURES.length})</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.name} className="flex items-start gap-2 rounded-lg border p-2 dark:border-zinc-700">
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-xs font-bold">{f.name}</p>
                  <p className="text-[10px] text-zinc-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="font-bold">💡 Tips:</p>
            <ul className="mt-1 space-y-0.5">
              <li>• Press <kbd className="rounded bg-white px-1 dark:bg-zinc-800">?</kbd> anywhere to open this help</li>
              <li>• Press <kbd className="rounded bg-white px-1 dark:bg-zinc-800">1</kbd>-<kbd className="rounded bg-white px-1 dark:bg-zinc-800">0</kbd> to quickly switch between monitors</li>
              <li>• Use the AI Assistant to ask questions in natural language</li>
              <li>• Install as PWA for offline access and push notifications</li>
              <li>• Create your own monitors with the Code Editor and publish to the community</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-3 text-center dark:border-zinc-700">
          <p className="text-[10px] text-zinc-400">
            EnviroDash v1.0.0 · {FEATURES.length} features · 874 monitors · 5 WebSocket services · 7 languages · MIT License
          </p>
        </div>
      </div>
    </div>
  )
}

export default HelpDialog
