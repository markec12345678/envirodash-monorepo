import type { NextConfig } from 'next'

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
}

export default nextConfig
