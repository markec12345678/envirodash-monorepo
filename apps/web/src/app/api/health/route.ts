import { NextResponse } from 'next/server'

/**
 * Health check endpoint for load balancers and Docker.
 * GET /api/health
 *
 * Returns 200 OK with status info if the service is healthy.
 */

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'envirodash-web',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    env: process.env.NODE_ENV,
  })
}
