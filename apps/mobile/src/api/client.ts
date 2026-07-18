/**
 * EnviroDash Mobile API Client
 * Communicates with the EnviroDash web API (apps/web).
 *
 * Configure the API URL in app.json under extra.envirodashApiUrl,
 * or set the ENV env var.
 */

import type { MonitorDataResponse } from '@envirodash/core'

const API_URL = 'http://localhost:3000' // Replace with your deployed URL

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  token?: string | null
}

async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = opts
  const url = `${API_URL}${path}`

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`)
  }

  return res.json()
}

/** Fetch air quality data for a country or point. */
export async function fetchAirQuality(params: { country?: string; lat?: number; lng?: number; limit?: number }) {
  const q = new URLSearchParams()
  if (params.country) q.set('country', params.country)
  if (params.lat != null) q.set('lat', String(params.lat))
  if (params.lng != null) q.set('lng', String(params.lng))
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<MonitorDataResponse>(`/api/air-quality?${q}`)
}

/** Fetch wildfire risk data. */
export async function fetchWildfire(params: { area?: string; country?: string; lat?: number; lng?: number }) {
  const q = new URLSearchParams()
  if (params.area) q.set('area', params.area)
  if (params.country) q.set('country', params.country)
  if (params.lat != null) q.set('lat', String(params.lat))
  if (params.lng != null) q.set('lng', String(params.lng))
  return request<MonitorDataResponse>(`/api/wildfire?${q}`)
}

/** Fetch tsunami warnings. */
export async function fetchTsunami() {
  return request<MonitorDataResponse>('/api/tsunami')
}

/** Fetch volcano alerts. */
export async function fetchVolcanoes() {
  return request<MonitorDataResponse>('/api/volcano')
}

/** Fetch recent earthquakes. */
export async function fetchEarthquakes(params: { minMagnitude?: number; limit?: number } = {}) {
  const q = new URLSearchParams()
  if (params.minMagnitude != null) q.set('minMagnitude', String(params.minMagnitude))
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<MonitorDataResponse>(`/api/earthquake?${q}`)
}

/** Fetch weather for a point. */
export async function fetchWeather(lat: number, lng: number, name?: string) {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) })
  if (name) q.set('name', name)
  return request<MonitorDataResponse>(`/api/weather?${q}`)
}

/** Fetch glacier data. */
export async function fetchGlaciers(params: { region?: string; limit?: number } = {}) {
  const q = new URLSearchParams()
  if (params.region) q.set('region', params.region)
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<MonitorDataResponse>(`/api/glacier?${q}`)
}

/** Fetch coral reef SST. */
export async function fetchCoralReefs(params: { region?: string; limit?: number } = {}) {
  const q = new URLSearchParams()
  if (params.region) q.set('region', params.region)
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<MonitorDataResponse>(`/api/coral-reef?${q}`)
}

/** Fetch flood risk. */
export async function fetchFloods(params: { region?: string; limit?: number } = {}) {
  const q = new URLSearchParams()
  if (params.region) q.set('region', params.region)
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<MonitorDataResponse>(`/api/flood?${q}`)
}

/** Fetch drought data. */
export async function fetchDroughts(params: { region?: string; limit?: number } = {}) {
  const q = new URLSearchParams()
  if (params.region) q.set('region', params.region)
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<MonitorDataResponse>(`/api/drought?${q}`)
}

/** Send a natural-language query to the AI assistant. */
export async function askAI(message: string, history: Array<{ role: string; content: string }> = []) {
  return request<{ success: boolean; response: any }>('/api/ai-chat', {
    method: 'POST',
    body: { message, history },
  })
}

/** List all available monitors in the marketplace. */
export async function fetchMarketplace(params: { category?: string; realData?: boolean; search?: string; limit?: number } = {}) {
  const q = new URLSearchParams()
  if (params.category) q.set('category', params.category)
  if (params.realData != null) q.set('realData', String(params.realData))
  if (params.search) q.set('search', params.search)
  if (params.limit != null) q.set('limit', String(params.limit))
  return request<{ total: number; monitors: any[]; categories: Record<string, number> }>(`/api/marketplace?${q}`)
}
