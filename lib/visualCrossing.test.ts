import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  WINDOW_SECONDS,
  buildTimelineUrl,
  fetchTimeline,
} from '@/lib/visualCrossing'
import { WeatherFetchError } from '@/lib/weatherErrors'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'

const TEST_KEY = 'test-key-123'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubEnv('VISUAL_CROSSING_API_KEY', TEST_KEY)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const DAY_SECONDS = 24 * 60 * 60

describe('buildTimelineUrl', () => {
  it('requests the range as unix seconds so the location timezone is irrelevant', () => {
    const url = buildTimelineUrl('London', NOW_EPOCH, TEST_KEY)

    expect(url).toContain(`/London/${NOW_EPOCH - WINDOW_SECONDS - DAY_SECONDS}`)
  })

  /**
   * Regression: Visual Crossing rounds the range to whole local calendar days, and an
   * unpadded request came back missing the hour at the edge of the ±24h window.
   */
  it('pads the requested range by a day either side of the window', () => {
    const url = buildTimelineUrl('London', NOW_EPOCH, TEST_KEY)

    const [, from, to] = url.split('?')[0].split('/').slice(-3)
    expect(NOW_EPOCH - Number(from)).toBe(WINDOW_SECONDS + DAY_SECONDS)
    expect(Number(to) - NOW_EPOCH).toBe(WINDOW_SECONDS + DAY_SECONDS)
  })

  it('asks for metric hourly data plus current conditions', () => {
    const { searchParams } = new URL(buildTimelineUrl('London', NOW_EPOCH, TEST_KEY))

    expect(searchParams.get('unitGroup')).toBe('metric')
    expect(searchParams.get('include')).toBe('current,hours')
    expect(searchParams.get('contentType')).toBe('json')
    expect(searchParams.get('key')).toBe(TEST_KEY)
  })

  it('encodes locations containing spaces and commas', () => {
    const url = buildTimelineUrl('New York, NY', NOW_EPOCH, TEST_KEY)

    expect(url).toContain('New%20York%2C%20NY')
  })
})

describe('fetchTimeline', () => {
  it('returns the parsed payload on success', async () => {
    const expected = buildTimelineResponse()
    stubFetch(jsonResponse(expected))

    await expect(fetchTimeline('London', NOW_EPOCH)).resolves.toEqual(expected)
  })

  it('rejects a blank location before calling the API', async () => {
    const fetchMock = stubFetch(jsonResponse(buildTimelineResponse()))

    await expect(fetchTimeline('   ', NOW_EPOCH)).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails without calling the API when the key is not configured', async () => {
    vi.stubEnv('VISUAL_CROSSING_API_KEY', '')
    const fetchMock = stubFetch(jsonResponse(buildTimelineResponse()))

    await expect(fetchTimeline('London', NOW_EPOCH)).rejects.toMatchObject({ status: 500 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { upstream: 400, status: 404, label: 'unresolvable location' },
    { upstream: 401, status: 500, label: 'rejected key' },
    { upstream: 403, status: 500, label: 'forbidden key' },
    { upstream: 429, status: 429, label: 'rate limit' },
    { upstream: 500, status: 502, label: 'upstream outage' },
  ])('maps upstream $upstream ($label) to $status', async ({ upstream, status }) => {
    stubFetch(jsonResponse({ message: 'upstream detail' }, upstream))

    const error = await fetchTimeline('London', NOW_EPOCH).catch((thrown) => thrown)

    expect(error).toBeInstanceOf(WeatherFetchError)
    expect(error.status).toBe(status)
  })

  it('never surfaces upstream error detail to the caller', async () => {
    stubFetch(jsonResponse({ message: `key ${TEST_KEY} is invalid` }, 401))

    const error = await fetchTimeline('London', NOW_EPOCH).catch((thrown) => thrown)

    expect(error.message).not.toContain(TEST_KEY)
  })

  it('treats a network failure or timeout as a service outage', async () => {
    stubFetch(new DOMException('The operation was aborted', 'TimeoutError'))

    await expect(fetchTimeline('London', NOW_EPOCH)).rejects.toMatchObject({ status: 502 })
  })

  it('treats an unparseable body as a service outage', async () => {
    stubFetch(new Response('<html>gateway error</html>', { status: 200 }))

    await expect(fetchTimeline('London', NOW_EPOCH)).rejects.toMatchObject({ status: 502 })
  })

  it('rejects a 200 response that is missing the timeline shape', async () => {
    stubFetch(jsonResponse({ unexpected: true }))

    await expect(fetchTimeline('London', NOW_EPOCH)).rejects.toMatchObject({ status: 502 })
  })
})
