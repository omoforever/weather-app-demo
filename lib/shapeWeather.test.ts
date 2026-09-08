import { describe, expect, it } from 'vitest'
import { toSnapshot } from '@/lib/shapeWeather'
import { WINDOW_SECONDS } from '@/lib/visualCrossing'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'

describe('toSnapshot', () => {
  it('carries the resolved address and timezone through', () => {
    const snapshot = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

    expect(snapshot.resolvedAddress).toBe('London, England, United Kingdom')
    expect(snapshot.timezone).toBe('Europe/London')
  })

  it('maps current conditions onto our field names', () => {
    const snapshot = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

    expect(snapshot.current).toMatchObject({
      temperature: 15.2,
      windSpeed: 9.4,
      precipitationProbability: 35,
      condition: { label: 'Partially cloudy', icon: 'partly-cloudy-day' },
    })
    expect(snapshot.current.timestamp).toBe('2026-09-08T12:00:00.000Z')
  })

  it('keeps only hours within ±24h of now', () => {
    const { hourly } = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

    // -24h through +24h inclusive.
    expect(hourly).toHaveLength(49)
    expect(hourly[0].epochSeconds).toBe(NOW_EPOCH - WINDOW_SECONDS)
    expect(hourly.at(-1)?.epochSeconds).toBe(NOW_EPOCH + WINDOW_SECONDS)
  })

  it('returns hours in ascending order even when days arrive shuffled', () => {
    const response = buildTimelineResponse()
    const shuffled = { ...response, days: [...response.days].reverse() }

    const { hourly } = toSnapshot(shuffled, NOW_EPOCH)

    const epochs = hourly.map((hour) => hour.epochSeconds)
    expect(epochs).toEqual([...epochs].sort((a, b) => a - b))
  })

  it('flags hours before now as past and the rest as future', () => {
    const { hourly } = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

    const past = hourly.filter((hour) => hour.isPast)
    const future = hourly.filter((hour) => !hour.isPast)

    expect(past).toHaveLength(24)
    expect(past.at(-1)?.epochSeconds).toBe(NOW_EPOCH - 3_600)
    expect(future[0].epochSeconds).toBe(NOW_EPOCH)
  })

  it('tolerates days with no hours array', () => {
    const response = buildTimelineResponse({ days: [{}, {}] })

    expect(toSnapshot(response, NOW_EPOCH).hourly).toEqual([])
  })

  it('defaults missing measurements rather than emitting null', () => {
    const response = buildTimelineResponse({
      days: [
        {
          hours: [
            {
              datetimeEpoch: NOW_EPOCH,
              temp: null,
              windspeed: null,
              precipprob: null,
              conditions: null,
              icon: null,
            },
          ],
        },
      ],
    })

    expect(toSnapshot(response, NOW_EPOCH).hourly[0]).toMatchObject({
      temperature: 0,
      windSpeed: 0,
      precipitationProbability: 0,
      condition: { label: 'Unknown', icon: 'cloudy' },
    })
  })
})
