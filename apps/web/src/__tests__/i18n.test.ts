import { describe, it, expect } from 'vitest'
import { translations, t, LANGUAGES, DEFAULT_LANGUAGE, type Language } from '@/lib/i18n'

describe('translations', () => {
  it('has 7 languages', () => {
    expect(LANGUAGES).toHaveLength(7)
    const codes = LANGUAGES.map((l) => l.code)
    expect(codes).toEqual(['sl', 'en', 'de', 'it', 'fr', 'es', 'hr'])
  })

  it('has Slovenian as default', () => {
    expect(DEFAULT_LANGUAGE).toBe('sl')
  })

  it('all languages have flags and names', () => {
    LANGUAGES.forEach((lang) => {
      expect(lang.flag).toMatch(/^[\u{1F1E6}-\u{1F1FF}]{2}$/u)
      expect(lang.name.length).toBeGreaterThan(2)
    })
  })

  it('all languages have the same set of keys', () => {
    const slKeys = Object.keys(translations.sl).sort()
    Object.entries(translations).forEach(([lang, dict]) => {
      const langKeys = Object.keys(dict).sort()
      expect(langKeys, `Language ${lang} keys mismatch`).toEqual(slKeys)
    })
  })

  it('has at least 40 translation keys per language', () => {
    Object.entries(translations).forEach(([lang, dict]) => {
      const keyCount = Object.keys(dict).length
      expect(keyCount, `Language ${lang} has too few keys`).toBeGreaterThanOrEqual(40)
    })
  })
})

describe('t function', () => {
  it('translates known keys', () => {
    expect(t('sl', 'app.title')).toBe('EnviroDash')
    expect(t('en', 'btn.ai')).toBe('AI')
    expect(t('de', 'btn.ai')).toBe('KI')
    expect(t('fr', 'btn.ai')).toBe('IA')
    expect(t('es', 'btn.ai')).toBe('IA')
  })

  it('falls back to English for unknown language', () => {
    // @ts-expect-error - test invalid language
    expect(t('xx', 'app.title')).toBe('EnviroDash')
  })

  it('falls back to key itself for unknown translation key', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key')
    expect(t('sl', 'totally.made.up')).toBe('totally.made.up')
  })

  it('returns correct monitor names per language', () => {
    expect(t('sl', 'monitor.air-quality')).toBe('Kakovost zraka')
    expect(t('en', 'monitor.air-quality')).toBe('Air Quality')
    expect(t('de', 'monitor.air-quality')).toBe('Luftqualität')
    expect(t('it', 'monitor.air-quality')).toBe("Qualità dell'aria")
    expect(t('fr', 'monitor.air-quality')).toBe("Qualité de l'air")
    expect(t('es', 'monitor.air-quality')).toBe('Calidad del aire')
    expect(t('hr', 'monitor.air-quality')).toBe('Kakvoća zraka')
  })

  it('returns correct status labels per language', () => {
    expect(t('sl', 'status.critical')).toBe('Kritično')
    expect(t('en', 'status.critical')).toBe('Critical')
    expect(t('de', 'status.critical')).toBe('Kritisch')
    expect(t('it', 'status.critical')).toBe('Critico')
    expect(t('fr', 'status.critical')).toBe('Critique')
    expect(t('es', 'status.critical')).toBe('Crítico')
    expect(t('hr', 'status.critical')).toBe('Kritično')
  })
})
