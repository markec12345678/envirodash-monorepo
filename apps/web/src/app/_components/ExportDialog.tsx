'use client'

import { useState } from 'react'
import { Download, X, FileJson, FileText, Loader2 } from 'lucide-react'

interface ExportDialogProps {
  onClose?: () => void
}

interface ExportOption {
  type: string
  label: string
  description: string
  defaultParams: Record<string, string>
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: 'air-quality',
    label: 'Air Quality (current)',
    description: 'PM2.5, PM10, AQI for Slovenian cities',
    defaultParams: { country: 'SI' },
  },
  {
    type: 'wildfire',
    label: 'Wildfire Risk (Europe)',
    description: 'Fire Weather Index for European cities',
    defaultParams: { area: 'europe' },
  },
  {
    type: 'earthquake',
    label: 'Earthquakes (24h)',
    description: 'M2.5+ earthquakes from USGS',
    defaultParams: { limit: '50' },
  },
  {
    type: 'tsunami',
    label: 'Tsunami Warnings',
    description: 'Active tsunami warnings from NOAA',
    defaultParams: {},
  },
  {
    type: 'volcano',
    label: 'Volcano Alerts',
    description: 'USGS volcano alerts worldwide',
    defaultParams: {},
  },
  {
    type: 'history',
    label: 'Air Quality History (7 days)',
    description: 'Hourly AQI time series for Ljubljana',
    defaultParams: { lat: '46.0569', lng: '14.5058', days: '7' },
  },
]

export function ExportDialog({ onClose }: ExportDialogProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleExport = async (option: ExportOption, format: 'csv' | 'json') => {
    setLoading(`${option.type}-${format}`)
    const params = new URLSearchParams({ format, type: option.type, ...option.defaultParams })
    // Trigger download via redirect
    window.location.href = `/api/export?${params}`
    setTimeout(() => setLoading(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">📥 Export Environmental Data</h2>
              <p className="text-xs text-emerald-100">Download as CSV or JSON for analysis</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <ul className="space-y-3">
            {EXPORT_OPTIONS.map((opt) => (
              <li key={opt.type} className="rounded-lg border p-3 dark:border-zinc-700">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold">{opt.label}</h3>
                    <p className="text-xs text-zinc-500">{opt.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport(opt, 'csv')}
                    disabled={loading === `${opt.type}-csv`}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading === `${opt.type}-csv` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport(opt, 'json')}
                    disabled={loading === `${opt.type}-json`}
                    className="flex items-center gap-1.5 rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-600"
                  >
                    {loading === `${opt.type}-json` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileJson className="h-3 w-3" />
                    )}
                    JSON
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            <strong>Programmatic access:</strong>
            <pre className="mt-1 overflow-x-auto text-[10px]">
{`curl -o air-quality.csv "http://localhost:3000/api/export?format=csv&type=air-quality&country=SI"
curl -o earthquakes.json "http://localhost:3000/api/export?format=json&type=earthquake&limit=50"`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog
