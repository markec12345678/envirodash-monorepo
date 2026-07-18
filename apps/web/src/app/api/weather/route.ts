import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@envirodash/monitor-weather/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const name = searchParams.get('name') || undefined

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  try {
    const data = await fetchWeather({ lat: parseFloat(lat), lng: parseFloat(lng), name })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
