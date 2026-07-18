'use client'

import { lazy, Suspense } from 'react'

// Lazy-load the original MotoTrack component (preserves 867 monitors without bloating the monorepo)
const Original = lazy(() => import('./original'))

export interface CraftBeerHomebrewShopMonitorProps {
  onClose?: () => void
  showClose?: boolean
}

export function CraftBeerHomebrewShopMonitor({ onClose, showClose = true }: CraftBeerHomebrewShopMonitorProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>}>
      <Original onClose={onClose} showClose={showClose} />
    </Suspense>
  )
}

export default CraftBeerHomebrewShopMonitor
