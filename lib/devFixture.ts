import type {
  VisualCrossingHour,
  VisualCrossingTimelineResponse,
} from '@/types/weather'

/**
 * Generated stand-in for a Visual Crossing response, used when WEATHER_FIXTURE=1.
 *
 * Every live lookup costs 25 records against a 1000/day free tier, and manual UI
 * testing burns through that far faster than the app ever would in use. This lets the
 * UI be worked on for free.
 *
 * It deliberately cycles through varied conditions rather than repeating one: that way
 * every icon and colour can be seen at once, instead of waiting for it to actually
 * snow somewhere.
 */

const HOUR_SECONDS = 3600
const WINDOW_HOURS = 30 // comfortably wider than the ±24h the route trims to

type ConditionSample = { conditions: string; icon: string; temp: number; precipprob: number }

/** One per icon family, so the whole palette is visible in a single fixture. */
const CONDITION_CYCLE: ConditionSample[] = [
  { conditions: 'Clear', icon: 'clear-day', temp: 21, precipprob: 0 },
  { conditions: 'Partially cloudy', icon: 'partly-cloudy-day', temp: 18, precipprob: 10 },
  { conditions: 'Overcast', icon: 'cloudy', temp: 15, precipprob: 25 },
  { conditions: 'Rain', icon: 'rain', temp: 12, precipprob: 80 },
  { conditions: 'Thunderstorm', icon: 'thunder-rain', temp: 14, precipprob: 95 },
  { conditions: 'Snow', icon: 'snow', temp: -2, precipprob: 70 },
  { conditions: 'Fog', icon: 'fog', temp: 7, precipprob: 15 },
  { conditions: 'Windy', icon: 'wind', temp: 11, precipprob: 5 },
  { conditions: 'Clear', icon: 'clear-night', temp: 9, precipprob: 0 },
  { conditions: 'Partially cloudy', icon: 'partly-cloudy-night', temp: 8, precipprob: 20 },
]

function hourAt(epochSeconds: number, index: number): VisualCrossingHour {
  const sample = CONDITION_CYCLE[index % CONDITION_CYCLE.length]
  return {
    datetimeEpoch: epochSeconds,
    temp: sample.temp,
    windspeed: 5 + (index % 7) * 3,
    precipprob: sample.precipprob,
    conditions: sample.conditions,
    icon: sample.icon,
  }
}

/**
 * Builds hours either side of `nowEpochSeconds`, grouped into days the way Visual
 * Crossing returns them so the same parsing runs against it.
 */
export function buildFixtureTimeline(
  location: string,
  nowEpochSeconds: number,
): VisualCrossingTimelineResponse {
  const startOfHour = Math.floor(nowEpochSeconds / HOUR_SECONDS) * HOUR_SECONDS
  const hours = Array.from({ length: WINDOW_HOURS * 2 + 1 }, (_, index) =>
    hourAt(startOfHour + (index - WINDOW_HOURS) * HOUR_SECONDS, index),
  )

  return {
    // Echoes the query so it's obvious on screen that this is fixture data.
    resolvedAddress: `${location} (fixture)`,
    timezone: 'Europe/London',
    currentConditions: hourAt(nowEpochSeconds, WINDOW_HOURS),
    days: chunkIntoDays(hours),
  }
}

function chunkIntoDays(hours: VisualCrossingHour[]) {
  const days = []
  for (let index = 0; index < hours.length; index += 24) {
    days.push({ hours: hours.slice(index, index + 24) })
  }
  return days
}

/**
 * Fixture data is a development convenience only — a production build must never serve
 * invented weather, whatever the environment says.
 */
export function shouldUseFixture(): boolean {
  return process.env.WEATHER_FIXTURE === '1' && process.env.NODE_ENV !== 'production'
}
