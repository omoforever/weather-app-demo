import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWeatherSearch } from '@/hooks/useWeatherSearch'
import { fetchWeather } from '@/lib/fetchWeather'
import { clearWeatherCache } from '@/lib/weatherCache'
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
  // Module state: without this, a cached London leaks into later tests.
  clearWeatherCache()
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

describe('useWeatherSearch caching', () => {
  it('spends a request the first time a location is searched', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })

    expect(fetchWeatherMock).toHaveBeenCalledOnce()
  })

  /** Every avoided lookup is 25 records kept. */
  it('reuses the cached snapshot when the same place is searched again', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })
    await act(async () => {
      await result.current.search('London')
    })

    expect(fetchWeatherMock).toHaveBeenCalledOnce()
    expect(result.current.snapshot?.resolvedAddress).toBe('London')
    expect(result.current.status).toBe('success')
  })

  it('still fetches a location it has not seen', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })
    fetchWeatherMock.mockResolvedValue(snapshotFor('Paris'))
    await act(async () => {
      await result.current.search('Paris')
    })

    expect(fetchWeatherMock).toHaveBeenCalledTimes(2)
    expect(result.current.snapshot?.resolvedAddress).toBe('Paris')
  })

  it('shows a cached result without flashing a loading state', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })

    const statuses: string[] = []
    await act(async () => {
      const pending = result.current.search('London')
      statuses.push(result.current.status)
      await pending
    })

    expect(statuses).not.toContain('loading')
  })

  it('does not cache a failed search', async () => {
    fetchWeatherMock.mockRejectedValue(new WeatherFetchError(502, 'down'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    await act(async () => {
      await result.current.search('London')
    })

    expect(fetchWeatherMock).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('success')
  })
})

describe('useWeatherSearch refresh', () => {
  it('does nothing when no location is loaded', async () => {
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.refresh()
    })

    expect(fetchWeatherMock).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  /** The whole point of refresh: newer data, so the cache must be bypassed. */
  it('goes to the network even though the location is cached', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })
    fetchWeatherMock.mockResolvedValue(snapshotFor('London updated'))
    await act(async () => {
      await result.current.refresh()
    })

    expect(fetchWeatherMock).toHaveBeenCalledTimes(2)
    expect(result.current.snapshot?.resolvedAddress).toBe('London updated')
  })

  it('re-fetches the location as typed, not as the API resolved it', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London, England, United Kingdom'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('london')
    })
    await act(async () => {
      await result.current.refresh()
    })

    expect(fetchWeatherMock.mock.calls[1][0]).toBe('london')
  })

  it('keeps the results on screen while refreshing', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())
    await act(async () => {
      await result.current.search('London')
    })

    pendingFetch()
    act(() => {
      void result.current.refresh()
    })

    await waitFor(() => expect(result.current.isRefreshing).toBe(true))
    expect(result.current.status).toBe('success')
    expect(result.current.snapshot).not.toBeNull()
  })

  it('stops reporting a refresh once it finishes', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    await act(async () => {
      await result.current.search('London')
    })
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.isRefreshing).toBe(false)
  })

  it('stops reporting a refresh even when it fails', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())
    await act(async () => {
      await result.current.search('London')
    })

    fetchWeatherMock.mockRejectedValue(new WeatherFetchError(502, 'down'))
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.errorMessage).toBe('down')
  })

  it('records when the showing data was fetched', async () => {
    fetchWeatherMock.mockResolvedValue(snapshotFor('London'))
    const { result } = renderHook(() => useWeatherSearch())

    expect(result.current.updatedAtMs).toBeNull()
    await act(async () => {
      await result.current.search('London')
    })

    expect(result.current.updatedAtMs).toBeTypeOf('number')
  })
})
