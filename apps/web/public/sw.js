/**
 * EnviroDash Service Worker
 *
 * Provides offline support by caching:
 *   - App shell (HTML, CSS, JS chunks)
 *   - Static assets (icons, fonts)
 *   - API responses (stale-while-revalidate)
 *
 * Cache strategy:
 *   - Network-first for navigation requests (always try to get fresh HTML)
 *   - Stale-while-revalidate for API responses (return cached, refresh in background)
 *   - Cache-first for static assets (icons, fonts, _next/static)
 */

const CACHE_VERSION = 'envirodash-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/offline.html',
]

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Don't fail install if some assets are missing
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url).then((res) => {
            if (res.ok) return cache.put(url, res)
          }).catch(() => {})
        )
      )
    })
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('envirodash-') && !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch: route requests to appropriate cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests (e.g., map tiles, external APIs)
  if (url.origin !== self.location.origin) return

  // Skip Next.js HMR and dev tools
  if (url.pathname.startsWith('/_next/webpack-hmr')) return
  if (url.pathname.startsWith('/_next/dev')) return

  // API requests: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request))
    return
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
})

// ==================== Cache Strategies ====================

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch (e) {
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => cached || new Response('Offline', { status: 503 }))

  return cached || fetchPromise
}

async function networkFirstWithOffline(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch (e) {
    const cached = await cache.match(request)
    if (cached) return cached
    // Fall back to offline page
    const offline = await caches.match('/offline.html')
    return offline || new Response('You are offline', { status: 503, headers: { 'Content-Type': 'text/html' } })
  }
}

// ==================== Push Notifications ====================

self.addEventListener('push', (event) => {
  let data = { title: 'EnviroDash Alert', body: 'New environmental alert' }
  try {
    if (event.data) data = event.data.json()
  } catch (e) {
    data = { title: 'EnviroDash Alert', body: event.data?.text() || 'New alert' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'envirodash-alert',
      data: data.url ? { url: data.url } : undefined,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ==================== Background Sync ====================

self.addEventListener('sync', (event) => {
  if (event.tag === 'envirodash-sync') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  // Refresh all cached API data when connection is restored
  const cache = await caches.open(API_CACHE)
  const requests = await cache.keys()
  await Promise.allSettled(
    requests.map((req) =>
      fetch(req).then((res) => {
        if (res.ok) return cache.put(req, res.clone())
      }).catch(() => {})
    )
  )
}
