'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Language, DEFAULT_LANGUAGE, t as translate } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANGUAGE,
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('envirodash-lang') as Language | null
    if (saved) {
      setLangState(saved)
    } else {
      // Detect from browser
      const browser = navigator.language.slice(0, 2).toLowerCase() as Language
      if (['sl', 'en', 'de', 'it', 'fr', 'es', 'hr'].includes(browser)) {
        setLangState(browser as Language)
      }
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('envirodash-lang', newLang)
  }

  const t = (key: string) => translate(lang, key)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
