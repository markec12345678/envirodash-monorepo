'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, X, Globe, Bell, Shield, Key, Mail, Webhook, Code2, BarChart3, MapPin, Palette, Database, Save } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { LANGUAGES } from '@/lib/i18n'

type Tab = 'general' | 'alerts' | 'security' | 'developer' | 'data' | 'appearance'

const TABS: { id: Tab; label: string; icon: any; color: string }[] = [
  { id: 'general', label: 'General', icon: Globe, color: 'text-blue-600' },
  { id: 'alerts', label: 'Alerts', icon: Bell, color: 'text-amber-600' },
  { id: 'security', label: 'Security', icon: Shield, color: 'text-emerald-600' },
  { id: 'developer', label: 'Developer', icon: Key, color: 'text-violet-600' },
  { id: 'data', label: 'Data & Privacy', icon: Database, color: 'text-rose-600' },
  { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-pink-600' },
]

export function SettingsPanel({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const { lang, setLang } = useLanguage()
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)

  // Settings state
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [desktopNotif, setDesktopNotif] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [minSeverity, setMinSeverity] = useState<'warning' | 'critical'>('warning')
  const [shareAnalytics, setShareAnalytics] = useState(true)
  const [cacheTimeout, setCacheTimeout] = useState('300')

  const save = () => {
    localStorage.setItem('envirodash-units', units)
    localStorage.setItem('envirodash-theme', theme)
    localStorage.setItem('envirodash-desktop-notif', String(desktopNotif))
    localStorage.setItem('envirodash-sound', String(soundEnabled))
    localStorage.setItem('envirodash-min-severity', minSeverity)
    localStorage.setItem('envirodash-share-analytics', String(shareAnalytics))
    localStorage.setItem('envirodash-cache-timeout', cacheTimeout)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h2 className="text-lg font-bold">⚙️ Settings</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r p-2 dark:border-zinc-700">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${tab === t.id ? 'text-emerald-600' : t.color}`} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'general' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-zinc-500">General Settings</h3>

                <div>
                  <label className="mb-1 block text-xs font-medium">Language</label>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as any)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Measurement units</label>
                  <div className="flex gap-2">
                    {(['metric', 'imperial'] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setUnits(u)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                          units === u
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                            : 'border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {u === 'metric' ? 'Metric (°C, km, m)' : 'Imperial (°F, mi, ft)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Default location</label>
                  <p className="text-xs text-zinc-500">Set via Geofences panel</p>
                </div>
              </div>
            )}

            {tab === 'alerts' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-zinc-500">Alert Preferences</h3>

                <Toggle
                  label="Desktop notifications"
                  desc="Show browser notifications for new alerts"
                  checked={desktopNotif}
                  onChange={setDesktopNotif}
                />

                <Toggle
                  label="Sound alerts"
                  desc="Play a sound when critical alert arrives"
                  checked={soundEnabled}
                  onChange={setSoundEnabled}
                />

                <div>
                  <label className="mb-1 block text-xs font-medium">Minimum severity</label>
                  <select
                    value={minSeverity}
                    onChange={(e) => setMinSeverity(e.target.value as any)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="warning">Warning + Critical</option>
                    <option value="critical">Critical only</option>
                  </select>
                </div>

                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                  💡 Configure specific alert channels (email, push, webhooks) using the dedicated panels in the header.
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-zinc-500">Security</h3>

                {session?.user ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Signed in as</p>
                          <p className="text-xs text-zinc-500">{(session.user as any).email}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {(session.user as any).plan || 'free'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border p-2 dark:border-zinc-700">
                        <p className="text-zinc-500">Role</p>
                        <p className="font-medium">{(session.user as any).role || 'user'}</p>
                      </div>
                      <div className="rounded-lg border p-2 dark:border-zinc-700">
                        <p className="text-zinc-500">Tenant</p>
                        <p className="font-medium truncate">{(session.user as any).tenantId || 'default'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Sign in to manage security settings</p>
                )}

                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  🔐 SSO/SAML enterprise login available. Configure GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, or SAML_IDP_METADATA_URL in .env
                </div>
              </div>
            )}

            {tab === 'developer' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-zinc-500">Developer Settings</h3>

                <div>
                  <label className="mb-1 block text-xs font-medium">API cache timeout (seconds)</label>
                  <input
                    value={cacheTimeout}
                    onChange={(e) => setCacheTimeout(e.target.value)}
                    type="number"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium">Quick links:</p>
                  {[
                    { label: 'API Keys', icon: Key, desc: 'Manage developer API keys' },
                    { label: 'Webhooks', icon: Webhook, desc: 'Configure HMAC-signed webhooks' },
                    { label: 'API Documentation', icon: Code2, desc: '28 endpoints documented' },
                    { label: 'Code Editor', icon: Code2, desc: 'Create custom monitors' },
                    { label: 'Monitor Sandbox', icon: BarChart3, desc: 'Browse community monitors' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="flex items-center gap-2 rounded-lg border p-2 dark:border-zinc-700">
                        <Icon className="h-4 w-4 text-zinc-400" />
                        <div className="flex-1">
                          <p className="text-xs font-medium">{item.label}</p>
                          <p className="text-[10px] text-zinc-500">{item.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-zinc-500">Data & Privacy</h3>

                <Toggle
                  label="Share anonymous analytics"
                  desc="Help improve EnviroDash by sharing anonymous usage data"
                  checked={shareAnalytics}
                  onChange={setShareAnalytics}
                />

                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                  🔒 Privacy-first analytics. No cookies, no cross-site tracking, IP addresses are anonymized.
                  Data is stored locally and never sold to third parties.
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium">Your data:</p>
                  {[
                    { label: 'Dashboard config', size: '~2 KB' },
                    { label: 'Geofences', size: '~1 KB per geofence' },
                    { label: 'API keys (hashed)', size: '~0.5 KB per key' },
                    { label: 'Webhooks', size: '~1 KB per webhook' },
                    { label: 'Email subscriptions', size: '~0.5 KB per subscription' },
                    { label: 'Push tokens', size: '~0.5 KB per device' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                      <span className="text-zinc-400">{item.size}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
                  onClick={() => {
                    if (confirm('Delete ALL your data? This cannot be undone.')) {
                      localStorage.clear()
                      alert('Local data cleared. Server data requires account deletion.')
                    }
                  }}
                >
                  🗑️ Clear all local data
                </button>
              </div>
            )}

            {tab === 'appearance' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-zinc-500">Appearance</h3>

                <div>
                  <label className="mb-1 block text-xs font-medium">Theme</label>
                  <div className="flex gap-2">
                    {(['system', 'light', 'dark'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize ${
                          theme === t
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                            : 'border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Accent color</label>
                  <div className="flex flex-wrap gap-2">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'].map((c) => (
                      <button
                        key={c}
                        className="h-8 w-8 rounded-full border-2 border-white shadow dark:border-zinc-700"
                        style={{ backgroundColor: c }}
                        onClick={() => localStorage.setItem('envirodash-accent', c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t p-4 dark:border-zinc-700">
          <p className="text-[10px] text-zinc-400">
            EnviroDash v1.0 · Settings stored locally
          </p>
          <button
            onClick={save}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold text-white transition-colors ${
              saved ? 'bg-emerald-600' : 'bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900'
            }`}
          >
            {saved ? <><Save className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 dark:border-zinc-700">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-zinc-500">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export default SettingsPanel
