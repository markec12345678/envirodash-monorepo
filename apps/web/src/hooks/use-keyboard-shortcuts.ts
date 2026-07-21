'use client'

import { useEffect, useCallback } from 'react'

/**
 * Keyboard shortcuts hook for EnviroDash.
 *
 * Shortcuts:
 *   Ctrl/Cmd + K     → Global Search
 *   Ctrl/Cmd + ,      → Settings
 *   Ctrl/Cmd + J      → AI Assistant
 *   Ctrl/Cmd + M      → Map
 *   Ctrl/Cmd + L      → Collaborate
 *   Ctrl/Cmd + E      → Export
 *   Ctrl/Cmd + B      → Bookmark/Marketplace
 *   Ctrl/Cmd + H      → Help & Shortcuts
 *   Ctrl/Cmd + /      → Help & Shortcuts
 *   Escape            → Close topmost modal
 *   1-0               → Quick switch to monitor 1-10
 *   g then a          → Air Quality
 *   g then w          → Wildfire
 *   g then e          → Earthquake
 *   g then t          → Tsunami
 *   g then v          → Volcano
 *   r                 → Refresh current monitor
 *   ?                 → Help & Shortcuts
 */

interface ShortcutHandlers {
  onSearch?: () => void
  onSettings?: () => void
  onAI?: () => void
  onMap?: () => void
  onCollaborate?: () => void
  onExport?: () => void
  onMarketplace?: () => void
  onHelp?: () => void
  onClose?: () => void
  onMonitorSelect?: (index: number) => void
  onRefresh?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Escape — always works (close topmost modal)
    if (e.key === 'Escape') {
      handlers.onClose?.()
      return
    }

    // ? — Help (only when not in input)
    if (e.key === '?' && !isInput) {
      e.preventDefault()
      handlers.onHelp?.()
      return
    }

    // Ctrl/Cmd + key shortcuts
    if (mod) {
      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault()
          handlers.onSearch?.()
          break
        case ',':
          e.preventDefault()
          handlers.onSettings?.()
          break
        case 'j':
          e.preventDefault()
          handlers.onAI?.()
          break
        case 'm':
          e.preventDefault()
          handlers.onMap?.()
          break
        case 'l':
          e.preventDefault()
          handlers.onCollaborate?.()
          break
        case 'e':
          e.preventDefault()
          handlers.onExport?.()
          break
        case 'b':
          e.preventDefault()
          handlers.onMarketplace?.()
          break
        case 'h':
        case '/':
          e.preventDefault()
          handlers.onHelp?.()
          break
      }
      return
    }

    // Number keys 1-0 → quick monitor switch (only when not in input)
    if (!isInput && e.key >= '0' && e.key <= '9') {
      const index = e.key === '0' ? 9 : parseInt(e.key) - 1
      handlers.onMonitorSelect?.(index)
      return
    }

    // r → refresh (only when not in input)
    if (!isInput && e.key.toLowerCase() === 'r') {
      handlers.onRefresh?.()
      return
    }
  }, [handlers])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
