import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildFixtureTimeline, shouldUseFixture } from '@/lib/devFixture'
import { toSnapshot } from '@/lib/shapeWeather'
import { WINDOW_SECONDS } from '@/lib/visualCrossing'

/** 2026-09-08T12:00:00Z */
const NOW = 1_788_868_800

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('buildFixtureTimeline', () => {
  it('looks like a Visual Crossing response, so the real parsing runs against it', () => {
    const timeline = buildFixtureTimeline('London', NOW)

    expect(timeline.timezone).toBeTruthy()
    expect(timeline.currentConditions.datetimeEpoch).toBeTruthy()
    expect(timeline.days.every((day) => Array.isArray(day.hours))).toBe(true)
  })

  it('says on screen that it is fixture data', () => {
    expect(buildFixtureTimeline('London', NOW).resolvedAddress).toBe('London (fixture)')
  })

  it('covers more than the ±24h the route trims to', () => {
    const hours = buildFixtureTimeline('London', NOW).days.flatMap((day) => day.hours ?? [])

    expect(hours[0].datetimeEpoch).toBeLessThan(NOW - WINDOW_SECONDS)
    expect(hours.at(-1)!.datetimeEpoch).toBeGreaterThan(NOW + WINDOW_SECONDS)
  })

  it('produces hours on the hour, an hour apart', () => {
    const hours = buildFixtureTimeline('London', NOW).days.flatMap((day) => day.hours ?? [])

    expect(hours.every((hour) => hour.datetimeEpoch % 3600 === 0)).toBe(true)
    expect(
      hours.every((hour, index) => index === 0 || hour.datetimeEpoch - hours[index - 1].datetimeEpoch === 3600),
    ).toBe(true)
  })

  /** The point of the fixture: see every icon without waiting for the weather. */
  it('shows a spread of conditions rather than one repeated', () => {
    const hours = buildFixtureTimeline('London', NOW).days.flatMap((day) => day.hours ?? [])
    const icons = new Set(hours.map((hour) => hour.icon))

    expect(icons.size).toBeGreaterThanOrEqual(8)
    expect(icons).toContain('snow')
    expect(icons).toContain('thunder-rain')
    expect(icons).toContain('clear-night')
  })

  it('survives the real transform and fills the window', () => {
    const snapshot = toSnapshot(buildFixtureTimeline('London', NOW), NOW)

    expect(snapshot.hourly).toHaveLength(49)
    expect(snapshot.hourly.some((hour) => hour.isPast)).toBe(true)
    expect(snapshot.hourly.some((hour) => !hour.isPast)).toBe(true)
    expect(snapshot.current.temperature).toBeTypeOf('number')
  })

  it('follows the clock it is given, so "now" is always current', () => {
    const later = NOW + 7 * 24 * 3600

    const snapshot = toSnapshot(buildFixtureTimeline('London', later), later)

    expect(snapshot.current.epochSeconds).toBe(later)
  })
})

describe('shouldUseFixture', () => {
  it('is off unless the flag is set', () => {
    vi.stubEnv('WEATHER_FIXTURE', '')
    vi.stubEnv('NODE_ENV', 'development')

    expect(shouldUseFixture()).toBe(false)
  })

  it('is on in development when the flag is set', () => {
    vi.stubEnv('WEATHER_FIXTURE', '1')
    vi.stubEnv('NODE_ENV', 'development')

    expect(shouldUseFixture()).toBe(true)
  })

  /** Invented weather must never reach real users, whatever the environment says. */
  it('refuses to serve invented weather in production', () => {
    vi.stubEnv('WEATHER_FIXTURE', '1')
    vi.stubEnv('NODE_ENV', 'production')

    expect(shouldUseFixture()).toBe(false)
  })

  it('ignores values other than an explicit 1', () => {
    vi.stubEnv('NODE_ENV', 'development')

    for (const value of ['0', 'true', 'yes', 'false']) {
      vi.stubEnv('WEATHER_FIXTURE', value)
      expect(shouldUseFixture()).toBe(false)
    }
  })
})
