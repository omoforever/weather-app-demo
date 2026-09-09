import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWeather } from '@/lib/fetchWeather'
import { WeatherFetchError } from '@/lib/weatherErrors'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import { toSnapshot } from '@/lib/shapeWeather'

/** What the route actually returns — built through the real transform. */
const SNAPSHOT = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

/** Typed with fetch's own signature so `mock.calls[0][0]` stays checkable. */
function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchWeather', () => {
  it('resolves with the snapshot the route returned', async () => {
    stubFetch(SNAPSHOT)

    await expect(fetchWeather('London')).resolves.toEqual(SNAPSHOT)
  })

  it('calls our own route, never Visual Crossing directly', async () => {
    const fetchMock = stubFetch(SNAPSHOT)

    await fetchWeather('London')

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/weather?location=London')
    expect(url).not.toContain('visualcrossing')
  })

  it('encodes locations containing spaces and commas', async () => {
    const fetchMock = stubFetch(SNAPSHOT)

    await fetchWeather('New York, NY')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/weather?location=New%20York%2C%20NY')
  })

  it('trims the location before sending it', async () => {
    const fetchMock = stubFetch(SNAPSHOT)

    await fetchWeather('  London  ')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/weather?location=London')
  })

  it('rejects a blank location without spending a request', async () => {
    const fetchMock = stubFetch(SNAPSHOT)

    await expect(fetchWeather('   ')).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces the message the route sent for an unknown location', async () => {
    stubFetch({ error: "Couldn't find that location." }, 404)

    const error = await fetchWeather('zzzznotaplace').catch((thrown) => thrown)

    expect(error).toBeInstanceOf(WeatherFetchError)
    expect(error.status).toBe(404)
    expect(error.message).toBe("Couldn't find that location.")
  })

  it('falls back to a generic message when the error body has no message', async () => {
    stubFetch({ unexpected: true }, 500)

    const error = await fetchWeather('London').catch((thrown) => thrown)

    expect(error.message).toBe('Weather service is unavailable.')
  })

  it('treats a non-JSON body as a service failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>proxy error</html>', { status: 502 })),
    )

    await expect(fetchWeather('London')).rejects.toMatchObject({ status: 502 })
  })

  it('treats a dropped connection as a service failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    const error = await fetchWeather('London').catch((thrown) => thrown)

    expect(error).toBeInstanceOf(WeatherFetchError)
    expect(error.status).toBe(502)
  })

  /**
   * An abort means a newer search superseded this one, not that anything failed —
   * hooks/useWeatherSearch.ts relies on being able to tell the two apart.
   */
  it('lets an abort propagate instead of dressing it up as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation was aborted', 'AbortError')
      }),
    )

    const error = await fetchWeather('London').catch((thrown) => thrown)

    expect(error).toBeInstanceOf(DOMException)
    expect(error).not.toBeInstanceOf(WeatherFetchError)
    expect(error.name).toBe('AbortError')
  })

  it('passes the abort signal through to fetch', async () => {
    const fetchMock = stubFetch(SNAPSHOT)
    const controller = new AbortController()

    await fetchWeather('London', controller.signal)

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal })
  })
})
