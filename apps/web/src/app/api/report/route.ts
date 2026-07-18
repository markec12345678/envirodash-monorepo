import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { fetchJson } from '@envirodash/core'

/**
 * Generate an Environmental Summary PDF Report.
 *
 * GET /api/report?lat=46.0569&lng=14.5058&name=Ljubljana&days=7
 *
 * The report includes:
 *   - Cover page with location name and timestamp
 *   - Current weather conditions
 *   - Current air quality (PM2.5, AQI)
 *   - Fire weather risk
 *   - Recent earthquakes (within 500km, last 24h)
 *   - Active tsunami warnings
 *   - Historical trends (7-day AQI summary)
 *   - Data sources attribution
 */

const STATUS_COLORS = {
  stable: rgb(0.063, 0.722, 0.502), // emerald-500
  moderate: rgb(0.231, 0.510, 0.965), // blue-500
  warning: rgb(0.961, 0.620, 0.043), // amber-500
  critical: rgb(0.937, 0.267, 0.231), // red-500
}

function statusColor(status: string) {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.stable
}

function statusLabel(status: string): string {
  return {
    stable: 'Stable',
    moderate: 'Moderate',
    warning: 'Warning',
    critical: 'Critical',
  }[status] || status
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const name = searchParams.get('name') || `${lat.toFixed(2)}, ${lng.toFixed(2)}`
  const days = parseInt(searchParams.get('days') || '7')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  try {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`

    // Fetch all environmental data in parallel
    const [weatherR, aqR, wildfireR, earthquakeR, tsunamiR, historyR] = await Promise.allSettled([
      fetchJson<any>(`${baseUrl}/api/weather?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`),
      fetchJson<any>(`${baseUrl}/api/openaq?lat=${lat}&lng=${lng}`),
      fetchJson<any>(`${baseUrl}/api/firms?lat=${lat}&lng=${lng}`),
      fetchJson<any>(`${baseUrl}/api/earthquake?limit=20`),
      fetchJson<any>(`${baseUrl}/api/tsunami`),
      fetchJson<any>(`${baseUrl}/api/air-quality/history?lat=${lat}&lng=${lng}&days=${days}`),
    ])

    const weather = weatherR.status === 'fulfilled' ? weatherR.value : null
    const aq = aqR.status === 'fulfilled' ? aqR.value : null
    const wildfire = wildfireR.status === 'fulfilled' ? wildfireR.value : null
    const earthquakes = earthquakeR.status === 'fulfilled' ? earthquakeR.value : null
    const tsunami = tsunamiR.status === 'fulfilled' ? tsunamiR.value : null
    const history = historyR.status === 'fulfilled' ? historyR.value : null

    // Build PDF
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    pdfDoc.setTitle(`EnviroDash Environmental Report — ${name}`)
    pdfDoc.setAuthor('EnviroDash')
    pdfDoc.setSubject('Real-time environmental monitoring report')
    pdfDoc.setCreator('EnviroDash v1.0')
    pdfDoc.setProducer('EnviroDash')

    const pageWidth = 595.28 // A4 width in points
    const pageHeight = 841.89 // A4 height in points
    const margin = 50

    // ==================== PAGE 1: COVER + Current Conditions ====================
    const p1 = pdfDoc.addPage([pageWidth, pageHeight])

    // Header band (emerald gradient simulation)
    p1.drawRectangle({
      x: 0,
      y: pageHeight - 120,
      width: pageWidth,
      height: 120,
      color: rgb(0.063, 0.722, 0.502), // emerald-500
    })

    p1.drawText('EnviroDash', {
      x: margin,
      y: pageHeight - 50,
      size: 28,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    })

    p1.drawText('Environmental Monitoring Report', {
      x: margin,
      y: pageHeight - 75,
      size: 12,
      font: helvetica,
      color: rgb(0.94, 1, 0.96),
    })

    p1.drawText(new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }), {
      x: margin,
      y: pageHeight - 95,
      size: 9,
      font: helvetica,
      color: rgb(0.94, 1, 0.96),
    })

    // Location
    let y = pageHeight - 160
    p1.drawText(`Location: ${name}`, { x: margin, y, size: 16, font: helveticaBold, color: rgb(0.094, 0.094, 0.094) })
    y -= 18
    p1.drawText(`Coordinates: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`, { x: margin, y, size: 10, font: helvetica, color: rgb(0.41, 0.41, 0.41) })
    y -= 14
    p1.drawText(`Report period: last ${days} days`, { x: margin, y, size: 10, font: helvetica, color: rgb(0.41, 0.41, 0.41) })

    // Current conditions section
    y -= 40
    p1.drawText('Current Conditions', { x: margin, y, size: 14, font: helveticaBold, color: rgb(0.063, 0.722, 0.502) })
    y -= 6
    p1.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.063, 0.722, 0.502) })
    y -= 25

    // Weather
    if (weather?.results?.[0]) {
      const w = weather.results[0]
      p1.drawText('Weather', { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.094, 0.094, 0.094) })
      y -= 16
      const temp = w.value?.toFixed(1) ?? '—'
      const humidity = w.metrics?.humidity ?? '—'
      const wind = w.metrics?.wind ?? '—'
      const precip = w.metrics?.precipitation ?? '—'
      p1.drawText(`Temperature: ${temp}°C  |  Humidity: ${humidity}%  |  Wind: ${wind} km/h  |  Precip: ${precip} mm`, {
        x: margin, y, size: 10, font: helvetica, color: rgb(0.26, 0.26, 0.26),
      })
      y -= 20
    } else {
      p1.drawText('Weather: data unavailable', { x: margin, y, size: 10, font: helveticaOblique, color: rgb(0.6, 0.6, 0.6) })
      y -= 20
    }

    // Air Quality
    if (aq?.results?.[0]) {
      const a = aq.results[0]
      const aqi = a.value
      p1.drawText('Air Quality', { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.094, 0.094, 0.094) })
      y -= 16
      const aqiText = `US AQI: ${aqi ?? '—'} (${statusLabel(a.status)})`
      p1.drawText(aqiText, { x: margin, y, size: 11, font: helveticaBold, color: statusColor(a.status) })
      // Color dot
      p1.drawCircle({ x: margin + 130, y: y + 3, size: 4, color: statusColor(a.status) })
      y -= 16
      if (a.metrics) {
        const pm25 = a.metrics.pm25?.toFixed(1) ?? '—'
        const pm10 = a.metrics.pm10?.toFixed(1) ?? '—'
        const no2 = a.metrics.no2?.toFixed(1) ?? '—'
        const o3 = a.metrics.o3?.toFixed(1) ?? '—'
        p1.drawText(`PM2.5: ${pm25} µg/m³  |  PM10: ${pm10} µg/m³  |  NO₂: ${no2} µg/m³  |  O₃: ${o3} µg/m³`, {
          x: margin, y, size: 9, font: helvetica, color: rgb(0.26, 0.26, 0.26),
        })
      }
      y -= 20
    } else {
      p1.drawText('Air Quality: data unavailable', { x: margin, y, size: 10, font: helveticaOblique, color: rgb(0.6, 0.6, 0.6) })
      y -= 20
    }

    // Wildfire Risk
    if (wildfire?.results?.[0]) {
      const w = wildfire.results[0]
      p1.drawText('Fire Weather Risk', { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.094, 0.094, 0.094) })
      y -= 16
      const fwi = w.value
      const statusText = `FWI: ${fwi}/100 (${statusLabel(w.status)})`
      p1.drawText(statusText, { x: margin, y, size: 11, font: helveticaBold, color: statusColor(w.status) })
      p1.drawCircle({ x: margin + 130, y: y + 3, size: 4, color: statusColor(w.status) })
      y -= 20
    }

    // Tsunami
    if (tsunami) {
      p1.drawText('Tsunami Warnings', { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.094, 0.094, 0.094) })
      y -= 16
      const count = tsunami.count || 0
      const color = count > 0 ? rgb(0.937, 0.267, 0.231) : rgb(0.063, 0.722, 0.502)
      p1.drawText(`${count} active warning(s)`, { x: margin, y, size: 11, font: helveticaBold, color })
      y -= 20
    }

    // Footer
    p1.drawText(`Generated by EnviroDash · ${new Date().toISOString()}`, {
      x: margin, y: 30, size: 8, font: helveticaOblique, color: rgb(0.6, 0.6, 0.6),
    })

    // ==================== PAGE 2: Historical Trends + Earthquakes ====================
    const p2 = pdfDoc.addPage([pageWidth, pageHeight])

    // Header
    p2.drawRectangle({ x: 0, y: pageHeight - 50, width: pageWidth, height: 50, color: rgb(0.063, 0.722, 0.502) })
    p2.drawText('Historical Trends & Recent Events', { x: margin, y: pageHeight - 32, size: 14, font: helveticaBold, color: rgb(1, 1, 1) })

    y = pageHeight - 90

    // Historical AQI summary
    if (history?.stats) {
      p2.drawText(`Air Quality History (last ${days} days)`, { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.063, 0.722, 0.502) })
      y -= 6
      p2.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.063, 0.722, 0.502) })
      y -= 18

      const s = history.stats
      const lines = [
        `Average AQI: ${s.avgAqi ?? '—'}  |  Maximum: ${s.maxAqi ?? '—'}  |  Minimum: ${s.minAqi ?? '—'}`,
        `Average PM2.5: ${s.avgPm25 ?? '—'} µg/m³  |  Maximum: ${s.maxPm25 ?? '—'}  |  Minimum: ${s.minPm25 ?? '—'}`,
        `Total samples: ${s.samples} hourly readings`,
      ]
      for (const line of lines) {
        p2.drawText(line, { x: margin, y, size: 10, font: helvetica, color: rgb(0.26, 0.26, 0.26) })
        y -= 16
      }
      y -= 15
    }

    // Earthquakes
    if (earthquakes?.results?.length) {
      p2.drawText('Recent Earthquakes (last 24h, M2.5+)', { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.961, 0.620, 0.043) })
      y -= 6
      p2.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.961, 0.620, 0.043) })
      y -= 18

      const sorted = [...earthquakes.results].sort((a: any, b: any) => (b.value || 0) - (a.value || 0)).slice(0, 10)
      for (const q of sorted) {
        const mag = q.value?.toFixed(1) ?? '—'
        const text = `M${mag} — ${q.name}`.slice(0, 80)
        p2.drawText(text, { x: margin, y, size: 9, font: helvetica, color: rgb(0.26, 0.26, 0.26) })

        // Magnitude color indicator
        const magNum = q.value || 0
        const color = magNum >= 6 ? rgb(0.937, 0.267, 0.231) : magNum >= 5 ? rgb(0.961, 0.620, 0.043) : magNum >= 4 ? rgb(0.231, 0.510, 0.965) : rgb(0.063, 0.722, 0.502)
        p2.drawCircle({ x: margin - 12, y: y + 3, size: 3, color })

        y -= 14
        if (y < 100) break
      }
      y -= 10
    }

    // Tsunami details
    if (tsunami?.results?.length) {
      p2.drawText('Active Tsunami Warnings', { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.937, 0.267, 0.231) })
      y -= 6
      p2.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.937, 0.267, 0.231) })
      y -= 18
      for (const t of tsunami.results.slice(0, 5)) {
        const text = `${t.msg_type.toUpperCase()} — ${t.title}`.slice(0, 80)
        p2.drawText(text, { x: margin, y, size: 9, font: helvetica, color: rgb(0.26, 0.26, 0.26) })
        y -= 14
      }
    }

    // Footer page 2
    p2.drawText(`Page 2 of 2 · Generated by EnviroDash`, {
      x: margin, y: 30, size: 8, font: helveticaOblique, color: rgb(0.6, 0.6, 0.6),
    })

    // Save PDF
    const pdfBytes = await pdfDoc.save()
    const filename = `envirodash-report-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('PDF generation error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
