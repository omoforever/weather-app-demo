import { describe, expect, it } from 'vitest'
import {
  formatHour,
  formatPeriodLabel,
  formatPrecipitationChance,
  formatTemperature,
  formatWindSpeed,
} from '@/lib/formatWeather'

describe('formatTemperature', () => {
  it('rounds to whole degrees', () => {
    expect(formatTemperature(15.2)).toBe('15°C')
    expect(formatTemperature(15.6)).toBe('16°C')
  })

  it('keeps the minus sign on freezing temperatures', () => {
    expect(formatTemperature(-3.4)).toBe('-3°C')
  })

  it('has no signed zero', () => {
    expect(formatTemperature(-0.2)).toBe('0°C')
  })
})

describe('formatWindSpeed', () => {
  it('rounds to whole km/h', () => {
    expect(formatWindSpeed(9.4)).toBe('9 km/h')
    expect(formatWindSpeed(0)).toBe('0 km/h')
  })
})

describe('formatPrecipitationChance', () => {
  it('rounds to a whole percentage', () => {
    expect(formatPrecipitationChance(34.6)).toBe('35%')
    expect(formatPrecipitationChance(0)).toBe('0%')
    expect(formatPrecipitationChance(100)).toBe('100%')
  })
})

describe('formatHour', () => {
  it('shows the hour in 24-hour time', () => {
    expect(formatHour('2026-09-08T14:00:00.000Z', 'Europe/London')).toBe('15:00')
  })

  it('uses midnight rather than 24:00', () => {
    expect(formatHour('2026-09-08T23:00:00.000Z', 'Europe/London')).toBe('00:00')
  })

  /**
   * The point of carrying `timezone` through the API: looking up Tokyo from London
   * should show Tokyo's clock, not the viewer's.
   */
  it('shows the location’s local time, not the viewer’s', () => {
    const noonUtc = '2026-09-08T12:00:00.000Z'

    expect(formatHour(noonUtc, 'Europe/London')).toBe('13:00')
    expect(formatHour(noonUtc, 'Asia/Tokyo')).toBe('21:00')
    expect(formatHour(noonUtc, 'America/New_York')).toBe('08:00')
  })

  it('handles a location a day ahead of UTC', () => {
    // 21:00 UTC is already tomorrow morning in Auckland.
    expect(formatHour('2026-09-08T21:00:00.000Z', 'Pacific/Auckland')).toBe('09:00')
  })
})

describe('formatPeriodLabel', () => {
  it('labels the current conditions as Now', () => {
    expect(formatPeriodLabel('2026-09-08T12:00:00.000Z', 'Europe/London', true)).toBe('Now')
  })

  it('labels every other period with its hour', () => {
    expect(formatPeriodLabel('2026-09-08T12:00:00.000Z', 'Europe/London')).toBe('13:00')
  })
})
