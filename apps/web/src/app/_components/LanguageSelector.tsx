'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { LANGUAGES, type Language } from '@/lib/i18n'

export function LanguageSelector() {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        title="Change language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-base leading-none">{current.flag}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <ul className="py-1">
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  onClick={() => {
                    setLang(l.code as Language)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    lang === l.code
                      ? 'bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span className="flex-1">{l.name}</span>
                  {lang === l.code && <span className="text-emerald-500">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default LanguageSelector
