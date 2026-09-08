import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/weather/route'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import type { WeatherSnapshot } from '@/types/weather'

const TEST_KEY = 'test-key-123'

function request(query: string): Request {
  return new Request(`http://localhost:3000/api/weather${query}`)
}

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ),
  )
}

beforeEach(() => {
  vi.stubEnv('VISUAL_CROSSING_API_KEY', TEST_KEY)
  // The handler reads Date.now(); pin it to the fixture's "now" so the ±24h window
  // assertions don't depend on when the suite runs.
  vi.useFakeTimers()
  vi.setSystemTime(NOW_EPOCH * 1000)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('GET /api/weather', () => {
  it('returns a snapshot for a valid location', async () => {
    stubFetch(buildTimelineResponse())

    const response = await GET(request('?location=London'))
    const snapshot = (await response.json()) as WeatherSnapshot

    expect(response.status).toBe(200)
    expect(snapshot.resolvedAddress).toBe('London, England, United Kingdom')
    expect(snapshot.timezone).toBe('Europe/London')
    expect(snapshot.current.temperature).toBe(15.2)
    expect(snapshot.hourly).toHaveLength(49)
  })

  it('spans past and future hours around now', async () => {
    stubFetch(buildTimelineResponse())

    const response = await GET(request('?location=London'))
    const { hourly } = (await response.json()) as WeatherSnapshot

    expect(hourly.some((hour) => hour.isPast)).toBe(true)
    expect(hourly.some((hour) => !hour.isPast)).toBe(true)
  })

  it('rejects a missing location with 400', async () => {
    const response = await GET(request(''))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Enter a location to search.' })
  })

  it('rejects a blank location with 400', async () => {
    const response = await GET(request('?location=%20%20'))

    expect(response.status).toBe(400)
  })

  it('reports an unresolvable location as 404', async () => {
    stubFetch({ message: 'Invalid location parameter' }, 400)

    const response = await GET(request('?location=zzzznotaplace'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: "Couldn't find that location.",
    })
  })

  it('reports a missing server key as 500 without naming the key', async () => {
    vi.stubEnv('VISUAL_CROSSING_API_KEY', '')

    const response = await GET(request('?location=London'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Weather service is not configured.' })
  })

  it('reports an upstream outage as 502', async () => {
    stubFetch({ message: 'internal error' }, 500)

    const response = await GET(request('?location=London'))

    expect(response.status).toBe(502)
  })

  it('reports an unexpected internal failure as 502 without leaking detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new TypeError('secret internal detail')
      }),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET(request('?location=London'))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(JSON.stringify(body)).not.toContain('secret internal detail')
  })

  it('never includes the API key in a response body', async () => {
    stubFetch(buildTimelineResponse())

    const response = await GET(request('?location=London'))

    expect(await response.text()).not.toContain(TEST_KEY)
  })
})
