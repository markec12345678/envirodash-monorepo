import { NextRequest, NextResponse } from 'next/server'
import { fetchWildfire } from '@envirodash/monitor-wildfire/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const area = searchParams.get('area') || undefined
  const country = searchParams.get('country') || undefined

  try {
    const data = await fetchWildfire({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      area,
      country,
    })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
