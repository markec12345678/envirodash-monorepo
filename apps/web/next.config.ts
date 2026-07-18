import type { NextConfig } from 'next'

/**
 * Next.js config with Sentry integration.
 * Sentry is automatically wrapped via @sentry/nextjs when SENTRY_DSN env var is set.
 * If SENTRY_DSN is not set, the Sentry wrappers become no-ops.
 *
 * To enable Sentry:
 * 1. Sign up at https://sentry.io
 * 2. Set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN env vars
 * 3. Rebuild the app
 */

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  transpilePackages: [
    '@envirodash/core',
    '@envirodash/monitor-air-quality',
    '@envirodash/monitor-wildfire',
    '@envirodash/monitor-tsunami',
    '@envirodash/monitor-volcano',
    '@envirodash/monitor-earthquake',
    '@envirodash/monitor-weather',
    '@envirodash/monitor-glacier',
    '@envirodash/monitor-coral-reef',
    '@envirodash/monitor-flood',
    '@envirodash/monitor-drought',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Headers for security and PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ]
  },
}

// Wrap with Sentry config (no-op if SENTRY_DSN is not set)
export default process.env.SENTRY_DSN
  ? require('@sentry/nextjs').withSentryConfig(nextConfig, {
      // Sentry webpack plugin options
      silent: true,
      hideSourceMaps: true,
      widenClientFileUpload: true,
    })
  : nextConfig
