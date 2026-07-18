'use client'

import { Droplets, X, AlertTriangle } from 'lucide-react'

export interface FloodMonitorProps {
  onClose?: () => void
  showClose?: boolean
}

export function FloodMonitor({ onClose, showClose = true }: FloodMonitorProps) {
  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-sky-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🌊 Flood Risk</h2>
              <p className="text-xs text-sky-100">Coming in v1.1</p>
            </div>
          </div>
          {showClose && (
            <button onClick={onClose} className="rounded-md p-1.5 text-white hover:bg-white/20" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          <strong>Planned for v1.1</strong>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          This monitor will track flood risk using GloFAS (Global Flood Awareness System) and Copernicus EMS.
          Coverage will include river discharge, precipitation forecasts, and flood extent maps.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-500">
          <li>• River discharge anomalies</li>
          <li>• 7-day flood forecast</li>
          <li>• Historical flood events</li>
          <li>• Flash flood guidance</li>
        </ul>
        <p className="mt-4 text-[10px] text-zinc-400">Source: GloFAS / Copernicus EMS (planned) · Status: development</p>
      </div>
    </div>
  )
}

export default FloodMonitor
