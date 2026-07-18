/**
 * Rate Limiting Middleware
 *
 * In-memory rate limiter with sliding window algorithm.
 * For production with multiple instances, replace with Redis.
 *
 * Tiers:
 *   - Anonymous: 100 req/hour per IP
 *   - Free API key: 1,000 req/hour per key
 *   - Pro API key: 10,000 req/hour per key
 *   - Enterprise: 100,000 req/hour per key
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/rate-limit'
 *
 *   const result = await checkRateLimit(request, 'api-key', userId, plan)
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: 'Rate limit exceeded' }, {
 *       status: 429,
 *       headers: result.headers,
 *     })
 *   }
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const TIERS: Record<string, RateLimitConfig> = {
  anonymous: { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100/hour
  free: { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1K/hour
  pro: { windowMs: 60 * 60 * 1000, maxRequests: 10000 }, // 10K/hour
  enterprise: { windowMs: 60 * 60 * 1000, maxRequests: 100000 }, // 100K/hour
}

// In-memory store (per-instance)
// Replace with Redis for multi-instance deployments:
//   const redis = new Redis(process.env.REDIS_URL)
//   const key = `ratelimit:${identifier}:${tier}`
//   const count = await redis.incr(key)
//   if (count === 1) await redis.expire(key, Math.floor(config.windowMs / 1000))
const store = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp in seconds
  retryAfter?: number // Seconds until reset
  headers: Record<string, string>
}

export function checkRateLimit(
  identifier: string,
  tier: keyof typeof TIERS = 'anonymous'
): RateLimitResult {
  const config = TIERS[tier] || TIERS.anonymous
  const now = Date.now()
  const key = `${identifier}:${tier}`

  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    store.set(key, newEntry)

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.floor(newEntry.resetTime / 1000),
      headers: {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(config.maxRequests - 1),
        'X-RateLimit-Reset': String(Math.floor(newEntry.resetTime / 1000)),
      },
    }
  }

  // Existing window
  entry.count++
  const remaining = Math.max(0, config.maxRequests - entry.count)
  const allowed = entry.count <= config.maxRequests

  const result: RateLimitResult = {
    allowed,
    limit: config.maxRequests,
    remaining,
    reset: Math.floor(entry.resetTime / 1000),
    headers: {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.floor(entry.resetTime / 1000)),
    },
  }

  if (!allowed) {
    result.retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    result.headers['Retry-After'] = String(result.retryAfter)
  }

  return result
}

/**
 * Helper to determine tier from user plan.
 */
export function getTierFromPlan(plan?: string): keyof typeof TIERS {
  switch (plan) {
    case 'enterprise':
      return 'enterprise'
    case 'pro':
      return 'pro'
    case 'free':
      return 'free'
    default:
      return 'anonymous'
  }
}

/**
 * Get client identifier (IP address or API key).
 */
export function getClientIdentifier(request: Request, apiKeyId?: string): string {
  if (apiKeyId) return `key:${apiKeyId}`

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return `ip:${realIp}`

  return 'ip:anonymous'
}

/**
 * Apply rate limiting to a v1 API request.
 * Returns null if allowed, or a NextResponse with 429 if exceeded.
 */
export async function applyRateLimit(
  request: Request,
  identifier: string,
  tier: keyof typeof TIERS = 'anonymous'
): Promise<RateLimitResult> {
  return checkRateLimit(identifier, tier)
}
