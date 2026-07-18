/**
 * EnviroDash Alerts WebSocket Service
 *
 * Polls the EnviroDash web API every 60 seconds for:
 *   - New significant earthquakes (M5+)
 *   - New tsunami warnings
 *   - Critical air quality (US AQI > 150)
 *   - Critical wildfire risk (FWI > 65)
 *   - Critical volcano alerts (WARNING level)
 *
 * Broadcasts alerts to all connected clients via Socket.IO.
 *
 * Port: 3003 (must use XTransformPort query when called from web app)
 */

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003
const WEB_API_URL = process.env.WEB_API_URL || 'http://localhost:3000'
const POLL_INTERVAL_MS = 60_000 // 1 minute

interface Alert {
  id: string
  type: 'earthquake' | 'tsunami' | 'air-quality' | 'wildfire' | 'volcano'
  severity: 'warning' | 'critical'
  title: string
  description: string
  location?: { name: string; lat: number; lng: number }
  value?: number
  unit?: string
  timestamp: string
  source: string
}

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'envirodash-alerts-ws', port: PORT }))
    return
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'envirodash-alerts-ws', uptime: process.uptime() }))
})

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// Track previously-seen alert IDs to avoid duplicates
const seenAlertIds = new Set<string>()

// Track recent alerts (last 50) for new clients
const recentAlerts: Alert[] = []
const MAX_RECENT = 50

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)

  // Send recent alerts on connection
  socket.emit('recent_alerts', recentAlerts)

  socket.on('subscribe', (filters: { types?: string[]; minSeverity?: 'warning' | 'critical' }) => {
    console.log(`[WS] ${socket.id} subscribed:`, filters)
    socket.join('subscribed')
    ;(socket as any).filters = filters
  })

  socket.on('unsubscribe', () => {
    socket.leave('subscribed')
    console.log(`[WS] ${socket.id} unsubscribed`)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`)
  })
})

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EnviroDash-AlertsWS/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e: any) {
    console.error(`[Alerts] Fetch failed: ${url} — ${e.message}`)
    return null
  }
}

async function checkEarthquakes(): Promise<Alert[]> {
  const data = await fetchJson(`${WEB_API_URL}/api/earthquake?minMagnitude=5&limit=10`)
  if (!data?.results) return []

  const alerts: Alert[] = []
  for (const q of data.results) {
    const mag = q.value || 0
    if (mag < 5) continue
    const id = `quake-${q.id}`
    if (seenAlertIds.has(id)) continue

    alerts.push({
      id,
      type: 'earthquake',
      severity: mag >= 6 ? 'critical' : 'warning',
      title: `M${mag.toFixed(1)} Earthquake detected`,
      description: q.description || `${q.name} — magnitude ${mag}`,
      location: { name: q.name, lat: q.lat, lng: q.lng },
      value: mag,
      unit: 'magnitude',
      timestamp: q.lastUpdated || new Date().toISOString(),
      source: 'USGS Earthquake Hazards',
    })
  }
  return alerts
}

async function checkTsunami(): Promise<Alert[]> {
  const data = await fetchJson(`${WEB_API_URL}/api/tsunami`)
  if (!data?.results) return []

  const alerts: Alert[] = []
  for (const t of data.results) {
    const id = `tsunami-${t.id || t.title}`
    if (seenAlertIds.has(id)) continue

    const severity = t.msg_type === 'warning' ? 'critical' : 'warning'
    alerts.push({
      id,
      type: 'tsunami',
      severity,
      title: `Tsunami ${t.msg_type.toUpperCase()}: ${t.region}`,
      description: t.title,
      timestamp: t.pub_date || new Date().toISOString(),
      source: 'NOAA NTWC',
    })
  }
  return alerts
}

async function checkAirQuality(): Promise<Alert[]> {
  const data = await fetchJson(`${WEB_API_URL}/api/air-quality?country=SI&limit=10`)
  if (!data?.results) return []

  const alerts: Alert[] = []
  for (const aq of data.results) {
    const aqi = aq.value || 0
    if (aqi < 150) continue // Only alert for Unhealthy+

    const id = `aq-${aq.id}-${new Date().toISOString().slice(0, 13)}` // Per-hour dedupe
    if (seenAlertIds.has(id)) continue

    alerts.push({
      id,
      type: 'air-quality',
      severity: aqi >= 200 ? 'critical' : 'warning',
      title: `Air Quality ${aqi} AQI in ${aq.name}`,
      description: `US AQI ${aqi} — ${aqi >= 200 ? 'Very Unhealthy' : 'Unhealthy'} air quality in ${aq.name}`,
      location: { name: aq.name, lat: aq.lat, lng: aq.lng },
      value: aqi,
      unit: 'AQI',
      timestamp: aq.lastUpdated || new Date().toISOString(),
      source: 'Open-Meteo Air Quality API',
    })
  }
  return alerts
}

async function checkWildfire(): Promise<Alert[]> {
  const data = await fetchJson(`${WEB_API_URL}/api/wildfire?area=europe`)
  if (!data?.results) return []

  const alerts: Alert[] = []
  for (const w of data.results) {
    const fwi = w.value || 0
    if (fwi < 50) continue

    const id = `wildfire-${w.id}-${new Date().toISOString().slice(0, 13)}`
    if (seenAlertIds.has(id)) continue

    alerts.push({
      id,
      type: 'wildfire',
      severity: fwi >= 65 ? 'critical' : 'warning',
      title: `Wildfire Risk ${fwi}/100 in ${w.name}`,
      description: `Fire Weather Index ${fwi} — ${fwi >= 65 ? 'Extreme' : 'High'} fire danger in ${w.name}`,
      location: { name: w.name, lat: w.lat, lng: w.lng },
      value: fwi,
      unit: 'FWI',
      timestamp: w.lastUpdated || new Date().toISOString(),
      source: 'Open-Meteo Forecast API',
    })
  }
  return alerts
}

async function checkVolcanoes(): Promise<Alert[]> {
  const data = await fetchJson(`${WEB_API_URL}/api/volcano`)
  if (!data?.results) return []

  const alerts: Alert[] = []
  for (const v of data.results) {
    if (v.status !== 'critical' && v.status !== 'warning') continue
    const alertLevel = (v.metrics?.alert || '').toUpperCase()
    if (!['WARNING', 'WATCH'].includes(alertLevel)) continue

    const id = `volcano-${v.id}-${new Date().toISOString().slice(0, 13)}`
    if (seenAlertIds.has(id)) continue

    alerts.push({
      id,
      type: 'volcano',
      severity: alertLevel === 'WARNING' ? 'critical' : 'warning',
      title: `Volcano ${alertLevel}: ${v.name}`,
      description: v.description || `${v.name} alert level: ${alertLevel}`,
      location: { name: v.name, lat: v.lat, lng: v.lng },
      timestamp: v.lastUpdated || new Date().toISOString(),
      source: 'USGS Volcano Hazards Program',
    })
  }
  return alerts
}

async function pollAlerts() {
  console.log(`[Alerts] Polling at ${new Date().toISOString()}`)

  const [quakes, tsunami, aq, wildfire, volcano] = await Promise.allSettled([
    checkEarthquakes(),
    checkTsunami(),
    checkAirQuality(),
    checkWildfire(),
    checkVolcanoes(),
  ])

  const newAlerts: Alert[] = []
  if (quakes.status === 'fulfilled') newAlerts.push(...quakes.value)
  if (tsunami.status === 'fulfilled') newAlerts.push(...tsunami.value)
  if (aq.status === 'fulfilled') newAlerts.push(...aq.value)
  if (wildfire.status === 'fulfilled') newAlerts.push(...wildfire.value)
  if (volcano.status === 'fulfilled') newAlerts.push(...volcano.value)

  // Mark as seen and broadcast
  for (const alert of newAlerts) {
    seenAlertIds.add(alert.id)
    recentAlerts.unshift(alert)
    console.log(`[Alerts] NEW ${alert.severity.toUpperCase()} ${alert.type}: ${alert.title}`)
    io.to('subscribed').emit('alert', alert)
  }

  // Trim recent alerts
  if (recentAlerts.length > MAX_RECENT) {
    recentAlerts.length = MAX_RECENT
  }

  // Clean up old seen IDs (keep last 500)
  if (seenAlertIds.size > 500) {
    const arr = Array.from(seenAlertIds)
    seenAlertIds.clear()
    arr.slice(-500).forEach((id) => seenAlertIds.add(id))
  }

  if (newAlerts.length === 0) {
    console.log(`[Alerts] No new alerts. Connected clients: ${io.engine.clientsCount}`)
  } else {
    console.log(`[Alerts] Broadcast ${newAlerts.length} new alerts to ${io.engine.clientsCount} clients`)
  }
}

httpServer.listen(PORT, () => {
  console.log(`🌍 EnviroDash Alerts WebSocket Service`)
  console.log(`   Listening on http://localhost:${PORT}`)
  console.log(`   Web API: ${WEB_API_URL}`)
  console.log(`   Poll interval: ${POLL_INTERVAL_MS / 1000}s`)
  console.log(`   Socket.IO path: /socket.io`)
  console.log()
  // Initial poll
  setTimeout(pollAlerts, 2000)
  // Periodic poll
  setInterval(pollAlerts, POLL_INTERVAL_MS)
})
