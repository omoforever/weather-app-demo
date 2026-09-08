import { NextResponse } from 'next/server'
import { fetchTimeline } from '@/lib/visualCrossing'
import { toSnapshot } from '@/lib/shapeWeather'
import {
  SERVICE_UNAVAILABLE_MESSAGE,
  WeatherFetchError,
  missingLocationError,
} from '@/lib/weatherErrors'
import type { WeatherErrorResponse, WeatherSnapshot } from '@/types/weather'

/** Weather is live data — never serve a statically cached response. */
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
): Promise<NextResponse<WeatherSnapshot | WeatherErrorResponse>> {
  const location = new URL(request.url).searchParams.get('location') ?? ''
  const nowEpochSeconds = Math.floor(Date.now() / 1000)

  try {
    if (!location.trim()) throw missingLocationError()

    const timeline = await fetchTimeline(location, nowEpochSeconds)
    return NextResponse.json(toSnapshot(timeline, nowEpochSeconds))
  } catch (error) {
    return errorResponse(error)
  }
}

/**
 * Only WeatherFetchError messages reach the client; anything unexpected is logged
 * server-side and reported generically so upstream details never leak.
 */
function errorResponse(error: unknown): NextResponse<WeatherErrorResponse> {
  if (error instanceof WeatherFetchError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error('Unexpected failure in /api/weather', error)
  return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 502 })
}
