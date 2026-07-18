import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="earth" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>EnviroDash</Text>
          <Text style={styles.appVersion}>v1.0.0 · Mobile</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <ActionRow
            icon="log-in"
            title="Sign In"
            subtitle="Use demo@envirodash.si / envirodash"
            onPress={() => Linking.openURL('http://localhost:3000')}
            color="#10b981"
          />
          <ActionRow
            icon="globe"
            title="Open Web App"
            subtitle="Open EnviroDash in browser"
            onPress={() => Linking.openURL('http://localhost:3000')}
            color="#0ea5e9"
          />
          <ActionRow
            icon="logo-github"
            title="GitHub Repository"
            subtitle="View source code on GitHub"
            onPress={() => Linking.openURL('https://github.com/markec12345678/envirodash-monorepo')}
            color="#18181b"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          <View style={styles.sourceList}>
            <SourceRow name="Open-Meteo" url="open-meteo.com" />
            <SourceRow name="NOAA NTWC" url="tsunami.gov" />
            <SourceRow name="USGS Earthquakes" url="earthquake.usgs.gov" />
            <SourceRow name="USGS Volcanoes" url="volcanoes.usgs.gov" />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🌍 EnviroDash — Real-time Environmental Monitoring</Text>
          <Text style={styles.footerSub}>MIT License · Powered by open data</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionRow({ icon, title, subtitle, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
    </TouchableOpacity>
  )
}

function SourceRow({ name, url }: { name: string; url: string }) {
  return (
    <View style={styles.sourceRow}>
      <Text style={styles.sourceName}>{name}</Text>
      <Text style={styles.sourceUrl}>{url}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16 },
  header: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
  appVersion: { fontSize: 12, color: '#71717a', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#71717a', textTransform: 'uppercase', padding: 12, letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  actionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionContent: { flex: 1, marginLeft: 12 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: '#18181b' },
  actionSubtitle: { fontSize: 11, color: '#71717a', marginTop: 2 },
  sourceList: { padding: 8 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4 },
  sourceName: { fontSize: 13, color: '#18181b', fontWeight: '500' },
  sourceUrl: { fontSize: 11, color: '#71717a', fontStyle: 'italic' },
  footer: { alignItems: 'center', padding: 24, marginTop: 8 },
  footerText: { fontSize: 12, color: '#71717a', fontWeight: '600' },
  footerSub: { fontSize: 10, color: '#a1a1aa', marginTop: 4 },
})
