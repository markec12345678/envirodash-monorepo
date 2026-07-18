import type { Metadata } from 'next'
import './globals.css'

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
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  )
}
