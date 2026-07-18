/**
 * EnviroDash Core Types
 * Shared type definitions used by all monitor packages.
 */

/** Status of a monitored location or metric. */
export type MonitorStatus = 'stable' | 'moderate' | 'warning' | 'critical'

/** Trend direction for a metric. */
export type TrendDirection = 'up' | 'down' | 'stable'

/** A single monitored location (city, sensor, station, etc.). */
export interface MonitorLocation {
  id: string
  name: string
  lat: number
  lng: number
  status: MonitorStatus
  /** Primary metric value (e.g. AQI, FWI, temperature). */
  value?: number
  /** Human-readable unit for the value (e.g. "µg/m³", "°C", "index"). */
  unit?: string
  /** Last updated ISO timestamp. */
  lastUpdated?: string
  /** Free-form description shown in the detail card. */
  description?: string
  /** Optional trend indicator. */
  trend?: TrendDirection
  /** Additional per-location metrics. */
  metrics?: Record<string, number | string>
}

/** Manifest describing a monitor package (read from manifest.json). */
export interface MonitorManifest {
  /** Package id, e.g. "air-quality". Must match the directory name. */
  id: string
  /** Human-readable name shown in UI, e.g. "Air Quality Monitor". */
  name: string
  /** Category for grouping in the toolbar. */
  category: MonitorCategory
  /** Lucide icon name, e.g. "wind", "flame", "waves". */
  icon: string
  /** Short description (shown in toolbar tooltip). */
  description: string
  /** Data source label, e.g. "Open-Meteo Air Quality API". */
  dataSource: string
  /** True if the monitor fetches real-time data; false for demo monitors. */
  realData: boolean
  /** Free tier availability. */
  free: boolean
  /** Accent color for the gradient header (Tailwind color name, no indigo/blue). */
  accent?: 'emerald' | 'teal' | 'orange' | 'rose' | 'amber' | 'pink' | 'fuchsia' | 'violet' | 'purple' | 'cyan' | 'green' | 'red' | 'sky' | 'yellow' | 'stone'
  /** Optional list of supported regions/countries. */
  supportedRegions?: string[]
}

/** Monitor category for grouping in the toolbar. */
export type MonitorCategory =
  | 'environment'
  | 'geological'
  | 'oceanic'
  | 'atmospheric'
  | 'climate'
  | 'weather'
  | 'wildlife'
  | 'vegetation'
  | 'hydrology'
  | 'disaster'
  | 'infrastructure'
  | 'industrial'
  | 'retail'
  | 'services'
  | 'recreation'
  | 'other'

/** Response from a monitor's data-fetch function. */
export interface MonitorDataResponse<T = MonitorLocation> {
  /** Source attribution, e.g. "Open-Meteo Air Quality API". */
  source: string
  /** Number of locations returned. */
  count: number
  /** Locations array. */
  results: T[]
  /** ISO timestamp when the data was fetched. */
  fetchedAt: string
  /** Optional note (e.g. "No active warnings"). */
  note?: string
}

/** City reference used by multi-city monitors. */
export interface CityRef {
  name: string
  lat: number
  lng: number
}
