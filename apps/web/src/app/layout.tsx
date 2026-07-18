import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './_components/Providers'
import { PWAInstallBanner } from './_components/PWAInstallBanner'
import { OfflineIndicator } from './_components/OfflineIndicator'

export const metadata: Metadata = {
  title: 'EnviroDash — Real-time Environmental Monitoring',
  description:
    'EnviroDash is a real-time environmental monitoring platform: air quality, wildfires, tsunamis, volcanoes, earthquakes and 10+ climate indicators on an interactive map. Powered by Open-Meteo, NOAA, and USGS.',
  keywords: [
    'EnviroDash',
    'Air Quality',
    'AQI',
    'PM2.5',
    'Wildfires',
    'Tsunami',
    'Volcano',
    'Earthquake',
    'Climate',
    'Environmental Monitoring',
  ],
  authors: [{ name: 'EnviroDash' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'EnviroDash',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>
          {children}
          <PWAInstallBanner />
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  )
}
