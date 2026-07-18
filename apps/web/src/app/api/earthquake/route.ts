import { NextRequest, NextResponse } from 'next/server'
import { fetchEarthquakes } from '@envirodash/monitor-earthquake/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const minMagnitude = searchParams.get('minMagnitude')
  const limit = searchParams.get('limit')

  try {
    const data = await fetchEarthquakes({
      minMagnitude: minMagnitude ? parseFloat(minMagnitude) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
