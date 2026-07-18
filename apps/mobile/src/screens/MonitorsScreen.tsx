import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as api from '../api/client'
import type { MonitorLocation } from '@envirodash/core'

const MONITORS = [
  { id: 'air-quality', name: 'Air Quality', icon: 'leaf' as const, color: '#10b981', fetch: () => api.fetchAirQuality({ country: 'SI', limit: 8 }) },
  { id: 'wildfire', name: 'Wildfire Risk', icon: 'flame' as const, color: '#f97316', fetch: () => api.fetchWildfire({ area: 'europe' }) },
  { id: 'tsunami', name: 'Tsunami', icon: 'water' as const, color: '#06b6d4', fetch: () => api.fetchTsunami() },
  { id: 'volcano', name: 'Volcano', icon: 'triangle' as const, color: '#f43f5e', fetch: () => api.fetchVolcanoes() },
  { id: 'earthquake', name: 'Earthquakes', icon: 'pulse' as const, color: '#f59e0b', fetch: () => api.fetchEarthquakes({ limit: 20 }) },
  { id: 'weather', name: 'Weather', icon: 'partly-sunny' as const, color: '#0ea5e9', fetch: () => api.fetchWeather(46.0569, 14.5058, 'Ljubljana') },
  { id: 'glacier', name: 'Glacier', icon: 'snow' as const, color: '#06b6d4', fetch: () => api.fetchGlaciers({ region: 'alps' }) },
  { id: 'coral-reef', name: 'Coral Reef', icon: 'fish' as const, color: '#ec4899', fetch: () => api.fetchCoralReefs({ region: 'pacific', limit: 5 }) },
  { id: 'flood', name: 'Flood Risk', icon: 'water' as const, color: '#0ea5e9', fetch: () => api.fetchFloods({ region: 'europe' }) },
  { id: 'drought', name: 'Drought', icon: 'sunny' as const, color: '#f59e0b', fetch: () => api.fetchDroughts({ region: 'slovenia' }) },
]

export default function MonitorsScreen() {
  const [selected, setSelected] = useState(MONITORS[0])
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<MonitorLocation[]>([])

  const loadMonitor = async (monitor: typeof MONITORS[0]) => {
    setLoading(true)
    setLocations([])
    try {
      const data = await monitor.fetch()
      setLocations(data.results || [])
    } catch (e: any) {
      console.error('Monitor load error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonitor(selected)
  }, [selected.id])

  const renderItem = ({ item }: { item: MonitorLocation }) => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      </View>
      {item.value != null && (
        <Text style={[styles.locationValue, { color: getStatusColor(item.status) }]}>
          {item.value} <Text style={styles.locationUnit}>{item.unit || ''}</Text>
        </Text>
      )}
      {item.description && (
        <Text style={styles.locationDesc} numberOfLines={2}>{item.description}</Text>
      )}
      {item.lastUpdated && (
        <Text style={styles.locationTime}>
          {new Date(item.lastUpdated).toLocaleString()}
        </Text>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.monitorTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MONITORS.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setSelected(m)}
              style={[
                styles.tab,
                selected.id === m.id ? { backgroundColor: m.color } : { backgroundColor: '#fff' },
              ]}
            >
              <Ionicons name={m.icon} size={14} color={selected.id === m.id ? '#fff' : '#71717a'} />
              <Text style={[styles.tabText, { color: selected.id === m.id ? '#fff' : '#71717a' }]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={selected.color} />
          <Text style={styles.loadingText}>Loading {selected.name}…</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadMonitor(selected)} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#71717a'
}

const STATUS_COLORS: Record<string, string> = {
  stable: '#10b981',
  moderate: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#71717a', fontSize: 14 },
  monitorTabs: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  tabText: { fontSize: 12, fontWeight: '600' },
  listContainer: { padding: 12 },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  locationName: { fontSize: 14, fontWeight: '600', color: '#18181b', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  locationValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  locationUnit: { fontSize: 11, color: '#71717a', fontWeight: 'normal' },
  locationDesc: { fontSize: 11, color: '#71717a', marginBottom: 4 },
  locationTime: { fontSize: 10, color: '#a1a1aa' },
  emptyText: { color: '#71717a', fontSize: 14 },
})
