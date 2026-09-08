import type {
  VisualCrossingHour,
  VisualCrossingTimelineResponse,
} from '@/types/weather'

/** 2026-09-08T12:00:00Z — fixed "now" for deterministic window assertions. */
export const NOW_EPOCH = 1_788_868_800

const HOUR_SECONDS = 3_600

function hourAt(offsetHours: number): VisualCrossingHour {
  return {
    datetimeEpoch: NOW_EPOCH + offsetHours * HOUR_SECONDS,
    temp: 14 + offsetHours * 0.1,
    windspeed: 12,
    precipprob: 20,
    conditions: 'Partially cloudy',
    icon: 'partly-cloudy-day',
  }
}

/**
 * Three calendar days of hourly data spanning -36h to +36h around NOW_EPOCH, so the
 * ±24h filter has hours to discard at both ends.
 */
export function buildTimelineResponse(
  overrides: Partial<VisualCrossingTimelineResponse> = {},
): VisualCrossingTimelineResponse {
  const offsets = range(-36, 36)
  return {
    resolvedAddress: 'London, England, United Kingdom',
    timezone: 'Europe/London',
    currentConditions: { ...hourAt(0), temp: 15.2, windspeed: 9.4, precipprob: 35 },
    days: [
      { hours: offsets.slice(0, 24).map(hourAt) },
      { hours: offsets.slice(24, 48).map(hourAt) },
      { hours: offsets.slice(48).map(hourAt) },
    ],
    ...overrides,
  }
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}
