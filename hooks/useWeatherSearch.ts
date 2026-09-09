'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWeather } from '@/lib/fetchWeather'
import { SERVICE_UNAVAILABLE_MESSAGE, WeatherFetchError } from '@/lib/weatherErrors'
import { readCachedWeather, writeCachedWeather } from '@/lib/weatherCache'
import type { WeatherSnapshot } from '@/types/weather'

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

export type WeatherSearch = {
  status: SearchStatus
  snapshot: WeatherSnapshot | null
  errorMessage: string | null
  search: (location: string) => Promise<void>
  /** Re-fetches the loaded location, ignoring the cache. No-op if nothing is loaded. */
  refresh: () => Promise<void>
  /** True while a refresh is running; the results stay on screen throughout. */
  isRefreshing: boolean
  /** When the showing snapshot was fetched, for "updated at" text. */
  updatedAtMs: number | null
}

/**
 * Owns the state of one location search: what we're doing, what came back, and
 * what went wrong. Components stay presentational and read this.
 */
export function useWeatherSearch(): WeatherSearch {
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatedAtMs, setUpdatedAtMs] = useState<number | null>(null)

  const inFlightRef = useRef<AbortController | null>(null)
  // What refresh should re-fetch: the location as typed, not as geocoded.
  const loadedLocationRef = useRef<string | null>(null)

  // Abandon any in-flight request if the component goes away.
  useEffect(() => () => inFlightRef.current?.abort(), [])

  const load = useCallback(
    async (location: string, { useCache }: { useCache: boolean }) => {
      const controller = startRequest(inFlightRef)
      const nowMs = Date.now()

      const cached = useCache ? readCachedWeather(location, nowMs) : undefined
      if (cached) {
        // Nothing to wait for: skip the loading state entirely rather than flashing it.
        loadedLocationRef.current = location
        setSnapshot(cached)
        setUpdatedAtMs(nowMs)
        setErrorMessage(null)
        setStatus('success')
        return
      }

      setErrorMessage(null)
      if (useCache) setStatus('loading')
      else setIsRefreshing(true)

      try {
        const result = await fetchWeather(location, controller.signal)
        writeCachedWeather(location, result, Date.now())
        loadedLocationRef.current = location
        setSnapshot(result)
        setUpdatedAtMs(Date.now())
        setStatus('success')
      } catch (error) {
        // A newer request replaced this one — it owns the state now, so leave it alone.
        if (controller.signal.aborted) return
        setErrorMessage(toMessage(error))
        setStatus('error')
      } finally {
        if (!controller.signal.aborted) setIsRefreshing(false)
      }
    },
    [],
  )

  const search = useCallback(
    (location: string) => load(location, { useCache: true }),
    [load],
  )

  /** Refresh exists to get newer data, so it always goes to the network. */
  const refresh = useCallback(async () => {
    const location = loadedLocationRef.current
    if (!location) return
    await load(location, { useCache: false })
  }, [load])

  return { status, snapshot, errorMessage, search, refresh, isRefreshing, updatedAtMs }
}

/** Cancels the previous request, if any, and becomes the current one. */
function startRequest(
  inFlightRef: React.RefObject<AbortController | null>,
): AbortController {
  inFlightRef.current?.abort()
  const controller = new AbortController()
  inFlightRef.current = controller
  return controller
}

function toMessage(error: unknown): string {
  return error instanceof WeatherFetchError ? error.message : SERVICE_UNAVAILABLE_MESSAGE
}
