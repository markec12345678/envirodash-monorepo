import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { fetchMarketplace } from '../api/client'

const CATEGORY_LABELS: Record<string, string> = {
  atmospheric: 'Atmospheric', climate: 'Climate', disaster: 'Disaster',
  geological: 'Geological', hydrology: 'Hydrology', industrial: 'Industrial',
  infrastructure: 'Infrastructure', oceanic: 'Oceanic', other: 'Other',
  recreation: 'Recreation', retail: 'Retail', services: 'Services',
  vegetation: 'Vegetation', weather: 'Weather', wildlife: 'Wildlife',
  environment: 'Environment',
}

const CATEGORY_COLORS: Record<string, string> = {
  atmospheric: '#3b82f6', climate: '#06b6d4', disaster: '#ef4444',
  geological: '#f43f5e', hydrology: '#0ea5e9', industrial: '#71717a',
  infrastructure: '#f59e0b', oceanic: '#14b8a6', other: '#71717a',
  recreation: '#a855f7', retail: '#ec4899', services: '#10b981',
  vegetation: '#22c55e', weather: '#0ea5e9', wildlife: '#f97316',
  environment: '#10b981',
}

export default function MarketplaceScreen() {
  const [loading, setLoading] = useState(true)
  const [monitors, setMonitors] = useState<any[]>([])
  const [categories, setCategories] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [filterReal, setFilterReal] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchMarketplace({ limit: 100 })
      setMonitors(data.monitors)
      setCategories(data.categories)
    } catch (e: any) {
      console.error('Marketplace load error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = monitors.filter((m) => {
    if (activeCategory && m.category !== activeCategory) return false
    if (filterReal && !m.realData) return false
    if (search) {
      const hay = `${m.name} ${m.description} ${m.id}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        {item.realData && (
          <View style={styles.realBadge}><Text style={styles.realBadgeText}>REAL</Text></View>
        )}
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <View style={[styles.categoryPill, { backgroundColor: CATEGORY_COLORS[item.category] || '#71717a' }]}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category] || item.category}</Text>
        </View>
        <Text style={styles.source}>{item.dataSource}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#a1a1aa" style={{ marginRight: 6 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search monitors…"
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={() => setFilterReal(!filterReal)} style={[styles.filterBtn, filterReal && { backgroundColor: '#10b981' }]}>
          <Ionicons name="filter" size={14} color={filterReal ? '#fff' : '#71717a'} />
          <Text style={[styles.filterBtnText, { color: filterReal ? '#fff' : '#71717a' }]}>Real</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={{ paddingRight: 12 }}>
        {Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
            style={[styles.catChip, activeCategory === cat && { backgroundColor: '#18181b' }]}
          >
            <Text style={[styles.catChipText, activeCategory === cat && { color: '#fff' }]}>
              {CATEGORY_LABELS[cat] || cat} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No monitors found</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#71717a', fontSize: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f4f4f5' },
  filterBtnText: { fontSize: 11, fontWeight: '600' },
  categoryBar: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e4e4e7', maxHeight: 50 },
  catChip: { backgroundColor: '#f4f4f5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 6 },
  catChipText: { fontSize: 11, color: '#71717a', fontWeight: '500' },
  listContainer: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#18181b', flex: 1 },
  realBadge: { backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  realBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  cardDesc: { fontSize: 11, color: '#71717a', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  source: { fontSize: 10, color: '#a1a1aa', fontStyle: 'italic' },
})
