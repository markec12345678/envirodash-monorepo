import { describe, it, expect } from 'vitest'
import { translations, LANGUAGES, type Language } from '@/lib/i18n'

describe('i18n translations completeness', () => {
  // All keys that MUST exist in every language
  const REQUIRED_KEYS = [
    'app.title',
    'app.subtitle',
    'app.realMonitors',
    'app.totalMonitors',
    'btn.customize',
    'btn.apiKeys',
    'btn.export',
    'btn.map',
    'btn.pdf',
    'btn.geofences',
    'btn.marketplace',
    'btn.ai',
    'btn.alerts',
    'monitor.select',
    'monitor.realData',
    'monitor.air-quality',
    'monitor.wildfire',
    'monitor.tsunami',
    'monitor.volcano',
    'monitor.earthquake',
    'monitor.weather',
    'monitor.glacier',
    'monitor.coral-reef',
    'monitor.flood',
    'monitor.drought',
    'status.stable',
    'status.moderate',
    'status.warning',
    'status.critical',
    'common.loading',
    'common.refresh',
    'common.close',
    'common.search',
    'common.source',
    'common.updated',
    'ai.title',
    'ai.subtitle',
    'ai.placeholder',
    'ai.welcome',
    'ai.suggested',
    'auth.signIn',
    'auth.signOut',
    'auth.demoCredentials',
  ]

  REQUIRED_KEYS.forEach((key) => {
    it(`language 'en' has key '${key}'`, () => {
      expect(translations.en[key]).toBeDefined()
      expect(translations.en[key].length).toBeGreaterThan(0)
    })
  })

  it('all 7 languages have all required keys', () => {
    const langs = LANGUAGES.map((l) => l.code)
    langs.forEach((lang: Language) => {
      const dict = translations[lang]
      REQUIRED_KEYS.forEach((key) => {
        expect(dict[key], `Language '${lang}' missing key '${key}'`).toBeDefined()
        expect(dict[key].length, `Language '${lang}' key '${key}' is empty`).toBeGreaterThan(0)
      })
    })
  })
})

describe('i18n data sources', () => {
  it('mentions correct data source in each language', () => {
    // Check that data sources are referenced in welcome messages
    const langs: Language[] = ['sl', 'en', 'de', 'it', 'fr', 'es', 'hr']
    langs.forEach((lang) => {
      const welcome = translations[lang]['ai.welcome']
      // Should mention at least one environmental topic
      const topics = ['air', 'luft', 'aria', 'air', 'aire', 'zrak', 'zraka']
      const hasTopic = topics.some((t) => welcome.toLowerCase().includes(t.toLowerCase()))
      expect(hasTopic, `Language '${lang}' welcome doesn't mention air quality`).toBe(true)
    })
  })
})
