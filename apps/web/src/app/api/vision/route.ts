import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * EnviroDash AI Vision — satellite imagery analysis.
 *
 * POST /api/vision
 * body: { imageUrl, type, location }
 *
 * Analyzes satellite/aerial imagery of environmental events:
 *   - Wildfire detection and extent estimation
 *   - Volcanic activity and lava flow
 *   - Flood extent mapping
 *   - Glacier retreat visualization
 *   - Coral reef bleaching
 *   - General environmental assessment
 *
 * Uses ZAI Vision (VLM) to understand image content.
 */

const ANALYSIS_PROMPTS: Record<string, string> = {
  wildfire: `Analyze this satellite/aerial image for wildfire activity. Provide a JSON response with:
{
  "fireDetected": boolean,
  "estimatedAreaKm2": number | null,
  "smokeVisible": boolean,
  "smokeDirection": string | null,
  "vegetationDamage": "none" | "low" | "moderate" | "high" | "severe",
  "activeFireFronts": number,
  "threatLevel": "low" | "moderate" | "high" | "extreme",
  "description": "Brief description of what you see",
  "recommendations": ["action1", "action2"]
}`,

  volcano: `Analyze this satellite/aerial image for volcanic activity. Provide a JSON response with:
{
  "eruptionVisible": boolean,
  "lavaFlowDetected": boolean,
  "ashPlumeVisible": boolean,
  "estimatedPlumeHeightKm": number | null,
  "plumeDirection": string | null,
  "activityLevel": "dormant" | "restless" | "erupting" | "major_eruption",
  "description": "Brief description of volcanic features visible",
  "recommendations": ["action1", "action2"]
}`,

  flood: `Analyze this satellite/aerial image for flooding. Provide a JSON response with:
{
  "floodingDetected": boolean,
  "estimatedFloodAreaKm2": number | null,
  "waterLevelTrend": "rising" | "stable" | "falling" | "unknown",
  "infrastructureAffected": boolean,
  "roadsCutOff": boolean,
  "buildingsSubmerged": boolean,
  "severityLevel": "minor" | "moderate" | "major" | "severe",
  "description": "Brief description of flood extent",
  "recommendations": ["action1", "action2"]
}`,

  glacier: `Analyze this satellite/aerial image of a glacier. Provide a JSON response with:
{
  "glacierVisible": boolean,
  "iceExtentKm2": number | null,
  "retreatSigns": boolean,
  "crevasses": "none" | "few" | "moderate" | "extensive",
  "meltwater": boolean,
  "moraineVisible": boolean,
  "healthAssessment": "stable" | "retreating" | "rapidly_retreating" | "advancing",
  "description": "Brief description of glacier condition",
  "recommendations": ["action1", "action2"]
}`,

  'coral-reef': `Analyze this satellite/aerial image of a coral reef. Provide a JSON response with:
{
  "reefVisible": boolean,
  "bleachingDetected": boolean,
  "estimatedBleachingPercent": number | null,
  "waterClarity": "clear" | "moderate" | "turbid",
  "reefHealth": "healthy" | "stressed" | "bleached" | "severely_degraded",
  "humanActivity": boolean,
  "description": "Brief description of reef condition",
  "recommendations": ["action1", "action2"]
}`,

  general: `Analyze this satellite/aerial image for environmental features. Provide a JSON response with:
{
  "imageType": "satellite" | "aerial" | "ground" | "unknown",
  "mainFeatures": ["feature1", "feature2"],
  "environmentalConcerns": ["concern1", "concern2"],
  "vegetationCover": "none" | "sparse" | "moderate" | "dense",
  "waterBodiesVisible": boolean,
  "urbanAreas": boolean,
  "description": "Detailed description of what you see",
  "recommendations": ["action1", "action2"]
}`,
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, type = 'general', location } = await request.json()

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }

    const prompt = ANALYSIS_PROMPTS[type] || ANALYSIS_PROMPTS.general
    const locationContext = location ? `Location context: ${location}. ` : ''

    const zai = await ZAI.create()

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${locationContext}${prompt}\n\nRespond with valid JSON only, no markdown fences.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const rawContent = response.choices[0]?.message?.content || ''

    // Parse JSON response (strip markdown fences if present)
    let analysis: any
    try {
      const cleaned = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        rawResponse: rawContent,
        parseError: 'Failed to parse VLM response as JSON',
      }
    }

    return NextResponse.json({
      success: true,
      type,
      imageUrl,
      location,
      analysis,
      analyzedAt: new Date().toISOString(),
      model: 'ZAI Vision (VLM)',
    })
  } catch (error: any) {
    console.error('Vision API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to analyze image',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'EnviroDash AI Vision',
    description: 'Satellite imagery analysis using ZAI Vision (VLM)',
    usage: 'POST with { imageUrl, type, location }',
    supportedTypes: Object.keys(ANALYSIS_PROMPTS),
    typeDescriptions: {
      wildfire: 'Detect active fires, estimate area, assess vegetation damage',
      volcano: 'Detect eruptions, lava flows, ash plumes',
      flood: 'Map flood extent, assess infrastructure damage',
      glacier: 'Assess glacier health, detect retreat signs',
      'coral-reef': 'Detect bleaching, assess reef health',
      general: 'General environmental assessment',
    },
  })
}
