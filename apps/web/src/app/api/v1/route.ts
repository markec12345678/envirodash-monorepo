import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '../user/api-keys/route'
import { fetchJson } from '@envirodash/core'
import { checkRateLimit, getClientIdentifier, getTierFromPlan } from '@/lib/rate-limit'
import { track } from '@/lib/analytics'

/**
 * EnviroDash REST API v1
 *
 * All v1 endpoints require an API key passed as Bearer token:
 *   Authorization: Bearer ed_live_xxxxxxxxxxxxxxxx
 *
 * GET /api/v1?type=air-quality&country=SI
 * GET /api/v1?type=earthquake&limit=50
 * GET /api/v1?type=tsunami
 * GET /api/v1?type=volcano
 * GET /api/v1?type=wildfire&area=europe
 * GET /api/v1?type=weather&lat=46.05&lng=14.50
 *
 * Returns JSON with rate-limit headers.
 */

const baseUrl = `http://localhost:${process.env.PORT || 3000}`

const ENDPOINT_MAP: Record<string, (params: URLSearchParams) => string> = {
  'air-quality': (p) => p.get('lat') && p.get('lng')
    ? `${baseUrl}/api/air-quality?lat=${p.get('lat')}&lng=${p.get('lng')}`
    : `${baseUrl}/api/air-quality?country=${p.get('country') || 'SI'}&limit=${p.get('limit') || '50'}`,
  'wildfire': (p) => p.get('lat') && p.get('lng')
    ? `${baseUrl}/api/wildfire?lat=${p.get('lat')}&lng=${p.get('lng')}`
    : `${baseUrl}/api/wildfire?area=${p.get('area') || 'europe'}`,
  'earthquake': (p) => `${baseUrl}/api/earthquake?minMagnitude=${p.get('minMagnitude') || '2.5'}&limit=${p.get('limit') || '50'}`,
  'tsunami': () => `${baseUrl}/api/tsunami`,
  'volcano': () => `${baseUrl}/api/volcano`,
  'weather': (p) => `${baseUrl}/api/weather?lat=${p.get('lat')}&lng=${p.get('lng')}&name=${p.get('name') || 'Point'}`,
  'glacier': (p) => `${baseUrl}/api/glacier?region=${p.get('region') || 'all'}`,
  'coral-reef': (p) => `${baseUrl}/api/coral-reef?region=${p.get('region') || 'all'}`,
  'flood': (p) => `${baseUrl}/api/flood?region=${p.get('region') || 'europe'}`,
  'drought': (p) => `${baseUrl}/api/drought?region=${p.get('region') || 'slovenia'}`,
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Validate API key
  const authHeader = request.headers.get('authorization')
  const { valid, userId, keyId } = await validateApiKey(authHeader)

  if (!valid) {
    return NextResponse.json(
      {
        error: 'Invalid or missing API key',
        hint: 'Generate a key at /api/user/api-keys and pass it as: Authorization: Bearer ed_live_xxx',
      },
      { status: 401 }
    )
  }

  // Determine rate limit tier (default: free for valid API keys)
  const tier = getTierFromPlan('free')
  const identifier = getClientIdentifier(request, keyId)

  // Check rate limit
  const rateLimit = checkRateLimit(identifier, tier)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit: rateLimit.limit,
        reset: rateLimit.reset,
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: rateLimit.headers,
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'air-quality'

  const urlBuilder = ENDPOINT_MAP[type]
  if (!urlBuilder) {
    return NextResponse.json(
      {
        error: `Unknown type: ${type}`,
        validTypes: Object.keys(ENDPOINT_MAP),
      },
      { status: 400 }
    )
  }

  try {
    const data = await fetchJson<any>(urlBuilder(searchParams), {
      headers: { 'User-Agent': 'EnviroDash-API-v1/1.0' },
      cache: 'no-store',
    })

    // Track API call for analytics
    track({
      type: 'api_call',
      name: type,
      userId,
      properties: { keyId, responseTimeMs: Date.now() - startTime },
    })

    const response = NextResponse.json({
      apiVersion: 'v1',
      type,
      authenticatedAs: userId,
      keyId,
      data,
      fetchedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
    })

    // Apply rate limit headers
    Object.entries(rateLimit.headers).forEach(([k, v]) => {
      response.headers.set(k, v)
    })

    return response
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Upstream fetch failed', details: e.message },
      { status: 502 }
    )
  }
}
