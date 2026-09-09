import type { WeatherSnapshot } from '@/types/weather'
import {
  SERVICE_UNAVAILABLE_MESSAGE,
  WeatherFetchError,
  missingLocationError,
} from '@/lib/weatherErrors'

/**
 * Client-side call to our own /api/weather route.
 *
 * The route has already mapped every upstream failure to a status and a message
 * that is safe to show a user, so this only has to unwrap that envelope: resolve
 * with the snapshot, or throw a WeatherFetchError carrying the message the UI
 * should display.
 *
 * `signal` lets a caller abandon an in-flight search when a newer one starts.
 */
export async function fetchWeather(
  location: string,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const trimmedLocation = location.trim()
  if (!trimmedLocation) throw missingLocationError()

  const response = await requestWeather(trimmedLocation, signal)
  const body = await readBody(response)

  if (!response.ok) throw new WeatherFetchError(response.status, errorMessage(body))
  return body as WeatherSnapshot
}

async function requestWeather(
  location: string,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    return await fetch(`/api/weather?location=${encodeURIComponent(location)}`, {
      signal,
    })
  } catch (error) {
    // An abort is the caller's own doing — let it propagate untouched so the hook
    // can tell "superseded" apart from "failed".
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new WeatherFetchError(502, SERVICE_UNAVAILABLE_MESSAGE)
  }
}

/** A non-JSON body (a proxy error page, say) is a failure, not a snapshot. */
async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new WeatherFetchError(response.status || 502, SERVICE_UNAVAILABLE_MESSAGE)
  }
}

function errorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const { error } = body as { error: unknown }
    if (typeof error === 'string' && error) return error
  }
  return SERVICE_UNAVAILABLE_MESSAGE
}
