import type {
  CurrentConditions,
  HourlyPeriod,
  VisualCrossingHour,
  VisualCrossingTimelineResponse,
  WeatherSnapshot,
} from '@/types/weather'
import { WINDOW_SECONDS } from '@/lib/visualCrossing'

/**
 * Pure transform from the Visual Crossing payload to our own shape.
 *
 * `nowEpochSeconds` is passed in rather than read from the clock so the window is
 * deterministic and testable.
 */
export function toSnapshot(
  response: VisualCrossingTimelineResponse,
  nowEpochSeconds: number,
): WeatherSnapshot {
  return {
    resolvedAddress: response.resolvedAddress ?? '',
    timezone: response.timezone,
    current: toCurrentConditions(response.currentConditions, nowEpochSeconds),
    hourly: toHourlyWindow(response, nowEpochSeconds),
  }
}

/**
 * Every hour from now-24h to now+24h, ascending. Visual Crossing nests hours under
 * calendar days, so they are flattened before filtering.
 */
export function toHourlyWindow(
  response: VisualCrossingTimelineResponse,
  nowEpochSeconds: number,
): HourlyPeriod[] {
  // Hourly readings land on the hour, so the bounds are widened to the hours that
  // *contain* now±24h. Without this, a "now" at 23:09 drops the 23:00 reading and
  // the timeline covers only ~23h of the past.
  const earliest = floorToHour(nowEpochSeconds - WINDOW_SECONDS)
  const latest = ceilToHour(nowEpochSeconds + WINDOW_SECONDS)

  return response.days
    .flatMap((day) => day.hours ?? [])
    .filter((hour) => hour.datetimeEpoch >= earliest && hour.datetimeEpoch <= latest)
    .sort((a, b) => a.datetimeEpoch - b.datetimeEpoch)
    .map((hour) => toHourlyPeriod(hour, nowEpochSeconds))
}

const HOUR_SECONDS = 60 * 60

function floorToHour(epochSeconds: number): number {
  return Math.floor(epochSeconds / HOUR_SECONDS) * HOUR_SECONDS
}

function ceilToHour(epochSeconds: number): number {
  return Math.ceil(epochSeconds / HOUR_SECONDS) * HOUR_SECONDS
}

function toHourlyPeriod(
  hour: VisualCrossingHour,
  nowEpochSeconds: number,
): HourlyPeriod {
  return {
    ...toCurrentConditions(hour, hour.datetimeEpoch),
    isPast: hour.datetimeEpoch < nowEpochSeconds,
  }
}

/**
 * Shared mapping of a Visual Crossing hour block. `currentConditions` uses the same
 * field names as an hour, so both go through here.
 */
function toCurrentConditions(
  hour: VisualCrossingHour | undefined,
  fallbackEpochSeconds: number,
): CurrentConditions {
  const epochSeconds = hour?.datetimeEpoch ?? fallbackEpochSeconds
  return {
    timestamp: new Date(epochSeconds * 1000).toISOString(),
    epochSeconds,
    temperature: hour?.temp ?? 0,
    windSpeed: hour?.windspeed ?? 0,
    precipitationProbability: hour?.precipprob ?? 0,
    condition: {
      label: hour?.conditions ?? 'Unknown',
      icon: hour?.icon ?? 'cloudy',
    },
  }
}
