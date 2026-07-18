'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { MapPin, Plus, Trash2, X, Loader2, AlertTriangle, Shield, Bell } from 'lucide-react'

interface Geofence {
  id: string
  name: string
  lat: number
  lng: number
  radiusKm: number
  thresholds: {
    aqi?: number
    fwi?: number
    magnitude?: number
    sst?: number
  }
  createdAt: string
}

const PRESETS = [
  { name: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
  { name: 'Maribor', lat: 46.5547, lng: 15.6459 },
  { name: 'Koper', lat: 45.5481, lng: 13.7300 },
  { name: 'Celje', lat: 46.2389, lng: 15.2675 },
  { name: 'Novo Mesto', lat: 45.8039, lng: 15.1687 },
  { name: 'Zagreb', lat: 45.815, lng: 15.9819 },
  { name: 'Trieste', lat: 45.6495, lng: 13.7768 },
  { name: 'Graz', lat: 47.0707, lng: 15.4395 },
]

export function GeofenceManager({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('50')
  const [aqiThreshold, setAqiThreshold] = useState('150')
  const [fwiThreshold, setFwiThreshold] = useState('50')
  const [magThreshold, setMagThreshold] = useState('5')

  const load = async () => {
    if (!session) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/user/geofences')
      if (res.ok) {
        const data = await res.json()
        setGeofences(data.geofences || [])
      }
    } catch (e) {
      console.error('Geofence load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [session])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/user/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radiusKm: parseFloat(radius),
          thresholds: {
            aqi: parseInt(aqiThreshold),
            fwi: parseInt(fwiThreshold),
            magnitude: parseFloat(magThreshold),
          },
        }),
      })
      if (res.ok) {
        await load()
        setShowAdd(false)
        setName(''); setLat(''); setLng(''); setRadius('50')
        setAqiThreshold('150'); setFwiThreshold('50'); setMagThreshold('5')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/user/geofences?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await load()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name)
    setLat(String(preset.lat))
    setLng(String(preset.lng))
  }

  return (
    <div className="fixed right-4 top-16 z-[60] flex max-h-[85vh] w-[400px] flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🛡️ Geofences</h2>
              <p className="text-xs text-emerald-100">Saved locations with alert thresholds</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="rounded-md bg-white/20 p-1.5 text-white hover:bg-white/30"
              aria-label="Add geofence"
            >
              <Plus className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-md p-1.5 text-white hover:bg-white/20" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Bell className="mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm font-medium">Sign in to create geofences</p>
            <p className="mt-1 text-xs">Get alerts when environmental conditions exceed your thresholds in saved locations.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {showAdd && (
              <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                <h3 className="mb-3 text-sm font-bold">Add new geofence</h3>

                <div className="mb-3">
                  <label className="mb-1 block text-[10px] font-medium text-zinc-700 dark:text-zinc-300">Quick presets</label>
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-700 hover:bg-emerald-100 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Location name (e.g. Home)"
                  required
                  className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="Latitude"
                    required
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="Longitude"
                    required
                    type="number"
                    step="0.0001"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <input
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="Radius (km)"
                  type="number"
                  className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />

                <div className="mt-3 border-t pt-2">
                  <p className="mb-1 text-[10px] font-medium text-zinc-700 dark:text-zinc-300">Alert thresholds (notify when exceeded)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500">AQI &gt;</label>
                      <input value={aqiThreshold} onChange={(e) => setAqiThreshold(e.target.value)} type="number" className="w-full rounded border border-zinc-200 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500">FWI &gt;</label>
                      <input value={fwiThreshold} onChange={(e) => setFwiThreshold(e.target.value)} type="number" className="w-full rounded border border-zinc-200 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500">Mag &gt;</label>
                      <input value={magThreshold} onChange={(e) => setMagThreshold(e.target.value)} type="number" step="0.1" className="w-full rounded border border-zinc-200 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create Geofence
                </button>
              </form>
            )}

            {geofences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <MapPin className="mb-2 h-12 w-12 text-zinc-400" />
                <p className="text-sm font-medium">No geofences yet</p>
                <p className="mt-1 text-xs">Click + to add your first saved location.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {geofences.map((g) => (
                  <li key={g.id} className="rounded-lg border bg-white p-3 dark:bg-zinc-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span className="text-sm font-bold">{g.name}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          {g.lat.toFixed(4)}, {g.lng.toFixed(4)} · radius {g.radiusKm} km
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(g.id)}
                        disabled={actionLoading}
                        className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {g.thresholds.aqi != null && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          AQI &gt; {g.thresholds.aqi}
                        </span>
                      )}
                      {g.thresholds.fwi != null && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                          FWI &gt; {g.thresholds.fwi}
                        </span>
                      )}
                      {g.thresholds.magnitude != null && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                          Mag &gt; {g.thresholds.magnitude}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[9px] text-zinc-400">
                      Created {new Date(g.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default GeofenceManager
