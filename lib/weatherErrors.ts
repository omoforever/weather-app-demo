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

/**
 * Whether trying the same request again could plausibly succeed — the UI offers a
 * "Try again" button only when it could.
 *
 * The split is about *what went wrong*, not severity. 429 and 5xx are the service
 * being unavailable or busy, so a later attempt may work. 400 and 404 mean the request
 * itself is the problem: an unknown location stays unknown however many times it's
 * asked for, and each attempt spends 25 records of a 1000/day allowance.
 *
 * Lives here beside `fromUpstreamStatus` so a new status can't be mapped without
 * deciding what retrying it should do.
 */
export function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}
