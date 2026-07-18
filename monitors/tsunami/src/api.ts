/**
 * Tsunami Monitor — API client
 * Fetches real-time tsunami warnings from NOAA NTWC and PTWC RSS feeds.
 *
 * @see https://www.tsunami.gov/
 */

import { fetchJson, type MonitorDataResponse, type MonitorLocation } from '@envirodash/core'

const FEEDS = [
  { name: 'NOAA Tsunami.gov RSS', url: 'https://www.tsunami.gov/rss/ntwc.xml' },
  { name: 'PTWC RSS', url: 'https://www.tsunami.gov/rss/ptwc.xml' },
]

export interface TsunamiMessage {
  id: string
  title: string
  link: string
  pubDate: string
  description: string
  msgType: 'warning' | 'watch' | 'advisory' | 'information' | 'cancellation'
  region: string
  severity: 'minor' | 'moderate' | 'severe'
}

export async function fetchTsunami(): Promise<MonitorDataResponse<TsunamiMessage & MonitorLocation>> {
  let messages: TsunamiMessage[] = []
  let usedFeed = ''
  let lastError = ''

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 EnviroDash/1.0',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        cache: 'no-store',
      })
      if (res.ok) {
        const xml = await res.text()
        if (xml && xml.length > 100) {
          messages = parseRss(xml)
          usedFeed = feed.name
          if (messages.length > 0) break
        }
      } else {
        lastError = `${feed.name}: ${res.status}`
      }
    } catch (e: any) {
      lastError = `${feed.name}: ${e.message}`
    }
  }

  const results = messages.map((m) => ({
    ...m,
    id: m.id,
    name: m.title,
    lat: 0,
    lng: 0,
    status: m.msgType === 'warning' ? 'critical' : m.msgType === 'watch' || m.msgType === 'advisory' ? 'warning' : 'stable',
    value: m.severity === 'severe' ? 3 : m.severity === 'moderate' ? 2 : 1,
    unit: 'level',
    lastUpdated: m.pubDate,
    description: m.description,
  }))

  return {
    source: 'NOAA National Tsunami Warning Center',
    count: results.length,
    results,
    fetchedAt: new Date().toISOString(),
    note:
      results.length === 0
        ? 'There are currently no active tsunami warnings. NOAA publishes new warnings within minutes of detection.'
        : undefined,
  }
}

function parseRss(xml: string): TsunamiMessage[] {
  const messages: TsunamiMessage[] = []
  const items = xml.split(/<item[\s>]/i).slice(1)

  for (const item of items) {
    const getTag = (tag: string): string => {
      const m =
        item.match(new RegExp(`<${tag}[^>]*>\\[?CDATA\\[?([^<\\]]*)\\]?\\]?</${tag}>`, 'i')) ||
        item.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'))
      return m ? m[1].trim() : ''
    }

    const title = getTag('title')
    const link = getTag('link')
    const pubDate = getTag('pubDate')
    const description = getTag('description')
    const guid = getTag('guid')
    if (!title) continue

    let msgType: TsunamiMessage['msgType'] = 'information'
    if (/TSUNAMI WARNING/i.test(title)) msgType = 'warning'
    else if (/TSUNAMI WATCH/i.test(title)) msgType = 'watch'
    else if (/TSUNAMI ADVISORY/i.test(title)) msgType = 'advisory'
    else if (/CANCELLATION|CANCEL/i.test(title)) msgType = 'cancellation'
    else if (/INFORMATION/i.test(title)) msgType = 'information'

    let region = 'unknown'
    if (/pacific/i.test(title)) region = 'pacific'
    else if (/atlantic/i.test(title)) region = 'atlantic'
    else if (/caribbean/i.test(title)) region = 'caribbean'
    else if (/indian/i.test(title)) region = 'indian_ocean'
    else if (/mediterranean/i.test(title)) region = 'mediterranean'
    else if (/hawaii/i.test(title)) region = 'hawaii'
    else if (/alaska/i.test(title)) region = 'alaska'
    else if (/west coast|cascadia|california|oregon|washington/i.test(title)) region = 'us_west_coast'

    let severity: TsunamiMessage['severity'] = 'minor'
    if (msgType === 'warning') severity = 'severe'
    else if (msgType === 'watch' || msgType === 'advisory') severity = 'moderate'

    messages.push({
      id: guid || link || title,
      title,
      link,
      pubDate,
      description,
      msgType,
      region,
      severity,
    })
  }

  return messages
}
