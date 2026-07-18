'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { useServiceWorker } from '@/hooks/use-service-worker'

export function PWAInstallBanner() {
  const { installPrompt, isInstalled, promptInstall } = useServiceWorker()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  // Auto-dismiss after 30 seconds if no action
  useEffect(() => {
    if (!installPrompt) return
    const timer = setTimeout(() => setDismissed(true), 30000)
    return () => clearTimeout(timer)
  }, [installPrompt])

  if (isInstalled || dismissed || !installPrompt) return null

  const handleInstall = async () => {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    if (outcome === 'dismissed') setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[85] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500 bg-white p-3 shadow-2xl dark:bg-zinc-900">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Install EnviroDash</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Get real-time environmental alerts on your device
          </p>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default PWAInstallBanner
