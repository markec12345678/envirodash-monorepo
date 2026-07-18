import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Advanced Analytics Endpoint
 *
 * GET /api/analytics/advanced?days=30
 *
 * Returns:
 *   - Cohort analysis (user retention by signup week)
 *   - Feature adoption (which features are used most)
 *   - Funnel analysis (signup → first monitor → first alert → first AI query)
 *   - Geographic distribution (top countries/cities)
 *   - Device breakdown (mobile/desktop/tablet)
 *   - Time-of-day usage heatmap data
 *   - Monitor popularity ranking
 *   - API usage trends
 */

const DATA_DIR = join(process.cwd(), 'data')

interface AnalyticsEvent {
  type: string
  name: string
  userId?: string
  sessionId?: string
  properties?: Record<string, any>
  timestamp: string
  userAgent?: string
  ip?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  try {
    // Load analytics data
    const analyticsFile = join(DATA_DIR, 'analytics.json')
    let events: AnalyticsEvent[] = []
    try {
      const raw = await readFile(analyticsFile, 'utf-8')
      const data = JSON.parse(raw)
      events = data.events || []
    } catch {
      // No data yet
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const recentEvents = events.filter((e) => new Date(e.timestamp) >= cutoff)

    // ==================== Feature Adoption ====================
    const featureCounts: Record<string, number> = {}
    recentEvents.forEach((e) => {
      if (e.type === 'monitor_open' || e.type === 'api_call' || e.type === 'ai_query') {
        const feature = e.type === 'monitor_open' ? `monitor:${e.name}` : e.type
        featureCounts[feature] = (featureCounts[feature] || 0) + 1
      }
    })
    const featureAdoption = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // ==================== Funnel Analysis ====================
    const userFunnel = new Map<string, Set<string>>() // userId -> set of stages
    recentEvents.forEach((e) => {
      if (!e.userId) return
      if (!userFunnel.has(e.userId)) userFunnel.set(e.userId, new Set())
      const stages = userFunnel.get(e.userId)!
      if (e.type === 'page_view') stages.add('visited')
      if (e.type === 'monitor_open') stages.add('opened_monitor')
      if (e.type === 'api_call') stages.add('used_api')
      if (e.type === 'ai_query') stages.add('used_ai')
    })

    const funnel = {
      visited: 0,
      opened_monitor: 0,
      used_api: 0,
      used_ai: 0,
    }
    userFunnel.forEach((stages) => {
      if (stages.has('visited')) funnel.visited++
      if (stages.has('opened_monitor')) funnel.opened_monitor++
      if (stages.has('used_api')) funnel.used_api++
      if (stages.has('used_ai')) funnel.used_ai++
    })

    // ==================== Device Breakdown ====================
    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 }
    recentEvents.forEach((e) => {
      if (!e.userAgent) { deviceCounts.unknown++; return }
      const ua = e.userAgent.toLowerCase()
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) deviceCounts.mobile++
      else if (ua.includes('ipad') || ua.includes('tablet')) deviceCounts.tablet++
      else if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) deviceCounts.desktop++
      else deviceCounts.unknown++
    })

    // ==================== Time-of-day Heatmap ====================
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    recentEvents.forEach((e) => {
      const d = new Date(e.timestamp)
      const day = d.getDay()
      const hour = d.getHours()
      heatmap[day][hour]++
    })

    const heatmapData = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({
          day: dayNames[day],
          dayIdx: day,
          hour,
          count: heatmap[day][hour],
        })
      }
    }

    // ==================== Monitor Popularity ====================
    const monitorCounts: Record<string, number> = {}
    recentEvents
      .filter((e) => e.type === 'monitor_open')
      .forEach((e) => {
        monitorCounts[e.name] = (monitorCounts[e.name] || 0) + 1
      })
    const monitorPopularity = Object.entries(monitorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // ==================== Daily Active Users (DAU) ====================
    const dauData: Array<{ date: string; activeUsers: number; totalEvents: number }> = []
    const dauMap = new Map<string, Set<string>>()
    const eventCountMap = new Map<string, number>()

    recentEvents.forEach((e) => {
      const date = e.timestamp.slice(0, 10)
      if (!dauMap.has(date)) dauMap.set(date, new Set())
      if (e.userId) dauMap.get(date)!.add(e.userId)
      eventCountMap.set(date, (eventCountMap.get(date) || 0) + 1)
    })

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      dauData.push({
        date: dateStr,
        activeUsers: dauMap.get(dateStr)?.size || 0,
        totalEvents: eventCountMap.get(dateStr) || 0,
      })
    }

    // ==================== API Usage Trends ====================
    const apiUsageByType: Record<string, number> = {}
    recentEvents
      .filter((e) => e.type === 'api_call')
      .forEach((e) => {
        apiUsageByType[e.name] = (apiUsageByType[e.name] || 0) + 1
      })
    const apiTrends = Object.entries(apiUsageByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    // ==================== Cohort Analysis (simplified) ====================
    // Group users by first-seen week
    const userFirstSeen = new Map<string, string>() // userId -> first date
    events.forEach((e) => {
      if (!e.userId) return
      const date = e.timestamp.slice(0, 10)
      if (!userFirstSeen.has(e.userId) || date < userFirstSeen.get(e.userId)!) {
        userFirstSeen.set(e.userId, date)
      }
    })

    // Group by week
    const cohorts: Record<string, string[]> = {} // week -> userIds
    userFirstSeen.forEach((firstDate, userId) => {
      const d = new Date(firstDate)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const weekKey = weekStart.toISOString().slice(0, 10)
      if (!cohorts[weekKey]) cohorts[weekKey] = []
      cohorts[weekKey].push(userId)
    })

    const cohortData = Object.entries(cohorts)
      .map(([week, users]) => ({ week, size: users.length }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8) // Last 8 weeks

    return NextResponse.json({
      period: { days, from: cutoff.toISOString(), to: new Date().toISOString() },
      totalEvents: recentEvents.length,
      uniqueUsers: userFunnel.size,
      featureAdoption,
      funnel,
      deviceBreakdown: deviceCounts,
      heatmap: heatmapData,
      monitorPopularity,
      dau: dauData,
      apiTrends,
      cohorts: cohortData,
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
