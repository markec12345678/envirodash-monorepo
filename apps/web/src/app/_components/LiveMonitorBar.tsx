'use client'

import { useLiveEarthquakes, useLiveTsunami, useLiveAirQuality } from '@/hooks/use-data-stream'
import { Activity, Waves, Wind, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LiveBarProps {
  country?: string
}

export function LiveMonitorBar({ country = 'SI' }: LiveBarProps) {
  const earthquakes = useLiveEarthquakes()
  const tsunami = useLiveTsunami()
  const airQuality = useLiveAirQuality(country)

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const maxMag = earthquakes.data?.results?.reduce((max: number, q: any) => Math.max(max, q.value || 0), 0) || 0
  const aqiData = airQuality.data?.results?.[0]
  const tsunamiCount = tsunami.data?.count || 0

  const connected = earthquakes.lastUpdate !== null

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b bg-zinc-900 px-4 py-1.5 text-white">
      {/* Live indicator */}
      <div className="flex shrink-0 items-center gap-1.5">
        {connected ? (
          <><Wifi className="h-3 w-3 text-emerald-400" /><span className="text-[9px] font-bold text-emerald-400">LIVE</span></>
        ) : (
          <><WifiOff className="h-3 w-3 text-zinc-500" /><span className="text-[9px] text-zinc-500">CONNECTING</span></>
        )}
      </div>

      <div className="h-3 w-px bg-zinc-700" />

      {/* Earthquakes */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Activity className="h-3 w-3 text-amber-400" />
        {earthquakes.loading ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-500" />
        ) : (
          <span className="text-[10px]">
            <span className="font-bold text-amber-400">M{maxMag.toFixed(1)}</span>
            <span className="text-zinc-500"> · {earthquakes.data?.count || 0} quakes</span>
          </span>
        )}
      </div>

      <div className="h-3 w-px bg-zinc-700" />

      {/* Tsunami */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Waves className="h-3 w-3 text-cyan-400" />
        <span className="text-[10px]">
          {tsunamiCount > 0 ? (
            <span className="font-bold text-red-400">{tsunamiCount} ALERTS</span>
          ) : (
            <span className="text-zinc-500">No tsunami</span>
          )}
        </span>
      </div>

      <div className="h-3 w-px bg-zinc-700" />

      {/* Air Quality */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Wind className="h-3 w-3 text-emerald-400" />
        {aqiData ? (
          <span className="text-[10px]">
            <span className="font-bold" style={{
              color: aqiData.status === 'critical' ? '#ef4444'
                : aqiData.status === 'warning' ? '#f59e0b'
                : aqiData.status === 'moderate' ? '#3b82f6'
                : '#10b981'
            }}>
              AQI {aqiData.value}
            </span>
            <span className="text-zinc-500"> · {aqiData.name}</span>
          </span>
        ) : (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-500" />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clock */}
      <div className="shrink-0 text-[10px] tabular-nums text-zinc-400">
        {now.toLocaleTimeString()}
      </div>

      {/* Last update */}
      {earthquakes.lastUpdate && (
        <div className="shrink-0 text-[9px] text-zinc-600">
          Updated {Math.floor((Date.now() - earthquakes.lastUpdate.getTime()) / 1000)}s ago
        </div>
      )}
    </div>
  )
}

export default LiveMonitorBar
