import { beforeEach, describe, expect, it } from 'vitest'
import {
  CACHE_TTL_MS,
  cachedAt,
  clearWeatherCache,
  readCachedWeather,
  writeCachedWeather,
} from '@/lib/weatherCache'
import { toSnapshot } from '@/lib/shapeWeather'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import type { WeatherSnapshot } from '@/types/weather'

const NOW_MS = NOW_EPOCH * 1000

function snapshotFor(address: string): WeatherSnapshot {
  return { ...toSnapshot(buildTimelineResponse(), NOW_EPOCH), resolvedAddress: address }
}

beforeEach(clearWeatherCache)

describe('readCachedWeather', () => {
  it('has nothing for a location never searched', () => {
    expect(readCachedWeather('London', NOW_MS)).toBeUndefined()
  })

  it('returns what was stored for that location', () => {
    const snapshot = snapshotFor('London')
    writeCachedWeather('London', snapshot, NOW_MS)

    expect(readCachedWeather('London', NOW_MS)).toEqual(snapshot)
  })

  it('keeps locations apart', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)
    writeCachedWeather('Paris', snapshotFor('Paris'), NOW_MS)

    expect(readCachedWeather('London', NOW_MS)?.resolvedAddress).toBe('London')
    expect(readCachedWeather('Paris', NOW_MS)?.resolvedAddress).toBe('Paris')
  })

  /** Otherwise a difference in casing quietly costs another 25 records. */
  it('treats the same place written differently as one entry', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)

    expect(readCachedWeather('  LONDON  ', NOW_MS)).toBeDefined()
    expect(readCachedWeather('london', NOW_MS)).toBeDefined()
  })

  it('serves an entry that is still fresh', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)

    expect(readCachedWeather('London', NOW_MS + CACHE_TTL_MS - 1)).toBeDefined()
  })

  it('does not serve an entry once it has expired', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)

    expect(readCachedWeather('London', NOW_MS + CACHE_TTL_MS)).toBeUndefined()
    expect(readCachedWeather('London', NOW_MS + CACHE_TTL_MS + 60_000)).toBeUndefined()
  })

  it('forgets an expired entry rather than re-checking it forever', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)

    readCachedWeather('London', NOW_MS + CACHE_TTL_MS)

    expect(cachedAt('London')).toBeUndefined()
  })

  it('overwrites an entry when the location is fetched again', () => {
    writeCachedWeather('London', snapshotFor('stale'), NOW_MS)
    writeCachedWeather('London', snapshotFor('fresh'), NOW_MS + 60_000)

    expect(readCachedWeather('London', NOW_MS + 60_000)?.resolvedAddress).toBe('fresh')
  })

  /** A refresh writes a new timestamp, which must restart the ten minutes. */
  it('restarts the freshness window when an entry is replaced', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)
    const almostExpired = NOW_MS + CACHE_TTL_MS - 1

    writeCachedWeather('London', snapshotFor('London'), almostExpired)

    expect(readCachedWeather('London', almostExpired + CACHE_TTL_MS - 1)).toBeDefined()
  })
})

describe('cachedAt', () => {
  it('reports when the entry was fetched', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)

    expect(cachedAt('London')).toBe(NOW_MS)
  })

  it('reports nothing for a location that was never cached', () => {
    expect(cachedAt('Nowhere')).toBeUndefined()
  })
})

describe('clearWeatherCache', () => {
  it('empties everything', () => {
    writeCachedWeather('London', snapshotFor('London'), NOW_MS)
    writeCachedWeather('Paris', snapshotFor('Paris'), NOW_MS)

    clearWeatherCache()

    expect(readCachedWeather('London', NOW_MS)).toBeUndefined()
    expect(readCachedWeather('Paris', NOW_MS)).toBeUndefined()
  })
})
