'use client'

import { useState, useRef } from 'react'
import { Eye, X, Loader2, Upload, Send, Image as ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react'

const ANALYSIS_TYPES = [
  { id: 'wildfire', label: 'Wildfire', icon: '🔥', color: 'bg-orange-100 text-orange-700' },
  { id: 'volcano', label: 'Volcano', icon: '🌋', color: 'bg-rose-100 text-rose-700' },
  { id: 'flood', label: 'Flood', icon: '🌊', color: 'bg-sky-100 text-sky-700' },
  { id: 'glacier', label: 'Glacier', icon: '🏔️', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'coral-reef', label: 'Coral Reef', icon: '🐠', color: 'bg-pink-100 text-pink-700' },
  { id: 'general', label: 'General', icon: '🌍', color: 'bg-emerald-100 text-emerald-700' },
]

const SAMPLE_IMAGES = [
  {
    type: 'wildfire',
    label: 'California Wildfire',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Camp_fire_nov_8_2018.lpg',
  },
  {
    type: 'volcano',
    label: 'Volcanic Eruption',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Eyjafjallaj%C3%B6kull_volcanic_ash.jpg',
  },
  {
    type: 'flood',
    label: 'Flooded Area',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Flood_satellite_image.jpg',
  },
]

export function VisionAnalyzer({ onClose }: { onClose?: () => void }) {
  const [imageUrl, setImageUrl] = useState('')
  const [type, setType] = useState('general')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl && !previewUrl) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const imageToAnalyze = previewUrl || imageUrl
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageToAnalyze,
          type,
          location: location || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setPreviewUrl(base64)
      setImageUrl('')
    }
    reader.readAsDataURL(file)
  }

  const useSampleImage = (sample: typeof SAMPLE_IMAGES[0]) => {
    setImageUrl(sample.url)
    setPreviewUrl(sample.url)
    setType(sample.type)
  }

  return (
    <div className="fixed right-4 top-16 z-[60] flex max-h-[85vh] w-[440px] flex-col overflow-hidden rounded-xl border-2 border-fuchsia-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">🛰️ AI Vision</h2>
              <p className="text-xs text-fuchsia-100">Satellite imagery analysis (VLM)</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Analysis type selector */}
        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Analysis type
        </label>
        <div className="mb-3 flex flex-wrap gap-1">
          {ANALYSIS_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
                type === t.id
                  ? 'bg-fuchsia-600 text-white'
                  : `border border-zinc-200 ${t.color} dark:border-zinc-700`
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Sample images */}
        <div className="mb-3">
          <p className="mb-1 text-[10px] text-zinc-500">Sample images:</p>
          <div className="flex flex-wrap gap-1">
            {SAMPLE_IMAGES.map((s) => (
              <button
                key={s.label}
                onClick={() => useSampleImage(s)}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image input */}
        <form onSubmit={analyze} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Image URL or upload
            </label>
            <div className="flex gap-2">
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value)
                  setPreviewUrl(null)
                }}
                placeholder="https://example.com/satellite.jpg"
                className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <Upload className="h-3 w-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional, e.g. Ljubljana, Slovenia)"
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />

          {/* Image preview */}
          {previewUrl && (
            <div className="overflow-hidden rounded-lg border">
              <img src={previewUrl} alt="Preview" className="max-h-48 w-full object-cover" />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!imageUrl && !previewUrl)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-3 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-50/50 p-3 dark:bg-fuchsia-950/20">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-fuchsia-600" />
              <span className="text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300">
                Analysis Complete ({result.model})
              </span>
            </div>

            {result.analysis && typeof result.analysis === 'object' ? (
              <div className="space-y-1.5">
                {Object.entries(result.analysis).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatKey(key)}:
                    </span>{' '}
                    {Array.isArray(value) ? (
                      <ul className="ml-4 list-disc">
                        {(value as string[]).map((v, i) => (
                          <li key={i} className="text-zinc-600 dark:text-zinc-400">{String(v)}</li>
                        ))}
                      </ul>
                    ) : typeof value === 'boolean' ? (
                      <span className={value ? 'text-emerald-600' : 'text-red-500'}>
                        {value ? '✓ Yes' : '✗ No'}
                      </span>
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-400">{String(value)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="overflow-x-auto rounded bg-white p-2 text-[10px] dark:bg-zinc-900">
                {result.analysis?.rawResponse || JSON.stringify(result, null, 2)}
              </pre>
            )}

            <p className="mt-2 text-[9px] text-zinc-400">
              Type: {result.type} · {new Date(result.analyzedAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* Info box */}
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-2 text-[10px] text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          <strong>🛰️ AI Vision</strong> uses ZAI Vision Language Model to analyze satellite and aerial
          imagery. Upload or link an image of an environmental event (wildfire, flood, volcanic eruption,
          glacier, coral reef) for AI-powered assessment.
        </div>
      </div>
    </div>
  )
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

export default VisionAnalyzer
