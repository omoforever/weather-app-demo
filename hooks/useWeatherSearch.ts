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
  /** HTTP status behind `errorMessage`, so the UI can ask whether retrying would help. */
  errorStatus: number | null
  search: (location: string) => Promise<void>
  /** Re-runs the last attempted location, cache bypassed. No-op if nothing was tried. */
  retry: () => Promise<void>
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
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatedAtMs, setUpdatedAtMs] = useState<number | null>(null)

  const inFlightRef = useRef<AbortController | null>(null)
  // What refresh should re-fetch: the location as typed, not as geocoded.
  const loadedLocationRef = useRef<string | null>(null)
  // What retry should re-run. Not the same thing: a search that failed never became
  // "loaded", but it is exactly what retry needs to try again.
  const attemptedLocationRef = useRef<string | null>(null)
  // Whether weather is currently on screen. A ref, not the `snapshot` state, because
  // `load` is created once and would otherwise read a stale value from its closure.
  const hasResultsRef = useRef(false)

  // Abandon any in-flight request if the component goes away.
  useEffect(() => () => inFlightRef.current?.abort(), [])

  const clearError = useCallback(() => {
    setErrorMessage(null)
    setErrorStatus(null)
  }, [])

  const showResults = useCallback((result: WeatherSnapshot, fetchedAtMs: number) => {
    hasResultsRef.current = true
    setSnapshot(result)
    setUpdatedAtMs(fetchedAtMs)
    setStatus('success')
  }, [])

  const load = useCallback(
    async (location: string, { useCache }: { useCache: boolean }) => {
      const controller = startRequest(inFlightRef)
      const nowMs = Date.now()
      attemptedLocationRef.current = location

      const cached = useCache ? readCachedWeather(location, nowMs) : undefined
      if (cached) {
        // Nothing to wait for: skip the loading state entirely rather than flashing it.
        loadedLocationRef.current = location
        clearError()
        showResults(cached, nowMs)
        return
      }

      clearError()
      if (useCache) setStatus('loading')
      else setIsRefreshing(true)

      try {
        const result = await fetchWeather(location, controller.signal)
        writeCachedWeather(location, result, Date.now())
        loadedLocationRef.current = location
        showResults(result, Date.now())
      } catch (error) {
        // A newer request replaced this one — it owns the state now, so leave it alone.
        if (controller.signal.aborted) return
        setErrorMessage(toMessage(error))
        setErrorStatus(toStatus(error))
        // Always land on a terminal status — a search sets 'loading' on the way in, and
        // leaving it there would spin forever and keep the search button disabled.
        // With results still on screen the data remains valid, so go back to 'success'
        // and let the error notice sit alongside it; with nothing to fall back on, the
        // error is all there is to show.
        setStatus(hasResultsRef.current ? 'success' : 'error')
      } finally {
        if (!controller.signal.aborted) setIsRefreshing(false)
      }
    },
    [clearError, showResults],
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

  /** Retry follows the failed attempt, which may never have loaded successfully. */
  const retry = useCallback(async () => {
    const location = attemptedLocationRef.current
    if (!location) return
    await load(location, { useCache: false })
  }, [load])

  return {
    status,
    snapshot,
    errorMessage,
    errorStatus,
    search,
    refresh,
    retry,
    isRefreshing,
    updatedAtMs,
  }
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

/** Anything we don't recognise is treated as the service being unavailable. */
function toStatus(error: unknown): number {
  return error instanceof WeatherFetchError ? error.status : 502
}
