'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { MessageSquare, Send, X, Users, Hash, Loader2, Reply, Smile } from 'lucide-react'

interface ChatMessage {
  id: string
  room: string
  userId: string
  userName: string
  text: string
  timestamp: string
  reactions?: Record<string, string[]>
  replyTo?: string
}

interface RoomUser {
  id: string
  name: string
}

const ROOMS = [
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'air-quality', label: 'Air Quality', icon: '💨' },
  { id: 'wildfire', label: 'Wildfire', icon: '🔥' },
  { id: 'earthquake', label: 'Earthquakes', icon: '🌎' },
  { id: 'tsunami', label: 'Tsunami', icon: '🌊' },
  { id: 'volcano', label: 'Volcano', icon: '🌋' },
  { id: 'weather', label: 'Weather', icon: '⛅' },
  { id: 'glacier', label: 'Glacier', icon: '🏔️' },
  { id: 'coral-reef', label: 'Coral Reef', icon: '🐠' },
  { id: 'flood', label: 'Flood', icon: '🌊' },
  { id: 'drought', label: 'Drought', icon: '☀️' },
]

const QUICK_REACTIONS = ['👍', '❤️', '😮', '😢', '🔥', '⚠️']

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [room, setRoom] = useState('global')
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session?.user) return

    const socket = io('/', {
      path: '/?XTransformPort=3004',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join', {
        userId: (session.user as any).id || 'anonymous',
        name: session.user?.name || session.user?.email || 'Anonymous',
        email: session.user?.email,
        room,
      })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('message_history', (data: { room: string; messages: ChatMessage[] }) => {
      setMessages(data.messages)
    })

    socket.on('message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg].slice(-100))
    })

    socket.on('room_users', (users: RoomUser[]) => {
      setRoomUsers(users)
    })

    socket.on('user_typing', ({ userId, name }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: name }))
    })

    socket.on('user_stopped_typing', ({ userId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    })

    socket.on('reaction_update', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      )
    })

    return () => {
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !socketRef.current) return
    socketRef.current.emit('send_message', { text: input, replyTo: replyTo?.id })
    setInput('')
    setReplyTo(null)
    socketRef.current.emit('typing', false)
  }

  const switchRoom = (newRoom: string) => {
    setRoom(newRoom)
    setMessages([])
    setTypingUsers({})
    socketRef.current?.emit('switch_room', newRoom)
  }

  const handleTyping = (value: string) => {
    setInput(value)
    if (socketRef.current) {
      socketRef.current.emit('typing', value.length > 0)
    }
  }

  const react = (messageId: string, emoji: string) => {
    socketRef.current?.emit('react', { messageId, emoji })
  }

  if (!session?.user) {
    return (
      <div className="fixed bottom-4 right-4 z-[70] flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-base font-bold">💬 Community Chat</h2>
          </div>
          {onClose && <button onClick={onClose} className="rounded-md p-1 hover:bg-white/20"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
          <div>
            <MessageSquare className="mx-auto mb-2 h-12 w-12 text-zinc-400" />
            <p className="text-sm font-medium">Sign in to join the conversation</p>
            <p className="mt-1 text-xs">Discuss environmental events with other users in real-time</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex h-[600px] w-[400px] flex-col overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-white shadow-2xl dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-bold">💬 Community Chat</span>
            <span className={`ml-1 h-2 w-2 rounded-full ${connected ? 'bg-emerald-300' : 'bg-red-400'}`} />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-100">
            <Users className="h-3 w-3" />
            {roomUsers.length} online
            {onClose && <button onClick={onClose} className="ml-1 rounded p-0.5 hover:bg-white/20"><X className="h-4 w-4" /></button>}
          </div>
        </div>

        {/* Room selector */}
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => switchRoom(r.id)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                room === r.id
                  ? 'bg-white text-emerald-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current room indicator */}
      <div className="flex items-center gap-1 border-b bg-zinc-50 px-3 py-1.5 dark:bg-zinc-950/30">
        <Hash className="h-3 w-3 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{room}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-zinc-400">
            <div>
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-xs">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === (session.user as any).id
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isOwn ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                }`}>
                  {!isOwn && (
                    <div className="mb-0.5 text-[10px] font-bold opacity-70">{msg.userName}</div>
                  )}
                  {msg.replyTo && (
                    <div className={`mb-1 border-l-2 pl-2 text-[10px] opacity-60 ${isOwn ? 'border-white' : 'border-zinc-400'}`}>
                      Reply to message
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-[9px] ${isOwn ? 'text-emerald-100' : 'text-zinc-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className={`opacity-0 hover:opacity-100 ${isOwn ? 'text-emerald-100' : 'text-zinc-400'}`}
                      title="Reply"
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          onClick={() => react(msg.id, emoji)}
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            isOwn ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-700'
                          }`}
                        >
                          {emoji} {userIds.length}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Quick reactions */}
                  <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity hover:opacity-100">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => react(msg.id, emoji)}
                        className="rounded p-0.5 text-[10px] hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-[10px] text-zinc-500 dark:bg-zinc-800">
              {Object.values(typingUsers).slice(0, 2).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t bg-zinc-50 px-3 py-1.5 dark:bg-zinc-950/30">
          <Reply className="h-3 w-3 text-zinc-400" />
          <span className="flex-1 truncate text-[10px] text-zinc-500">
            Replying to {replyTo.userName}: {replyTo.text.slice(0, 50)}...
          </span>
          <button onClick={() => setReplyTo(null)} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t bg-white p-2 dark:bg-zinc-900">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder={`Message #${room}...`}
            maxLength={1000}
            disabled={!connected}
            className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={!input.trim() || !connected}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel
