import { describe, expect, it } from 'vitest'
import {
  MISCONFIGURED_MESSAGE,
  MISSING_LOCATION_MESSAGE,
  RATE_LIMITED_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  UNKNOWN_LOCATION_MESSAGE,
  WeatherFetchError,
  fromUpstreamStatus,
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
