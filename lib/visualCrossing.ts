import type { VisualCrossingTimelineResponse } from '@/types/weather'
import { buildFixtureTimeline, shouldUseFixture } from '@/lib/devFixture'
import {
  fromUpstreamStatus,
  misconfiguredError,
  missingLocationError,
  unreachableError,
} from '@/lib/weatherErrors'

const TIMELINE_BASE_URL =
  'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline'

const REQUEST_TIMEOUT_MS = 8_000

export const WINDOW_SECONDS = 24 * 60 * 60

/**
 * No padding is added around the window, deliberately.
 *
 * Visual Crossing rounds a unix-second range out to whole calendar days in the
 * location's timezone, and does so inconsistently, so an unpadded request
 * occasionally comes back missing the hour at the very edge of the ±24h window —
 * the timeline shows ~23h of past data instead of 24h.
 *
 * Requesting a day either side fixes that, but doubles the reported query cost
 * (25 → 49), halving how many lookups the free tier allows. For a learning project
 * that trade is not worth it: an occasional missing edge hour is invisible in the
 * UI, whereas running out of quota stops work. Reinstate padding here if a complete
 * window ever matters more than request count.
 */

/** Only the fields lib/shapeWeather.ts reads — keeps the payload small. */
const ELEMENTS = 'datetimeEpoch,temp,windspeed,precipprob,conditions,icon'

/**
 * Builds the timeline request URL for the ±24h window around `nowEpochSeconds`.
 *
 * The range is expressed in UNIX seconds rather than calendar dates so it needs no
 * knowledge of the location's timezone — which we only learn from the response.
 */
export function buildTimelineUrl(
  location: string,
  nowEpochSeconds: number,
  apiKey: string,
): string {
  const from = nowEpochSeconds - WINDOW_SECONDS
  const to = nowEpochSeconds + WINDOW_SECONDS
  const url = new URL(
    `${TIMELINE_BASE_URL}/${encodeURIComponent(location)}/${from}/${to}`,
  )
  url.searchParams.set('unitGroup', 'metric')
  url.searchParams.set('include', 'current,hours')
  url.searchParams.set('elements', ELEMENTS)
  url.searchParams.set('contentType', 'json')
  url.searchParams.set('key', apiKey)
  return url.toString()
}

/**
 * Fetches raw timeline data for a location. Throws WeatherFetchError for every
 * failure path — callers never see a partial or half-parsed response.
 */
export async function fetchTimeline(
  location: string,
  nowEpochSeconds: number,
): Promise<VisualCrossingTimelineResponse> {
  const trimmedLocation = location.trim()
  if (!trimmedLocation) throw missingLocationError()

  // Checked after the blank-location guard so fixture mode behaves like the real thing,
  // and before the key is read so it works without one.
  if (shouldUseFixture()) return buildFixtureTimeline(trimmedLocation, nowEpochSeconds)

  const apiKey = process.env.VISUAL_CROSSING_API_KEY
  if (!apiKey) throw misconfiguredError()

  const response = await requestTimeline(
    buildTimelineUrl(trimmedLocation, nowEpochSeconds, apiKey),
  )
  if (!response.ok) throw fromUpstreamStatus(response.status)

  return await parseTimeline(response)
}

async function requestTimeline(url: string): Promise<Response> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    throw unreachableError()
  }
}

async function parseTimeline(
  response: Response,
): Promise<VisualCrossingTimelineResponse> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw unreachableError()
  }

  if (!isTimelineResponse(body)) throw unreachableError()
  return body
}

function isTimelineResponse(
  body: unknown,
): body is VisualCrossingTimelineResponse {
  if (typeof body !== 'object' || body === null) return false
  const candidate = body as Partial<VisualCrossingTimelineResponse>
  return Array.isArray(candidate.days) && typeof candidate.timezone === 'string'
}
