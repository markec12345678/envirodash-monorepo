'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import maplibregl from 'maplibre-gl'
import { Users, Share2, X, Send, MapPin, Loader2, Copy, Check } from 'lucide-react'

interface CollabUser {
  userId: string
  name: string
  color: string
  cursor?: { lng: number; lat: number }
}

interface CollabMarker {
  id: string
  userId: string
  userName: string
  lng: number
  lat: number
  color: string
  label?: string
  createdAt: number
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: string
  color: string
}

interface SessionState {
  id: string
  name: string
  users: CollabUser[]
  viewState: { center: [number, number]; zoom: number; bearing: number; pitch: number }
  markers: CollabMarker[]
  messages: ChatMessage[]
}

export function CollaborativeMap({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [myColor, setMyColor] = useState('#10b981')
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([])
  const [markers, setMarkers] = useState<CollabMarker[]>([])
  const [copied, setCopied] = useState(false)
  const [showChat, setShowChat] = useState(true)

  // Cursor markers for other users (MapLibre markers)
  const cursorMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())

  useEffect(() => {
    if (!session?.user || !mapContainer.current) return

    // Initialize map
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [14.5058, 46.0569],
      zoom: 4,
    })
    mapRef.current = map

    // Add navigation control
    map.addControl(new maplibregl.NavigationControl(), 'top-left')

    // Connect to collab-ws
    const socket = io('/', {
      path: '/?XTransformPort=3005',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      // Create a new session
      socket.emit('create_session', {
        userId: (session.user as any).id || 'anonymous',
        name: `Map Session ${new Date().toLocaleDateString()}`,
        userName: session.user?.name || session.user?.email || 'Anonymous',
      })
    })

    socket.on('session_joined', (data: { sessionId: string; sessionName: string; state: SessionState; yourColor: string }) => {
      setMyColor(data.yourColor)
      setSessionState(data.state)
      setActiveUsers(data.state.users)
      setMessages(data.state.messages || [])
      setMarkers(data.state.markers || [])

      // Fly to session view
      if (data.state.viewState) {
        map.flyTo({
          center: data.state.viewState.center,
          zoom: data.state.viewState.zoom,
          bearing: data.state.viewState.bearing,
          pitch: data.state.viewState.pitch,
        })
      }
    })

    // Cursor updates
    socket.on('cursor_update', (data: { userId: string; name: string; color: string; cursor: { lng: number; lat: number } }) => {
      // Update or create cursor marker
      let marker = cursorMarkersRef.current.get(data.userId)
      if (!marker) {
        const el = document.createElement('div')
        el.style.cssText = `width:24px;height:24px;border-radius:50% 50% 50% 0;background:${data.color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);`
        const label = document.createElement('div')
        label.style.cssText = `position:absolute;top:28px;left:0;white-space:nowrap;background:${data.color};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;transform:rotate(45deg);`
        label.textContent = data.name
        el.appendChild(label)
        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        marker.setLngLat([data.cursor.lng, data.cursor.lat]).addTo(map)
        cursorMarkersRef.current.set(data.userId, marker)
      } else {
        marker.setLngLat([data.cursor.lng, data.cursor.lat])
      }

      // Update active users
      setActiveUsers((prev) => {
        const next = prev.filter((u) => u.userId !== data.userId)
        next.push({ userId: data.userId, name: data.name, color: data.color, cursor: data.cursor })
        return next
      })
    })

    // User joined/left
    socket.on('user_joined', (data: { userId: string; name: string; color: string }) => {
      setActiveUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev
        return [...prev, { userId: data.userId, name: data.name, color: data.color }]
      })
    })

    socket.on('user_left', (data: { userId: string; name: string }) => {
      const marker = cursorMarkersRef.current.get(data.userId)
      if (marker) {
        marker.remove()
        cursorMarkersRef.current.delete(data.userId)
      }
      setActiveUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    })

    socket.on('users_update', (users: CollabUser[]) => {
      setActiveUsers(users)
    })

    // View updates
    socket.on('view_update', (data: { userId: string; name: string; viewState: any }) => {
      map.flyTo({
        center: data.viewState.center,
        zoom: data.viewState.zoom,
        bearing: data.viewState.bearing,
        pitch: data.viewState.pitch,
        duration: 500,
      })
    })

    // Markers
    socket.on('marker_added', (marker: CollabMarker) => {
      setMarkers((prev) => [...prev, marker])

      // Add to map
      const el = document.createElement('div')
      el.style.cssText = `width:20px;height:20px;border-radius:50%;background:${marker.color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;`
      if (marker.label) {
        el.title = marker.label
      }
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map)
      m.getElement().dataset.markerId = marker.id
    })

    socket.on('marker_removed', (data: { markerId: string }) => {
      setMarkers((prev) => prev.filter((m) => m.id !== data.markerId))
    })

    // Chat
    socket.on('message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg].slice(-50))
    })

    // Map events
    map.on('mousemove', (e) => {
      socket.emit('cursor_move', { lng: e.lngLat.lng, lat: e.lngLat.lat })
    })

    let viewTimeout: NodeJS.Timeout | null = null
    map.on('moveend', () => {
      const center = map.getCenter()
      socket.emit('view_change', {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      })
    })

    // Click to add marker
    map.on('click', (e) => {
      const label = prompt('Marker label (optional):')
      socket.emit('add_marker', { lng: e.lngLat.lng, lat: e.lngLat.lat, label: label || undefined })
    })

    socket.on('disconnect', () => setConnected(false))

    return () => {
      socket.disconnect()
      cursorMarkersRef.current.forEach((m) => m.remove())
      cursorMarkersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
  }, [session])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !socketRef.current) return
    socketRef.current.emit('send_message', { text: chatInput })
    setChatInput('')
  }

  const copySessionLink = () => {
    if (sessionState) {
      navigator.clipboard.writeText(`${window.location.origin}/?collab=${sessionState.id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!session?.user) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
        <div className="rounded-xl bg-white p-8 text-center dark:bg-zinc-900">
          <Share2 className="mx-auto mb-3 h-12 w-12 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Sign in to start a collaborative map session</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/80">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-zinc-900/90 p-3 text-white backdrop-blur">
        <div className="flex items-center gap-3">
          <Share2 className="h-5 w-5" />
          <div>
            <h2 className="text-sm font-bold">🗺️ Collaborative Map</h2>
            <p className="text-[10px] text-zinc-400">
              {connected ? '● Connected' : '○ Disconnected'} · {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionState && (
            <button
              onClick={copySessionLink}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Share Link'}
            </button>
          )}
          <button
            onClick={() => setShowChat(!showChat)}
            className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-600"
          >
            💬 Chat
          </button>
          {onClose && (
            <button onClick={onClose} className="rounded-lg bg-zinc-700 p-1.5 hover:bg-zinc-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Online users overlay */}
      <div className="absolute left-3 top-16 z-10 rounded-lg border border-zinc-700 bg-zinc-900/90 p-2 backdrop-blur">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400">
          <Users className="h-3 w-3" />
          Online ({activeUsers.length})
        </div>
        <div className="space-y-1">
          {activeUsers.map((u) => (
            <div key={u.userId} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-[11px] text-white">{u.name}</span>
              {u.cursor && <span className="text-[9px] text-zinc-500">●</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-zinc-700 bg-zinc-900/90 p-2 text-[10px] text-zinc-400 backdrop-blur">
        💡 Click on map to add marker · Move mouse to share cursor
      </div>

      {/* Chat panel */}
      {showChat && (
        <div className="absolute bottom-3 right-3 z-10 flex h-80 w-72 flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur">
          <div className="flex items-center justify-between border-b border-zinc-700 p-2">
            <span className="text-xs font-bold text-white">💬 Session Chat</span>
            <button onClick={() => setShowChat(false)} className="text-zinc-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-[10px] text-zinc-500">No messages yet. Start chatting!</p>
            ) : (
              messages.map((m) => {
                const isOwn = m.userId === (session.user as any).id
                return (
                  <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-2 py-1 text-[11px] ${isOwn ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                      {!isOwn && <div className="text-[9px] font-bold" style={{ color: m.color }}>{m.userName}</div>}
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <form onSubmit={sendMessage} className="border-t border-zinc-700 p-2">
            <div className="flex gap-1">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white outline-none focus:border-emerald-500"
              />
              <button type="submit" disabled={!chatInput.trim()} className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50">
                <Send className="h-3 w-3" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default CollaborativeMap
