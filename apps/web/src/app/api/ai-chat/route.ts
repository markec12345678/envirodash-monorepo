import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * EnviroDash AI Assistant — natural language environmental queries.
 *
 * POST /api/ai-chat
 * Body: { "message": "Prikaži vsa mesta v Sloveniji s PM2.5 > 25" }
 *
 * The assistant has knowledge of:
 *  - Available monitors (air-quality, wildfire, tsunami, volcano, earthquake, weather)
 *  - How to call each monitor's API endpoint
 *  - Geographic context (Slovenian cities, European capitals, world regions)
 *
 * It returns either:
 *  - A direct textual answer (for general questions)
 *  - A JSON action: { "action": "open_monitor", "monitor": "air-quality", "params": {...} }
 *    that the frontend can execute to display the relevant monitor panel.
 */

const SYSTEM_PROMPT = `You are EnviroDash AI, an environmental monitoring assistant integrated into the EnviroDash platform.

Your role:
- Help users understand real-time environmental conditions worldwide
- Translate natural-language queries into actions on the EnviroDash platform
- Provide context about air quality, wildfires, tsunamis, volcanoes, earthquakes, and weather

Available monitors and their APIs (all return real-time data):
1. air-quality — PM2.5, PM10, NO2, SO2, O3, CO, US AQI from Open-Meteo Air Quality API
   - GET /api/air-quality?lat=LAT&lng=LNG (single point)
   - GET /api/air-quality?country=SI (Slovenian cities: Ljubljana, Maribor, Celje, Kranj, Koper, Novo Mesto, Velenje, Murska Sobota)
   - GET /api/air-quality?country=DE|IT|FR|GB|US (other countries)
2. wildfire — Fire Weather Index (0-100) from Open-Meteo Forecast API
   - GET /api/wildfire?lat=LAT&lng=LNG
   - GET /api/wildfire?area=europe|california|australia|slovenia
3. tsunami — Active tsunami warnings from NOAA NTWC
   - GET /api/tsunami
4. volcano — Volcano alerts from USGS Volcano Hazards Program
   - GET /api/volcano
5. earthquake — Recent earthquakes (M2.5+, last 24h) from USGS
   - GET /api/earthquake?minMagnitude=2.5&limit=50
6. weather — Current weather from Open-Meteo Forecast
   - GET /api/weather?lat=LAT&lng=LNG&name=NAME

AQI reference (US AQI):
- 0-50: Good (stable, green)
- 51-100: Moderate (moderate, blue)
- 101-150: Unhealthy for sensitive groups (warning, amber)
- 151-200: Unhealthy (critical, red)
- 201-300: Very unhealthy (critical, red)
- 301+: Hazardous (critical, red)

FWI reference (Fire Weather Index, 0-100):
- 0-19: Low risk (stable)
- 20-39: Moderate risk (moderate)
- 40-64: High risk (warning)
- 65+: Extreme risk (critical)

When a user asks a question, respond with a JSON object in this exact format:
{
  "answer": "Brief natural-language answer to the question",
  "action": "open_monitor" | "none",
  "monitor": "air-quality" | "wildfire" | "tsunami" | "volcano" | "earthquake" | "weather" | null,
  "params": { "lat": number, "lng": number, "name": string, "country": string, "area": string } | null,
  "summary": "One-line summary suitable for a UI card"
}

Examples:
User: "Kakšna je kakovost zraka v Ljubljani?"
Response: { "answer": "Preverjam kakovost zraka v Ljubljani...", "action": "open_monitor", "monitor": "air-quality", "params": { "country": "SI" }, "summary": "Air Quality · Slovenia" }

User: "Ali so v Evropi trenutno požari?"
Response: { "answer": "Preverjam požarno nevarnost v evropskih mestih...", "action": "open_monitor", "monitor": "wildfire", "params": { "area": "europe" }, "summary": "Wildfire Risk · Europe" }

User: "Kateri potresi so se zgodili danes?"
Response: { "answer": "Pridobivam seznam nedavnih potresov...", "action": "open_monitor", "monitor": "earthquake", "params": { "limit": 20 }, "summary": "Earthquakes · Last 24h" }

User: "Ali obstaja nevarnost cunamija?"
Response: { "answer": "Preverjam NOAA cunami alarme...", "action": "open_monitor", "monitor": "tsunami", "params": null, "summary": "Tsunami Warnings · Global" }

User: "Kakšno je vreme v Mariboru?"
Response: { "answer": "Preverjam vreme v Mariboru...", "action": "open_monitor", "monitor": "weather", "params": { "lat": 46.5547, "lng": 15.6459, "name": "Maribor" }, "summary": "Weather · Maribor" }

If the question is not about environmental data, still respond in JSON format with action: "none" and provide a helpful answer.

Always respond in the same language as the user's question (Slovenian for Slovenian queries, English for English).`;

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required and must be a string' }, { status: 400 })
    }

    // Initialize the ZAI SDK
    const zai = await ZAI.create()

    // Build conversation: system prompt + history + new user message
    const messages = [
      { role: 'assistant', content: SYSTEM_PROMPT },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const rawResponse = completion.choices[0]?.message?.content || ''

    // Try to parse as JSON; if it fails, wrap as a plain-text answer
    let parsed: any
    try {
      // Strip markdown code fences if present
      const cleaned = rawResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        answer: rawResponse,
        action: 'none',
        monitor: null,
        params: null,
        summary: 'AI response',
      }
    }

    return NextResponse.json({
      success: true,
      response: parsed,
      raw: rawResponse,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process AI request',
        response: {
          answer: 'Oprostite, prišlo je do napake pri obdelavi vašega vprašanja. Poskusite znova.',
          action: 'none',
          monitor: null,
          params: null,
          summary: 'Error',
        },
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'EnviroDash AI Assistant',
    description: 'Natural-language interface for environmental monitoring data',
    usage: 'POST with { "message": "your question" }',
    examples: [
      'Kakšna je kakovost zraka v Ljubljani?',
      'Ali so v Evropi trenutno požari?',
      'Kateri potresi so se zgodili danes?',
      'Ali obstaja nevarnost cunamija?',
      "What's the weather in Paris?",
    ],
  })
}
