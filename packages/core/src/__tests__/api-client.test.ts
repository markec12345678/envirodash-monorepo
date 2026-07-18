import { describe, it, expect } from 'vitest'
import {
  aqiToStatus,
  fwiToStatus,
  STATUS_COLORS,
  STATUS_LABELS_EN,
  STATUS_LABELS_SL,
} from '../api-client'

describe('aqiToStatus', () => {
  it('returns "stable" for null/undefined AQI', () => {
    expect(aqiToStatus(null)).toBe('stable')
    expect(aqiToStatus(undefined)).toBe('stable')
  })

  it('returns "stable" for AQI 0-50 (Good)', () => {
    expect(aqiToStatus(0)).toBe('stable')
    expect(aqiToStatus(25)).toBe('stable')
    expect(aqiToStatus(50)).toBe('stable')
  })

  it('returns "moderate" for AQI 51-100', () => {
    expect(aqiToStatus(51)).toBe('moderate')
    expect(aqiToStatus(75)).toBe('moderate')
    expect(aqiToStatus(100)).toBe('moderate')
  })

  it('returns "warning" for AQI 101-150 (Unhealthy for sensitive)', () => {
    expect(aqiToStatus(101)).toBe('warning')
    expect(aqiToStatus(125)).toBe('warning')
    expect(aqiToStatus(150)).toBe('warning')
  })

  it('returns "critical" for AQI 151+ (Unhealthy+)', () => {
    expect(aqiToStatus(151)).toBe('critical')
    expect(aqiToStatus(200)).toBe('critical')
    expect(aqiToStatus(300)).toBe('critical')
    expect(aqiToStatus(500)).toBe('critical')
  })
})

describe('fwiToStatus', () => {
  it('returns "stable" for null/undefined FWI', () => {
    expect(fwiToStatus(null)).toBe('stable')
    expect(fwiToStatus(undefined)).toBe('stable')
  })

  it('returns "stable" for FWI 0-19 (Low risk)', () => {
    expect(fwiToStatus(0)).toBe('stable')
    expect(fwiToStatus(10)).toBe('stable')
    expect(fwiToStatus(19)).toBe('stable')
  })

  it('returns "moderate" for FWI 20-39', () => {
    expect(fwiToStatus(20)).toBe('moderate')
    expect(fwiToStatus(30)).toBe('moderate')
    expect(fwiToStatus(39)).toBe('moderate')
  })

  it('returns "warning" for FWI 40-64 (High risk)', () => {
    expect(fwiToStatus(40)).toBe('warning')
    expect(fwiToStatus(50)).toBe('warning')
    expect(fwiToStatus(64)).toBe('warning')
  })

  it('returns "critical" for FWI 65+ (Extreme risk)', () => {
    expect(fwiToStatus(65)).toBe('critical')
    expect(fwiToStatus(80)).toBe('critical')
    expect(fwiToStatus(100)).toBe('critical')
  })
})

describe('STATUS_COLORS', () => {
  it('has all 4 status values', () => {
    expect(Object.keys(STATUS_COLORS).sort()).toEqual(['critical', 'moderate', 'stable', 'warning'])
  })

  it('uses Tailwind classes with text color', () => {
    Object.values(STATUS_COLORS).forEach((cls) => {
      expect(cls).toMatch(/text-white/)
      expect(cls).toMatch(/bg-/)
    })
  })

  it('uses bg-blue-500 for moderate (the only allowed blue)', () => {
    expect(STATUS_COLORS.moderate).toBe('bg-blue-500 text-white')
  })

  it('uses bg-emerald-500 for stable', () => {
    expect(STATUS_COLORS.stable).toBe('bg-emerald-500 text-white')
  })

  it('uses bg-amber-500 for warning', () => {
    expect(STATUS_COLORS.warning).toBe('bg-amber-500 text-white')
  })

  it('uses bg-red-500 for critical', () => {
    expect(STATUS_COLORS.critical).toBe('bg-red-500 text-white')
  })
})

describe('STATUS_LABELS', () => {
  it('has English labels for all statuses', () => {
    expect(Object.keys(STATUS_LABELS_EN).sort()).toEqual(['critical', 'moderate', 'stable', 'warning'])
    expect(STATUS_LABELS_EN.stable).toBe('Stable')
    expect(STATUS_LABELS_EN.critical).toBe('Critical')
  })

  it('has Slovenian labels for all statuses', () => {
    expect(Object.keys(STATUS_LABELS_SL).sort()).toEqual(['critical', 'moderate', 'stable', 'warning'])
    expect(STATUS_LABELS_SL.stable).toBe('Stabilno')
    expect(STATUS_LABELS_SL.critical).toBe('Kritično')
  })
})
