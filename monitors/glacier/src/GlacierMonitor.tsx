'use client'

import { Snowflake, X, AlertTriangle } from 'lucide-react'

export interface GlacierMonitorProps {
  onClose?: () => void
  showClose?: boolean
}

export function GlacierMonitor({ onClose, showClose = true }: GlacierMonitorProps) {
  return (
    <div className="fixed right-4 top-16 z-[60] w-[380px] max-h-[85vh] overflow-hidden rounded-xl border-2 border-cyan-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      <div className="bg-gradient-to-r from-cyan-500 to-teal-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🏔️ Glacier</h2>
              <p className="text-xs text-cyan-100">Coming in v1.1</p>
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
          This monitor will track glacier retreat using the GLIMS (Global Land Ice Measurements from Space) database.
          Coverage will include the Alps, Himalayas, Andes, Arctic, and Antarctic regions.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-500">
          <li>• Real-time mass balance data</li>
          <li>• Annual retreat rates</li>
          <li>• Historical satellite imagery</li>
          <li>• Climate correlation analysis</li>
        </ul>
        <p className="mt-4 text-[10px] text-zinc-400">
          Source: GLIMS database (planned) · Status: development
        </p>
      </div>
    </div>
  )
}

export default GlacierMonitor
