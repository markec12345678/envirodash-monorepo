import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  fetchAirQuality,
  fetchEarthquakes,
  fetchTsunami,
  fetchWildfire,
  fetchDroughts,
} from '../api/client'

interface QuickStat {
  id: string
  label: string
  value: string
  status: 'stable' | 'moderate' | 'warning' | 'critical'
  icon: keyof typeof Ionicons.glyphMap
  color: string
}

const STATUS_COLORS: Record<string, string> = {
  stable: '#10b981',
  moderate: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<QuickStat[]>([])

  const loadDashboard = async () => {
    try {
      const [aq, quakes, tsunami, wildfire, drought] = await Promise.allSettled([
        fetchAirQuality({ country: 'SI', limit: 1 }),
        fetchEarthquakes({ limit: 10 }),
        fetchTsunami(),
        fetchWildfire({ area: 'europe' }),
        fetchDroughts({ region: 'slovenia', limit: 1 }),
      ])

      const newStats: QuickStat[] = []

      if (aq.status === 'fulfilled' && aq.value.results[0]) {
        const r = aq.value.results[0]
        newStats.push({
          id: 'aq',
          label: 'Ljubljana Air Quality',
          value: `${r.value ?? '—'} AQI`,
          status: r.status,
          icon: 'leaf',
          color: STATUS_COLORS[r.status],
        })
      }

      if (quakes.status === 'fulfilled') {
        const max = quakes.value.results.reduce((m, q) => Math.max(m, q.value ?? 0), 0)
        const status = max >= 6 ? 'critical' : max >= 5 ? 'warning' : max >= 4 ? 'moderate' : 'stable'
        newStats.push({
          id: 'quakes',
          label: 'Earthquakes (24h)',
          value: `${quakes.value.count} max M${max.toFixed(1)}`,
          status,
          icon: 'pulse',
          color: STATUS_COLORS[status],
        })
      }

      if (tsunami.status === 'fulfilled') {
        const count = tsunami.value.count
        newStats.push({
          id: 'tsunami',
          label: 'Tsunami Warnings',
          value: `${count} active`,
          status: count > 0 ? 'critical' : 'stable',
          icon: 'water',
          color: count > 0 ? '#ef4444' : '#10b981',
        })
      }

      if (wildfire.status === 'fulfilled' && wildfire.value.results[0]) {
        const max = wildfire.value.results.reduce((m, w) => Math.max(m, w.value ?? 0), 0)
        const status = max >= 50 ? 'critical' : max >= 30 ? 'warning' : max >= 15 ? 'moderate' : 'stable'
        newStats.push({
          id: 'wildfire',
          label: 'Europe Wildfire Risk',
          value: `Max FWI ${max}`,
          status,
          icon: 'flame',
          color: STATUS_COLORS[status],
        })
      }

      if (drought.status === 'fulfilled' && drought.value.results[0]) {
        const r = drought.value.results[0]
        newStats.push({
          id: 'drought',
          label: 'Slovenia Drought',
          value: `Score ${r.value}/100`,
          status: r.status,
          icon: 'sunny',
          color: STATUS_COLORS[r.status],
        })
      }

      setStats(newStats)
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading environmental data…</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard() }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🌍 EnviroDash</Text>
          <Text style={styles.subtitle}>Real-time environmental monitoring</Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.id} style={[styles.statCard, { borderLeftColor: s.color, borderLeftWidth: 4 }]}>
              <View style={styles.statHeader}>
                <Ionicons name={s.icon} size={24} color={s.color} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <View style={[styles.statusBadge, { backgroundColor: s.color }]}>
                <Text style={styles.statusText}>{s.status.toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Open-Meteo · NOAA · USGS</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f5' },
  loadingText: { marginTop: 12, color: '#71717a', fontSize: 14 },
  scrollView: { flex: 1 },
  header: { padding: 20, backgroundColor: '#10b981' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#d1fae5', marginTop: 4 },
  statsGrid: { padding: 16 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statLabel: { fontSize: 13, color: '#71717a', fontWeight: '500', flex: 1, marginLeft: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 11, color: '#a1a1aa' },
})
