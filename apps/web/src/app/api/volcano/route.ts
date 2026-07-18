import { NextResponse } from 'next/server'
import { fetchVolcanoes } from '@envirodash/monitor-volcano/api'

export async function GET() {
  try {
    const data = await fetchVolcanoes()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
