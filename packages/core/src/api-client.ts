/**
 * EnviroDash API Client
 * Tiny fetch wrapper with timeout, error handling, and JSON parsing.
 * Used by all monitors to fetch data from upstream APIs.
 */

export interface FetchOptions extends RequestInit {
  /** Timeout in milliseconds (default: 30s). */
  timeoutMs?: number
}

/**
 * Fetch JSON from a URL with timeout and graceful error handling.
 *
 * @example
 * const data = await fetchJson<{ results: any[] }>('https://api.example.com/data', {
 *   timeoutMs: 15000,
 *   headers: { 'User-Agent': 'EnviroDash/1.0' },
 * })
 */
export async function fetchJson<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 30000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Compute a US-AQI status label from a numeric AQI value.
 *
 * @see https://www.airnow.gov/aqi/aqi-basics/
 */
export function aqiToStatus(aqi: number | null | undefined): 'stable' | 'moderate' | 'warning' | 'critical' {
  if (aqi == null) return 'stable'
  if (aqi <= 50) return 'stable'
  if (aqi <= 100) return 'moderate'
  if (aqi <= 150) return 'warning'
  return 'critical'
}

/**
 * Compute a Fire Weather Index (0-100) status label.
 * FWI is a simplified proxy calculated from temperature, humidity, wind, and precipitation.
 */
export function fwiToStatus(fwi: number | null | undefined): 'stable' | 'moderate' | 'warning' | 'critical' {
  if (fwi == null) return 'stable'
  if (fwi < 20) return 'stable'
  if (fwi < 40) return 'moderate'
  if (fwi < 65) return 'warning'
  return 'critical'
}

/**
 * Status colors matching the original MotoTrack STATUS_COLORS map.
 * The only blue allowed is the canonical `bg-blue-500` for "moderate" status.
 */
export const STATUS_COLORS: Record<string, string> = {
  stable: 'bg-emerald-500 text-white',
  moderate: 'bg-blue-500 text-white',
  warning: 'bg-amber-500 text-white',
  critical: 'bg-red-500 text-white',
}

/** Human-readable labels (Slovenian) for each status. */
export const STATUS_LABELS_SL: Record<string, string> = {
  stable: 'Stabilno',
  moderate: 'Zmerno',
  warning: 'Opozorilo',
  critical: 'Kritično',
}

/** Human-readable labels (English) for each status. */
export const STATUS_LABELS_EN: Record<string, string> = {
  stable: 'Stable',
  moderate: 'Moderate',
  warning: 'Warning',
  critical: 'Critical',
}
