'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

/**
 * useDataStream — real-time data streaming hook.
 *
 * Subscribes to environmental data channels via WebSocket (port 3006).
 * Receives live updates instead of polling.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useDataStream('air-quality:SI')
 *   const { data } = useDataStream('earthquake')
 *   const { data } = useDataStream(['air-quality:SI', 'tsunami'])
 */

interface StreamState<T = any> {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  refresh: () => void
}

export function useDataStream<T = any>(channels: string | string[]): StreamState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const channelList = Array.isArray(channels) ? channels : [channels]

  useEffect(() => {
    const socket = io('/', {
      path: '/?XTransformPort=3006',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setError(null)
      socket.emit('subscribe', { channels: channelList })
    })

    socket.on('data_update', (payload: { channel: string; data: T; timestamp: string; cached?: boolean }) => {
      setData(payload.data)
      setLastUpdate(new Date(payload.timestamp))
      setLoading(false)
    })

    socket.on('connect_error', () => {
      setError('Connection failed — falling back to REST API')
      setLoading(false)
    })

    socket.on('disconnect', () => {
      setError('Disconnected from data stream')
    })

    return () => {
      socket.emit('unsubscribe', { channels: channelList })
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(channelList)])

  const refresh = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { channels: channelList })
    }
  }, [channelList])

  return { data, loading, error, lastUpdate, refresh }
}

/**
 * useLiveEarthquakes — convenience hook for live earthquake data.
 */
export function useLiveEarthquakes() {
  return useDataStream('earthquake')
}

/**
 * useLiveTsunami — convenience hook for live tsunami warnings.
 */
export function useLiveTsunami() {
  return useDataStream('tsunami')
}

/**
 * useLiveAirQuality — convenience hook for live air quality by country.
 */
export function useLiveAirQuality(country: string = 'SI') {
  return useDataStream(`air-quality:${country}`)
}

/**
 * useLiveWildfire — convenience hook for live wildfire risk by area.
 */
export function useLiveWildfire(area: string = 'europe') {
  return useDataStream(`wildfire:${area}`)
}
