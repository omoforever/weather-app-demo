'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWeather } from '@/lib/fetchWeather'
import { SERVICE_UNAVAILABLE_MESSAGE, WeatherFetchError } from '@/lib/weatherErrors'
import type { WeatherSnapshot } from '@/types/weather'

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

export type WeatherSearch = {
  status: SearchStatus
  snapshot: WeatherSnapshot | null
  errorMessage: string | null
  search: (location: string) => Promise<void>
}

/**
 * Owns the state of one location search: what we're doing, what came back, and
 * what went wrong. Components stay presentational and read this.
 */
export function useWeatherSearch(): WeatherSearch {
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const inFlightRef = useRef<AbortController | null>(null)

  // Abandon any in-flight request if the component goes away.
  useEffect(() => () => inFlightRef.current?.abort(), [])

  const search = useCallback(async (location: string) => {
    const controller = startRequest(inFlightRef)
    setStatus('loading')
    setErrorMessage(null)

    try {
      const result = await fetchWeather(location, controller.signal)
      setSnapshot(result)
      setStatus('success')
    } catch (error) {
      // A newer search replaced this one — it owns the state now, so leave it alone.
      if (controller.signal.aborted) return
      setErrorMessage(toMessage(error))
      setStatus('error')
    }
  }, [])

  return { status, snapshot, errorMessage, search }
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
