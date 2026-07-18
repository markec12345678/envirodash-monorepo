/**
 * EnviroDash Real-time Data Streaming Service
 *
 * Pushes live environmental data to subscribed clients via Socket.IO.
 * Instead of clients polling every 60s, this service:
 *   1. Polls upstream APIs every 60s (weather, AQ, wildfire, etc.)
 *   2. Caches latest data in memory
 *   3. Pushes updates to subscribed clients instantly
 *   4. Clients receive data within 1s of upstream update
 *
 * Subscriptions:
 *   socket.emit('subscribe', { channels: ['air-quality:SI', 'earthquake', 'tsunami'] })
 *
 * Channels:
 *   - air-quality:SI       (AQ for Slovenia, updates every 10 min)
 *   - air-quality:point    (AQ for specific lat/lng, updates every 10 min)
 *   - wildfire:europe      (FWI for Europe, updates every 60 min)
 *   - earthquake           (USGS, updates every 60s)
 *   - tsunami              (NOAA, updates every 5 min)
 *   - volcano              (USGS, updates every 30 min)
 *   - weather:point        (weather for lat/lng, updates every 10 min)
 *
 * Port: 3006
 */

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const PORT = 3006
const WEB_API_URL = process.env.WEB_API_URL || 'http://localhost:3000'

// Cache for latest data per channel
const dataCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 min default

// Polling intervals per channel type
const POLL_INTERVALS: Record<string, number> = {
  'air-quality': 10 * 60 * 1000,   // 10 min
  'wildfire': 60 * 60 * 1000,       // 60 min
  'earthquake': 60 * 1000,           // 1 min
  'tsunami': 5 * 60 * 1000,         // 5 min
  'volcano': 30 * 60 * 1000,        // 30 min
  'weather': 10 * 60 * 1000,        // 10 min
}

// Track which channels have subscribers
const channelSubscribers = new Map<string, Set<string>>() // channel -> socket IDs

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      service: 'envirodash-data-stream-ws',
      port: PORT,
      cachedChannels: dataCache.size,
      activeSubscriptions: channelSubscribers.size,
      totalClients: io.engine.clientsCount,
    }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'envirodash-data-stream-ws', uptime: process.uptime() }))
})

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

async function fetchUpstream(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EnviroDash-DataStream/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e: any) {
    console.error(`[DataStream] Fetch failed: ${url.slice(0, 80)} — ${e.message}`)
    return null
  }
}

// ==================== Data Pollers ====================

async function pollAirQuality() {
  const channels = ['air-quality:SI', 'air-quality:DE', 'air-quality:IT', 'air-quality:FR', 'air-quality:GB', 'air-quality:US']
  const countries = ['SI', 'DE', 'IT', 'FR', 'GB', 'US']

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]
    if (!channelSubscribers.has(channel)) continue // Skip if no subscribers

    const data = await fetchUpstream(`${WEB_API_URL}/api/air-quality?country=${countries[i]}&limit=10`)
    if (data) {
      dataCache.set(channel, { data, timestamp: Date.now() })
      io.to(channel).emit('data_update', { channel, data, timestamp: new Date().toISOString() })
      console.log(`[DataStream] Pushed ${channel}: ${data.count} locations`)
    }
  }
}

async function pollEarthquakes() {
  if (!channelSubscribers.has('earthquake')) return

  const data = await fetchUpstream(`${WEB_API_URL}/api/earthquake?minMagnitude=2.5&limit=50`)
  if (data) {
    dataCache.set('earthquake', { data, timestamp: Date.now() })
    io.to('earthquake').emit('data_update', { channel: 'earthquake', data, timestamp: new Date().toISOString() })
    console.log(`[DataStream] Pushed earthquake: ${data.count} quakes`)
  }
}

async function pollTsunami() {
  if (!channelSubscribers.has('tsunami')) return

  const data = await fetchUpstream(`${WEB_API_URL}/api/tsunami`)
  if (data) {
    dataCache.set('tsunami', { data, timestamp: Date.now() })
    io.to('tsunami').emit('data_update', { channel: 'tsunami', data, timestamp: new Date().toISOString() })
    console.log(`[DataStream] Pushed tsunami: ${data.count} warnings`)
  }
}

async function pollVolcano() {
  if (!channelSubscribers.has('volcano')) return

  const data = await fetchUpstream(`${WEB_API_URL}/api/volcano`)
  if (data) {
    dataCache.set('volcano', { data, timestamp: Date.now() })
    io.to('volcano').emit('data_update', { channel: 'volcano', data, timestamp: new Date().toISOString() })
    console.log(`[DataStream] Pushed volcano: ${data.count} volcanoes`)
  }
}

async function pollWildfire() {
  const areas = ['europe', 'california', 'australia', 'slovenia']
  for (const area of areas) {
    const channel = `wildfire:${area}`
    if (!channelSubscribers.has(channel)) continue

    const data = await fetchUpstream(`${WEB_API_URL}/api/wildfire?area=${area}`)
    if (data) {
      dataCache.set(channel, { data, timestamp: Date.now() })
      io.to(channel).emit('data_update', { channel, data, timestamp: new Date().toISOString() })
      console.log(`[DataStream] Pushed ${channel}: ${data.count} locations`)
    }
  }
}

async function pollWeather() {
  // Weather requires specific lat/lng — use cached subscriber params
  const weatherChannels = Array.from(channelSubscribers.keys()).filter((c) => c.startsWith('weather:'))
  for (const channel of weatherChannels) {
    const params = channel.split(':')[1]
    const [lat, lng] = params.split(',')
    const data = await fetchUpstream(`${WEB_API_URL}/api/weather?lat=${lat}&lng=${lng}`)
    if (data) {
      dataCache.set(channel, { data, timestamp: Date.now() })
      io.to(channel).emit('data_update', { channel, data, timestamp: new Date().toISOString() })
    }
  }
}

// ==================== Socket.IO Connection ====================

io.on('connection', (socket: Socket) => {
  console.log(`[DataStream] Client connected: ${socket.id}`)

  socket.on('subscribe', (data: { channels: string[] }) => {
    for (const channel of data.channels) {
      socket.join(channel)
      if (!channelSubscribers.has(channel)) {
        channelSubscribers.set(channel, new Set())
      }
      channelSubscribers.get(channel)!.add(socket.id)

      // Send cached data immediately if available
      const cached = dataCache.get(channel)
      if (cached) {
        socket.emit('data_update', {
          channel,
          data: cached.data,
          timestamp: new Date(cached.timestamp).toISOString(),
          cached: true,
        })
      }

      console.log(`[DataStream] ${socket.id} subscribed to ${channel}`)
    }

    socket.emit('subscribed', { channels: data.channels })
  })

  socket.on('unsubscribe', (data: { channels: string[] }) => {
    for (const channel of data.channels) {
      socket.leave(channel)
      channelSubscribers.get(channel)?.delete(socket.id)
      if (channelSubscribers.get(channel)?.size === 0) {
        channelSubscribers.delete(channel)
      }
    }
  })

  socket.on('subscribe_weather', (data: { lat: number; lng: number }) => {
    const channel = `weather:${data.lat},${data.lng}`
    socket.join(channel)
    if (!channelSubscribers.has(channel)) {
      channelSubscribers.set(channel, new Set())
    }
    channelSubscribers.get(channel)!.add(socket.id)
    socket.emit('subscribed', { channels: [channel] })
  })

  socket.on('disconnect', () => {
    // Clean up subscriptions
    for (const [channel, sockets] of channelSubscribers.entries()) {
      sockets.delete(socket.id)
      if (sockets.size === 0) {
        channelSubscribers.delete(channel)
      }
    }
    console.log(`[DataStream] Client disconnected: ${socket.id}`)
  })
})

// ==================== Start Polling ====================

httpServer.listen(PORT, () => {
  console.log(`📊 EnviroDash Data Stream Service`)
  console.log(`   Listening on http://localhost:${PORT}`)
  console.log(`   Web API: ${WEB_API_URL}`)
  console.log(`   Channels: air-quality, wildfire, earthquake, tsunami, volcano, weather`)
  console.log(`   Push: real-time updates to subscribed clients`)
  console.log()

  // Start pollers
  setInterval(pollAirQuality, POLL_INTERVALS['air-quality'])
  setInterval(pollWildfire, POLL_INTERVALS['wildfire'])
  setInterval(pollEarthquakes, POLL_INTERVALS['earthquake'])
  setInterval(pollTsunami, POLL_INTERVALS['tsunami'])
  setInterval(pollVolcano, POLL_INTERVALS['volcano'])
  setInterval(pollWeather, POLL_INTERVALS['weather'])

  // Initial poll after 3s
  setTimeout(() => {
    pollEarthquakes()
    pollTsunami()
  }, 3000)
  setTimeout(() => {
    pollAirQuality()
    pollWildfire()
    pollVolcano()
  }, 10000)
})
