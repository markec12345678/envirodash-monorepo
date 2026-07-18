'use client'

import { WifiOff, Wifi } from 'lucide-react'
import { useServiceWorker } from '@/hooks/use-service-worker'

export function OfflineIndicator() {
  const { isOnline } = useServiceWorker()

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-[85] -translate-x-1/2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 shadow-lg dark:bg-amber-950/80">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          You're offline — showing cached data
        </span>
      </div>
    </div>
  )
}

export function OnlineIndicator() {
  const { isOnline } = useServiceWorker()

  if (!isOnline) return null

  // Only show briefly when reconnecting (transient)
  return null
}

export default OfflineIndicator
