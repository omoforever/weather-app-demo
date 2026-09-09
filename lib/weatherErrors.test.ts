import { describe, expect, it } from 'vitest'
import {
  MISCONFIGURED_MESSAGE,
  MISSING_LOCATION_MESSAGE,
  RATE_LIMITED_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  UNKNOWN_LOCATION_MESSAGE,
  WeatherFetchError,
  fromUpstreamStatus,
  isRetryable,
  misconfiguredError,
  missingLocationError,
  unreachableError,
} from '@/lib/weatherErrors'

describe('WeatherFetchError', () => {
  it('is a real Error carrying a status', () => {
    const error = new WeatherFetchError(418, 'teapot')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('WeatherFetchError')
    expect(error.status).toBe(418)
    expect(error.message).toBe('teapot')
  })
})

describe('fromUpstreamStatus', () => {
  it.each([
    { upstream: 400, status: 404, message: UNKNOWN_LOCATION_MESSAGE },
    { upstream: 401, status: 500, message: MISCONFIGURED_MESSAGE },
    { upstream: 403, status: 500, message: MISCONFIGURED_MESSAGE },
    { upstream: 429, status: 429, message: RATE_LIMITED_MESSAGE },
    { upstream: 500, status: 502, message: SERVICE_UNAVAILABLE_MESSAGE },
    { upstream: 503, status: 502, message: SERVICE_UNAVAILABLE_MESSAGE },
  ])('maps $upstream to $status', ({ upstream, status, message }) => {
    const error = fromUpstreamStatus(upstream)

    expect(error.status).toBe(status)
    expect(error.message).toBe(message)
  })

  it('treats an unrecognised status as a service outage rather than passing it through', () => {
    expect(fromUpstreamStatus(418).status).toBe(502)
  })

  it('never produces a message mentioning keys or credentials', () => {
    const messages = [400, 401, 403, 429, 500].map((status) => fromUpstreamStatus(status).message)

    for (const message of messages) {
      expect(message.toLowerCase()).not.toMatch(/key|token|credential|unauthor/)
    }
  })
})

describe('input and configuration errors', () => {
  it('reports a missing location as a client error', () => {
    expect(missingLocationError()).toMatchObject({
      status: 400,
      message: MISSING_LOCATION_MESSAGE,
    })
  })

  it('reports a missing key as a server error, not the user’s fault', () => {
    expect(misconfiguredError()).toMatchObject({
      status: 500,
      message: MISCONFIGURED_MESSAGE,
    })
  })

  it('reports an unreachable upstream as a bad gateway', () => {
    expect(unreachableError()).toMatchObject({
      status: 502,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    })
  })
})

describe('isRetryable', () => {
  it('offers a retry when the service was unavailable', () => {
    expect(isRetryable(502)).toBe(true)
  })

  it('offers a retry when we were rate limited', () => {
    expect(isRetryable(429)).toBe(true)
  })

  it('offers a retry for a server-side failure', () => {
    expect(isRetryable(500)).toBe(true)
  })

  /**
   * An unknown location stays unknown however many times it's asked for, and each
   * attempt spends 25 records — the UI should ask the user to edit the search instead.
   */
  it('does not offer a retry for a location that was not found', () => {
    expect(isRetryable(404)).toBe(false)
  })

  it('does not offer a retry for a malformed request', () => {
    expect(isRetryable(400)).toBe(false)
  })

  it('treats any server-side status as retryable, not only the ones we raise today', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(isRetryable(status)).toBe(true)
    }
  })

  it('agrees with the statuses fromUpstreamStatus actually produces', () => {
    // Upstream 400 becomes our 404: the location is wrong, so retrying cannot help.
    expect(isRetryable(fromUpstreamStatus(400).status)).toBe(false)
    // A rejected key becomes our 500. The user can't fix it, but it isn't their input.
    expect(isRetryable(fromUpstreamStatus(401).status)).toBe(true)
    expect(isRetryable(fromUpstreamStatus(429).status)).toBe(true)
    expect(isRetryable(fromUpstreamStatus(503).status)).toBe(true)
  })

  it('does not offer a retry when no location was entered', () => {
    expect(isRetryable(missingLocationError().status)).toBe(false)
  })

  it('offers a retry when the service was unreachable', () => {
    expect(isRetryable(unreachableError().status)).toBe(true)
  })
})
