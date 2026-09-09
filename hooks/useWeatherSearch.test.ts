import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWeatherSearch } from '@/hooks/useWeatherSearch'
import { fetchWeather } from '@/lib/fetchWeather'
import { WeatherFetchError } from '@/lib/weatherErrors'
import { toSnapshot } from '@/lib/shapeWeather'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import type { WeatherSnapshot } from '@/types/weather'

vi.mock('@/lib/fetchWeather', () => ({ fetchWeather: vi.fn() }))

const fetchWeatherMock = vi.mocked(fetchWeather)

function snapshotFor(address: string): WeatherSnapshot {
  return {
    ...toSnapshot(buildTimelineResponse(), NOW_EPOCH),
    resolvedAddress: address,
  }
}

/**
 * A fetch we control by hand: it stays pending until the test resolves it, and
 * rejects the way a real aborted fetch does when its signal fires.
 */
function pendingFetch() {
  const calls: Array<(snapshot: WeatherSnapshot) => void> = []

  fetchWeatherMock.mockImplementation(
    (_location: string, signal?: AbortSignal) =>
      new Promise<WeatherSnapshot>((resolve, reject) => {
        calls.push(resolve)
        signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted', 'AbortError')),
        )
      }),
  )

  return calls
}

beforeEach(() => {
  fetchWeatherMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useWeatherSearch', () => {
  it('starts idle with nothing loaded', () => {
    const { result } = renderHook(() => useWeatherSearch())

    expect(result.current).toMatchObject({
      status: 'idle',
      snapshot: null,
      errorMessage: null,
    })
  })

  it('reports loading while the request is in flight', async () => {
    pendingFetch()
    const { result } = renderHook(() => useWeatherSearch())

    act(() => {
      void result.current.search('London')
    })

    await waitFor(() => expect(result.current.status).toBe('loading'))
  })

  it('holds the snapshot once the search succeeds', async () => {
    const expected = snapshotFor('London')
    fetchWeatherMock.mockResolvedValue(expected)
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })

    expect(result.current.status).toBe('success')
    expect(result.current.snapshot).toEqual(expected)
    expect(result.current.errorMessage).toBeNull()
  })

  it('surfaces the message from a failed search', async () => {
    fetchWeatherMock.mockRejectedValue(
      new WeatherFetchError(404, "Couldn't find that location."),
    )
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('zzzznotaplace')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe("Couldn't find that location.")
  })

  it('falls back to a generic message for an unrecognised failure', async () => {
    fetchWeatherMock.mockRejectedValue(new TypeError('boom'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })

    expect(result.current.errorMessage).toBe('Weather service is unavailable.')
  })

  it('clears a previous error when a new search starts', async () => {
    fetchWeatherMock.mockRejectedValueOnce(new WeatherFetchError(404, 'nope'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('zzzznotaplace')
    })
    expect(result.current.errorMessage).toBe('nope')

    fetchWeatherMock.mockResolvedValueOnce(snapshotFor('London'))
    await act(async () => {
      await result.current.search('London')
    })

    expect(result.current.errorMessage).toBeNull()
    expect(result.current.status).toBe('success')
  })

  it('cancels the previous request when a second search starts', async () => {
    pendingFetch()
    const { result } = renderHook(() => useWeatherSearch())

    act(() => {
      void result.current.search('London')
    })
    const [, firstSignal] = fetchWeatherMock.mock.calls[0]
    act(() => {
      void result.current.search('Paris')
    })

    expect(firstSignal?.aborted).toBe(true)
  })

  /**
   * The race that matters: a slow first search must not overwrite the result of the
   * search that replaced it.
   */
  it('ignores a superseded search that resolves late', async () => {
    const resolvers = pendingFetch()
    const { result } = renderHook(() => useWeatherSearch())

    act(() => {
      void result.current.search('London')
    })
    act(() => {
      void result.current.search('Paris')
    })

    // Paris answers first, then London's cancelled request answers late.
    await act(async () => {
      resolvers[1](snapshotFor('Paris'))
    })
    await act(async () => {
      resolvers[0](snapshotFor('London'))
    })

    expect(result.current.snapshot?.resolvedAddress).toBe('Paris')
    expect(result.current.status).toBe('success')
    expect(result.current.errorMessage).toBeNull()
  })

  it('abandons an in-flight request when the component unmounts', async () => {
    pendingFetch()
    const { result, unmount } = renderHook(() => useWeatherSearch())

    act(() => {
      void result.current.search('London')
    })
    const [, signal] = fetchWeatherMock.mock.calls[0]
    unmount()

    expect(signal?.aborted).toBe(true)
  })
})
