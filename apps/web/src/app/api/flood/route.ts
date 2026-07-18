import { NextRequest, NextResponse } from 'next/server'
import { fetchFloods } from '@envirodash/monitor-flood/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region') || undefined
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const name = searchParams.get('name') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : undefined

  try {
    const data = await fetchFloods({
      region: (region as any) || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      name,
      limit,
    })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
