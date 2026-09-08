/**
 * Single place where upstream and input failures become an HTTP status plus a
 * message that is safe to show a user. Nothing here may leak key or upstream
 * internals — the route handler returns `message` verbatim to the client.
 */
export class WeatherFetchError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'WeatherFetchError'
    this.status = status
  }
}

export const MISSING_LOCATION_MESSAGE = 'Enter a location to search.'
export const UNKNOWN_LOCATION_MESSAGE = "Couldn't find that location."
export const SERVICE_UNAVAILABLE_MESSAGE = 'Weather service is unavailable.'
export const RATE_LIMITED_MESSAGE = 'Too many requests — try again in a minute.'
export const MISCONFIGURED_MESSAGE = 'Weather service is not configured.'

export function missingLocationError(): WeatherFetchError {
  return new WeatherFetchError(400, MISSING_LOCATION_MESSAGE)
}

export function misconfiguredError(): WeatherFetchError {
  return new WeatherFetchError(500, MISCONFIGURED_MESSAGE)
}

/**
 * Maps a Visual Crossing HTTP status onto ours. Visual Crossing answers an
 * unresolvable location with 400, which we surface as 404 so the client can tell
 * "bad location" apart from "bad request".
 */
export function fromUpstreamStatus(status: number): WeatherFetchError {
  if (status === 400) return new WeatherFetchError(404, UNKNOWN_LOCATION_MESSAGE)
  if (status === 401 || status === 403) return new WeatherFetchError(500, MISCONFIGURED_MESSAGE)
  if (status === 429) return new WeatherFetchError(429, RATE_LIMITED_MESSAGE)
  return new WeatherFetchError(502, SERVICE_UNAVAILABLE_MESSAGE)
}

/** Network failure, timeout, or unparseable body. */
export function unreachableError(): WeatherFetchError {
  return new WeatherFetchError(502, SERVICE_UNAVAILABLE_MESSAGE)
}
