import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { askAI } from '../api/client'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: { monitor?: string; summary?: string }
}

const SUGGESTED = [
  'Kakšna je kakovost zraka v Ljubljani?',
  'Ali so v Evropi požari?',
  'Kateri potresi so se zgodili danes?',
  'Ali obstaja nevarnost cunamija?',
  'Kakšno je vreme v Mariboru?',
  'Prikaži aktivne vulkane',
]

export default function AIScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Pozdravljen! Sem EnviroDash AI. Vprašaj me o okoljskih podatkih.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await askAI(text, messages.map((m) => ({ role: m.role, content: m.content })))
      const r = data.response || {}
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: r.answer || 'No response',
        action: r.action === 'open_monitor' && r.monitor ? { monitor: r.monitor, summary: r.summary } : undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Napaka: ${e.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages, loading])

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.message, item.role === 'user' ? styles.userMsg : styles.assistantMsg]}>
      <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
        {item.content}
      </Text>
      {item.action && (
        <View style={styles.actionPill}>
          <Ionicons name="location" size={12} color="#fff" />
          <Text style={styles.actionText}>{item.action.summary || item.action.monitor}</Text>
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={styles.headerTitle}>✨ EnviroDash AI</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
      />

      {messages.length <= 1 && (
        <View style={styles.suggestions}>
          {SUGGESTED.map((q) => (
            <TouchableOpacity key={q} style={styles.suggestionPill} onPress={() => send(q)}>
              <Text style={styles.suggestionText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Vprašaj o okolju…"
            style={styles.input}
            onSubmitEditing={() => send(input)}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
            onPress={() => send(input)}
            disabled={loading || !input.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: '#8b5cf6' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  messageList: { padding: 12 },
  message: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#8b5cf6' },
  assistantMsg: { alignSelf: 'flex-start', backgroundColor: '#f4f4f5' },
  messageText: { fontSize: 14 },
  userText: { color: '#fff' },
  assistantText: { color: '#18181b' },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start',
  },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  suggestions: { padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionPill: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginBottom: 4 },
  suggestionText: { fontSize: 11, color: '#6d28d9' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e4e4e7' },
  input: { flex: 1, backgroundColor: '#f4f4f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
})
