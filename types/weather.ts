/**
 * Shapes exchanged between /api/weather and the client, plus the narrow slice of
 * the Visual Crossing timeline payload we actually read.
 */

export type WeatherCondition = {
  /** Human-readable summary, e.g. "Partially cloudy". */
  label: string
  /** Visual Crossing icon slug, e.g. "partly-cloudy-day". */
  icon: string
}

export type HourlyPeriod = {
  /** ISO-8601 instant for the start of the hour. */
  timestamp: string
  epochSeconds: number
  /** Degrees Celsius. */
  temperature: number
  /** Kilometres per hour. */
  windSpeed: number
  /** 0-100. */
  precipitationProbability: number
  condition: WeatherCondition
  /** True for hours before "now" — drives past/future styling in the timeline. */
  isPast: boolean
}

export type CurrentConditions = Omit<HourlyPeriod, 'isPast'>

export type WeatherSnapshot = {
  /** Location as Visual Crossing geocoded it, e.g. "London, England, United Kingdom". */
  resolvedAddress: string
  /** IANA timezone of the location, e.g. "Europe/London". */
  timezone: string
  current: CurrentConditions
  /** Hours from now-24h to now+24h, ascending. */
  hourly: HourlyPeriod[]
}

export type WeatherErrorResponse = {
  error: string
}

/** Fields we read from a Visual Crossing hour or currentConditions block. */
export type VisualCrossingHour = {
  datetimeEpoch: number
  temp: number | null
  windspeed: number | null
  precipprob: number | null
  conditions: string | null
  icon: string | null
}

export type VisualCrossingDay = {
  hours?: VisualCrossingHour[]
}

export type VisualCrossingTimelineResponse = {
  resolvedAddress: string
  timezone: string
  currentConditions: VisualCrossingHour
  days: VisualCrossingDay[]
}
