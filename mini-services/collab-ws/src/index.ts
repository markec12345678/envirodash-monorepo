/**
 * EnviroDash Real-time Map Collaboration Service
 *
 * Enables Felt-style shared map sessions where multiple users can:
 *   - See each other's cursor positions on the map
 *   - Share map view (center, zoom, bearing, pitch)
 *   - Add/edit markers visible to all participants
 *   - Draw annotations (lines, polygons, circles)
 *   - Chat within the session
 *   - See who is online
 *
 * Session model:
 *   - Each session has a unique ID (shareable URL)
 *   - Users join via session ID
 *   - State is kept in memory (replace with Redis for persistence)
 *   - Last 20 sessions are kept alive
 *
 * Port: 3005
 */

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { randomUUID } from 'crypto'

const PORT = 3005

interface CollabUser {
  socketId: string
  userId: string
  name: string
  color: string
  cursor?: { lng: number; lat: number }
  sessionId: string
  joinedAt: number
}

interface CollabSession {
  id: string
  name: string
  createdAt: number
  users: Map<string, CollabUser> // userId -> user
  viewState: {
    center: [number, number] // [lng, lat]
    zoom: number
    bearing: number
    pitch: number
  }
  markers: Array<{
    id: string
    userId: string
    userName: string
    lng: number
    lat: number
    color: string
    label?: string
    createdAt: number
  }>
  annotations: Array<{
    id: string
    userId: string
    userName: string
    type: 'line' | 'polygon' | 'circle'
    coordinates: [number, number][]
    color: string
    label?: string
    createdAt: number
  }>
  messages: Array<{
    id: string
    userId: string
    userName: string
    text: string
    timestamp: string
    color: string
  }>
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

const sessions = new Map<string, CollabSession>()
const MAX_SESSIONS = 20
const MAX_MESSAGES = 50

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      service: 'envirodash-collab-ws',
      port: PORT,
      sessions: sessions.size,
      totalUsers: Array.from(sessions.values()).reduce((sum, s) => sum + s.users.size, 0),
    }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'envirodash-collab-ws', uptime: process.uptime() }))
})

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

function createSession(name: string): CollabSession {
  const id = randomUUID().slice(0, 8)
  return {
    id,
    name: name || `Session ${id}`,
    createdAt: Date.now(),
    users: new Map(),
    viewState: {
      center: [14.5058, 46.0569], // Ljubljana default
      zoom: 4,
      bearing: 0,
      pitch: 0,
    },
    markers: [],
    annotations: [],
    messages: [],
  }
}

function getSessionUsers(session: CollabSession) {
  return Array.from(session.users.values()).map((u) => ({
    userId: u.userId,
    name: u.name,
    color: u.color,
    cursor: u.cursor,
  }))
}

function getSessionState(session: CollabSession) {
  return {
    id: session.id,
    name: session.name,
    users: getSessionUsers(session),
    viewState: session.viewState,
    markers: session.markers.slice(-100),
    annotations: session.annotations.slice(-50),
    messages: session.messages.slice(-MAX_MESSAGES),
  }
}

function cleanupOldSessions() {
  if (sessions.size > MAX_SESSIONS) {
    // Remove oldest sessions with no users
    const sorted = Array.from(sessions.entries())
      .filter(([, s]) => s.users.size === 0)
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
    while (sessions.size > MAX_SESSIONS && sorted.length > 0) {
      const [id] = sorted.shift()!
      sessions.delete(id)
    }
  }
}

io.on('connection', (socket: Socket) => {
  let currentUser: CollabUser | null = null

  // Create a new session
  socket.on('create_session', (data: { userId: string; name: string; userName: string }) => {
    const session = createSession(data.name)
    const color = COLORS[sessions.size % COLORS.length]

    currentUser = {
      socketId: socket.id,
      userId: data.userId,
      name: data.userName,
      color,
      sessionId: session.id,
      joinedAt: Date.now(),
    }

    session.users.set(data.userId, currentUser)
    sessions.set(session.id, session)
    socket.join(session.id)

    socket.emit('session_joined', {
      sessionId: session.id,
      sessionName: session.name,
      state: getSessionState(session),
      yourColor: color,
    })

    console.log(`[Collab] Session ${session.id} created by ${data.userName}`)
  })

  // Join an existing session
  socket.on('join_session', (data: { sessionId: string; userId: string; userName: string }) => {
    const session = sessions.get(data.sessionId)
    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }

    const color = COLORS[session.users.size % COLORS.length]
    currentUser = {
      socketId: socket.id,
      userId: data.userId,
      name: data.userName,
      color,
      sessionId: data.sessionId,
      joinedAt: Date.now(),
    }

    session.users.set(data.userId, currentUser)
    socket.join(data.sessionId)

    // Send current state to new user
    socket.emit('session_joined', {
      sessionId: data.sessionId,
      sessionName: session.name,
      state: getSessionState(session),
      yourColor: color,
    })

    // Notify others
    socket.to(data.sessionId).emit('user_joined', {
      userId: data.userId,
      name: data.userName,
      color,
    })
    io.to(data.sessionId).emit('users_update', getSessionUsers(session))

    console.log(`[Collab] ${data.userName} joined session ${data.sessionId} (${session.users.size} users)`)
  })

  // Cursor movement
  socket.on('cursor_move', (data: { lng: number; lat: number }) => {
    if (!currentUser) return
    currentUser.cursor = { lng: data.lng, lat: data.lat }

    socket.to(currentUser.sessionId).emit('cursor_update', {
      userId: currentUser.userId,
      name: currentUser.name,
      color: currentUser.color,
      cursor: currentUser.cursor,
    })
  })

  // View state change (follow mode)
  socket.on('view_change', (data: { center: [number, number]; zoom: number; bearing: number; pitch: number }) => {
    if (!currentUser) return
    const session = sessions.get(currentUser.sessionId)
    if (!session) return

    session.viewState = data
    socket.to(currentUser.sessionId).emit('view_update', {
      userId: currentUser.userId,
      name: currentUser.name,
      viewState: data,
    })
  })

  // Add marker
  socket.on('add_marker', (data: { lng: number; lat: number; label?: string }) => {
    if (!currentUser) return
    const session = sessions.get(currentUser.sessionId)
    if (!session) return

    const marker = {
      id: randomUUID(),
      userId: currentUser.userId,
      userName: currentUser.name,
      lng: data.lng,
      lat: data.lat,
      color: currentUser.color,
      label: data.label,
      createdAt: Date.now(),
    }

    session.markers.push(marker)
    io.to(currentUser.sessionId).emit('marker_added', marker)
  })

  // Remove marker
  socket.on('remove_marker', (data: { markerId: string }) => {
    if (!currentUser) return
    const session = sessions.get(currentUser.sessionId)
    if (!session) return

    session.markers = session.markers.filter((m) => m.id !== data.markerId)
    io.to(currentUser.sessionId).emit('marker_removed', { markerId: data.markerId })
  })

  // Add annotation
  socket.on('add_annotation', (data: { type: 'line' | 'polygon' | 'circle'; coordinates: [number, number][]; label?: string }) => {
    if (!currentUser) return
    const session = sessions.get(currentUser.sessionId)
    if (!session) return

    const annotation = {
      id: randomUUID(),
      userId: currentUser.userId,
      userName: currentUser.name,
      type: data.type,
      coordinates: data.coordinates,
      color: currentUser.color,
      label: data.label,
      createdAt: Date.now(),
    }

    session.annotations.push(annotation)
    io.to(currentUser.sessionId).emit('annotation_added', annotation)
  })

  // Chat message
  socket.on('send_message', (data: { text: string }) => {
    if (!currentUser) return
    const session = sessions.get(currentUser.sessionId)
    if (!session) return
    if (!data.text || data.text.length > 500) return

    const message = {
      id: randomUUID(),
      userId: currentUser.userId,
      userName: currentUser.name,
      text: data.text.trim(),
      timestamp: new Date().toISOString(),
      color: currentUser.color,
    }

    session.messages.push(message)
    if (session.messages.length > MAX_MESSAGES) session.messages.shift()

    io.to(currentUser.sessionId).emit('message', message)
  })

  // Disconnect
  socket.on('disconnect', () => {
    if (!currentUser) return

    const session = sessions.get(currentUser.sessionId)
    if (session) {
      session.users.delete(currentUser.userId)

      socket.to(currentUser.sessionId).emit('user_left', {
        userId: currentUser.userId,
        name: currentUser.name,
      })
      io.to(currentUser.sessionId).emit('users_update', getSessionUsers(session))

      console.log(`[Collab] ${currentUser.name} left session ${currentUser.sessionId} (${session.users.size} users)`)

      // Clean up empty sessions after 30 minutes
      if (session.users.size === 0) {
        setTimeout(() => {
          const s = sessions.get(currentUser!.sessionId)
          if (s && s.users.size === 0) {
            sessions.delete(currentUser!.sessionId)
            console.log(`[Collab] Session ${currentUser!.sessionId} cleaned up (empty for 30min)`)
          }
        }, 30 * 60 * 1000)
      }
    }

    cleanupOldSessions()
  })
})

httpServer.listen(PORT, () => {
  console.log(`🗺️  EnviroDash Map Collaboration Service`)
  console.log(`   Listening on http://localhost:${PORT}`)
  console.log(`   Max sessions: ${MAX_SESSIONS}`)
  console.log(`   Auto-cleanup: empty sessions after 30 min`)
  console.log(`   Features: cursors, view sync, markers, annotations, chat`)
})
