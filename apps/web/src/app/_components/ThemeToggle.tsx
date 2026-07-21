'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('envirodash-theme') as Theme || 'system'
    setTheme(saved)
    setMounted(true)
    applyTheme(saved)
  }, [])

  const applyTheme = (t: Theme) => {
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }

  const cycle = () => {
    const order: Theme[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
    localStorage.setItem('envirodash-theme', next)
    applyTheme(next)
  }

  if (!mounted) return <div className="h-8 w-8" />

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={cycle}
      className="flex items-center justify-center rounded-lg bg-zinc-100 p-1.5 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
      title={`Theme: ${theme} (click to cycle)`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export default ThemeToggle
