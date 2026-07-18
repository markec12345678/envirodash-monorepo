import { NextRequest, NextResponse } from 'next/server'
import { fetchAirQuality } from '@envirodash/monitor-air-quality/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const country = searchParams.get('country') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : undefined

  try {
    const data = await fetchAirQuality({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      country,
      limit,
    })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
