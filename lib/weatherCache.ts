import type { WeatherSnapshot } from '@/types/weather'

/**
 * Remembers the last snapshot fetched for each location, so searching somewhere twice
 * doesn't cost two lookups. Every live lookup spends 25 records against a 1000/day
 * free tier, and repeat searches are the cheapest ones to avoid.
 *
 * Deliberately in memory only: it lasts for the session and disappears on reload. A
 * durable cache would mean deciding what to do about stale data across days, which
 * this project doesn't need.
 */

/** Weather changes slowly; ten minutes saves real requests without showing stale data. */
export const CACHE_TTL_MS = 10 * 60 * 1000

type CacheEntry = {
  snapshot: WeatherSnapshot
  fetchedAtMs: number
}

const entries = new Map<string, CacheEntry>()

/** Locations are free text: "London" and " london " are the same lookup. */
function keyFor(location: string): string {
  return location.trim().toLowerCase()
}

/**
 * The snapshot for this location if one was fetched recently enough, otherwise
 * undefined. `nowMs` is passed in rather than read from the clock so freshness can be
 * tested without waiting.
 */
export function readCachedWeather(
  location: string,
  nowMs: number,
): WeatherSnapshot | undefined {
  const entry = entries.get(keyFor(location))
  if (!entry) return undefined

  if (nowMs - entry.fetchedAtMs >= CACHE_TTL_MS) {
    // Drop it rather than leaving it to be re-checked on every search.
    entries.delete(keyFor(location))
    return undefined
  }

  return entry.snapshot
}

export function writeCachedWeather(
  location: string,
  snapshot: WeatherSnapshot,
  nowMs: number,
): void {
  entries.set(keyFor(location), { snapshot, fetchedAtMs: nowMs })
}

/** When the cached snapshot for this location was fetched, if there is one. */
export function cachedAt(location: string): number | undefined {
  return entries.get(keyFor(location))?.fetchedAtMs
}

/** Test seam — the cache is module state, so it has to be resettable between tests. */
export function clearWeatherCache(): void {
  entries.clear()
}
