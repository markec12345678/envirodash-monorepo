import { NextResponse } from 'next/server'
import { fetchTsunami } from '@envirodash/monitor-tsunami/api'

export async function GET() {
  try {
    const data = await fetchTsunami()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
