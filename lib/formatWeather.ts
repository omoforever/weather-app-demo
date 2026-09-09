/**
 * Display formatting for weather values. Kept out of the components so the card and
 * the timeline show a number the same way, and so the rounding rules can be tested
 * without rendering anything.
 */

/** Whole degrees — tenths imply a precision the forecast doesn't have. */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`
}

/** Whole km/h, matching the unitGroup=metric we request. */
export function formatWindSpeed(kilometresPerHour: number): string {
  return `${Math.round(kilometresPerHour)} km/h`
}

export function formatPrecipitationChance(probability: number): string {
  return `${Math.round(probability)}%`
}

/**
 * The hour in the location's own timezone, not the viewer's — someone in London
 * looking up Tokyo wants Tokyo's clock.
 */
export function formatHour(timestamp: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    // 2-digit, not numeric: "08:00" keeps the timeline's columns aligned.
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(timestamp))
}

/** "Now" for the current conditions, an hour label for everything else. */
export function formatPeriodLabel(
  timestamp: string,
  timeZone: string,
  isNow = false,
): string {
  return isNow ? 'Now' : formatHour(timestamp, timeZone)
}
