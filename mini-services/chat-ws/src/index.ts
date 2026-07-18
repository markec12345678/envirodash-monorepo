/**
 * EnviroDash Real-time Chat Service
 *
 * WebSocket service for collaborative chat between EnviroDash users.
 * Features:
 *   - Global environmental discussion room
 *   - Per-monitor topic rooms (air-quality, wildfire, earthquake, etc.)
 *   - User presence (online/offline)
 *   - Message history (last 100 per room)
 *   - Typing indicators
 *   - Message reactions
 *
 * Port: 3004
 */

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const PORT = 3004

interface ChatUser {
  id: string
  socketId: string
  name: string
  email?: string
  room: string
  joinedAt: number
}

interface ChatMessage {
  id: string
  room: string
  userId: string
  userName: string
  text: string
  timestamp: string
  reactions?: Record<string, string[]> // emoji -> userIds
  replyTo?: string
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'envirodash-chat-ws', port: PORT, users: users.size, rooms: rooms.size }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'envirodash-chat-ws', uptime: process.uptime() }))
})

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// State
const users = new Map<string, ChatUser>() // socketId -> user
const rooms = new Map<string, Set<string>>() // roomName -> set of socketIds
const messageHistory = new Map<string, ChatMessage[]>() // roomName -> messages (last 100)

const DEFAULT_ROOMS = [
  'global',
  'air-quality',
  'wildfire',
  'earthquake',
  'tsunami',
  'volcano',
  'weather',
  'glacier',
  'coral-reef',
  'flood',
  'drought',
]

// Initialize default rooms
DEFAULT_ROOMS.forEach((room) => {
  rooms.set(room, new Set())
  messageHistory.set(room, [])
})

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getRoomUsers(room: string): Array<{ id: string; name: string }> {
  const socketIds = rooms.get(room) || new Set()
  const roomUsers: Array<{ id: string; name: string }> = []
  for (const sid of socketIds) {
    const u = users.get(sid)
    if (u) roomUsers.push({ id: u.id, name: u.name })
  }
  return roomUsers
}

io.on('connection', (socket: Socket) => {
  console.log(`[Chat] Client connected: ${socket.id}`)

  // User joins with identity
  socket.on('join', (data: { userId: string; name: string; email?: string; room?: string }) => {
    const room = data.room || 'global'

    // Leave previous room
    const prevUser = users.get(socket.id)
    if (prevUser) {
      const prevRoom = rooms.get(prevUser.room)
      prevRoom?.delete(socket.id)
      socket.leave(prevUser.room)
      io.to(prevUser.room).emit('user_left', { userId: prevUser.id, name: prevUser.name })
      io.to(prevUser.room).emit('room_users', getRoomUsers(prevUser.room))
    }

    // Join new room
    if (!rooms.has(room)) {
      rooms.set(room, new Set())
      messageHistory.set(room, [])
    }
    rooms.get(room)!.add(socket.id)
    socket.join(room)

    const user: ChatUser = {
      id: data.userId,
      socketId: socket.id,
      name: data.name,
      email: data.email,
      room,
      joinedAt: Date.now(),
    }
    users.set(socket.id, user)

    // Send message history
    const history = messageHistory.get(room) || []
    socket.emit('message_history', { room, messages: history })

    // Send room users
    io.to(room).emit('room_users', getRoomUsers(room))

    // Notify others
    socket.to(room).emit('user_joined', { userId: user.id, name: user.name })
    console.log(`[Chat] ${user.name} joined room: ${room}`)
  })

  // Send message
  socket.on('send_message', (data: { text: string; replyTo?: string }) => {
    const user = users.get(socket.id)
    if (!user) return
    if (!data.text || data.text.trim().length === 0) return
    if (data.text.length > 1000) return // Max 1000 chars

    const message: ChatMessage = {
      id: generateId(),
      room: user.room,
      userId: user.id,
      userName: user.name,
      text: data.text.trim(),
      timestamp: new Date().toISOString(),
      replyTo: data.replyTo,
    }

    // Store in history (max 100 per room)
    const history = messageHistory.get(user.room) || []
    history.push(message)
    if (history.length > 100) history.shift()
    messageHistory.set(user.room, history)

    // Broadcast to room
    io.to(user.room).emit('message', message)
    console.log(`[Chat] ${user.name} in ${user.room}: ${data.text.slice(0, 50)}...`)
  })

  // Typing indicator
  let typingTimeout: NodeJS.Timeout | null = null
  socket.on('typing', (isTyping: boolean) => {
    const user = users.get(socket.id)
    if (!user) return

    if (isTyping) {
      socket.to(user.room).emit('user_typing', { userId: user.id, name: user.name })
      if (typingTimeout) clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        socket.to(user.room).emit('user_stopped_typing', { userId: user.id })
      }, 5000)
    } else {
      socket.to(user.room).emit('user_stopped_typing', { userId: user.id })
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  })

  // React to message
  socket.on('react', (data: { messageId: string; emoji: string }) => {
    const user = users.get(socket.id)
    if (!user) return

    const history = messageHistory.get(user.room) || []
    const msg = history.find((m) => m.id === data.messageId)
    if (!msg) return

    if (!msg.reactions) msg.reactions = {}
    if (!msg.reactions[data.emoji]) msg.reactions[data.emoji] = []

    const idx = msg.reactions[data.emoji].indexOf(user.id)
    if (idx >= 0) {
      msg.reactions[data.emoji].splice(idx, 1)
      if (msg.reactions[data.emoji].length === 0) delete msg.reactions[data.emoji]
    } else {
      msg.reactions[data.emoji].push(user.id)
    }

    io.to(user.room).emit('reaction_update', {
      messageId: msg.id,
      reactions: msg.reactions,
    })
  })

  // Switch room
  socket.on('switch_room', (newRoom: string) => {
    const user = users.get(socket.id)
    if (!user || user.room === newRoom) return

    // Leave old room
    rooms.get(user.room)?.delete(socket.id)
    socket.leave(user.room)
    io.to(user.room).emit('user_left', { userId: user.id, name: user.name })
    io.to(user.room).emit('room_users', getRoomUsers(user.room))

    // Join new room
    if (!rooms.has(newRoom)) {
      rooms.set(newRoom, new Set())
      messageHistory.set(newRoom, [])
    }
    rooms.get(newRoom)!.add(socket.id)
    socket.join(newRoom)
    user.room = newRoom

    // Send history and users
    const history = messageHistory.get(newRoom) || []
    socket.emit('message_history', { room: newRoom, messages: history })
    io.to(newRoom).emit('room_users', getRoomUsers(newRoom))
    socket.to(newRoom).emit('user_joined', { userId: user.id, name: user.name })
  })

  // Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    if (user) {
      rooms.get(user.room)?.delete(socket.id)
      io.to(user.room).emit('user_left', { userId: user.id, name: user.name })
      io.to(user.room).emit('room_users', getRoomUsers(user.room))
      console.log(`[Chat] ${user.name} disconnected from ${user.room}`)
    }
    users.delete(socket.id)
    if (typingTimeout) clearTimeout(typingTimeout)
  })
})

httpServer.listen(PORT, () => {
  console.log(`💬 EnviroDash Chat WebSocket Service`)
  console.log(`   Listening on http://localhost:${PORT}`)
  console.log(`   Default rooms: ${DEFAULT_ROOMS.join(', ')}`)
  console.log(`   Max messages per room: 100`)
  console.log(`   Max message length: 1000 chars`)
})
