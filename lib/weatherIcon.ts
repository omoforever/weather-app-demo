import type { SvgIconComponent } from '@mui/icons-material'
import Air from '@mui/icons-material/Air'
import Cloud from '@mui/icons-material/Cloud'
import CloudQueue from '@mui/icons-material/CloudQueue'
import Foggy from '@mui/icons-material/Foggy'
import Grain from '@mui/icons-material/Grain'
import Nightlight from '@mui/icons-material/Nightlight'
import NightsStay from '@mui/icons-material/NightsStay'
import Snowing from '@mui/icons-material/Snowing'
import Thunderstorm from '@mui/icons-material/Thunderstorm'
import WbSunny from '@mui/icons-material/WbSunny'
import type { WeatherPalette } from '@/theme'

export type WeatherColorToken = keyof WeatherPalette

export type WeatherIconChoice = {
  Icon: SvgIconComponent
  colorToken: WeatherColorToken
}

/**
 * Maps a Visual Crossing `icon` slug to an icon and a colour.
 *
 * Day and night are told apart by *shape* — a sun against a crescent, a plain cloud
 * against a moon-behind-cloud — because colour alone fails anyone who can't
 * distinguish it. There is no sun-behind-cloud icon in the set, so "partly cloudy"
 * day uses an outline cloud and "cloudy" a filled one.
 *
 * Covers the 16 slugs Visual Crossing documents for its default icon set. Anything
 * unrecognised falls back to a plain cloud rather than rendering nothing — a new slug
 * upstream should look dull, not break the page.
 */
const ICONS_BY_SLUG: Record<string, WeatherIconChoice> = {
  'clear-day': { Icon: WbSunny, colorToken: 'sun' },
  'clear-night': { Icon: Nightlight, colorToken: 'night' },
  'partly-cloudy-day': { Icon: CloudQueue, colorToken: 'cloud' },
  'partly-cloudy-night': { Icon: NightsStay, colorToken: 'night' },
  cloudy: { Icon: Cloud, colorToken: 'cloud' },
  fog: { Icon: Foggy, colorToken: 'fog' },
  wind: { Icon: Air, colorToken: 'wind' },
  rain: { Icon: Grain, colorToken: 'rain' },
  'showers-day': { Icon: Grain, colorToken: 'rain' },
  'showers-night': { Icon: Grain, colorToken: 'rain' },
  'thunder-rain': { Icon: Thunderstorm, colorToken: 'storm' },
  'thunder-showers-day': { Icon: Thunderstorm, colorToken: 'storm' },
  'thunder-showers-night': { Icon: Thunderstorm, colorToken: 'storm' },
  snow: { Icon: Snowing, colorToken: 'snow' },
  'snow-showers-day': { Icon: Snowing, colorToken: 'snow' },
  'snow-showers-night': { Icon: Snowing, colorToken: 'snow' },
}

const FALLBACK: WeatherIconChoice = { Icon: Cloud, colorToken: 'cloud' }

export function weatherIconFor(slug: string): WeatherIconChoice {
  return ICONS_BY_SLUG[slug.trim().toLowerCase()] ?? FALLBACK
}

/** Exported for tests, so "every documented slug is mapped" can be asserted. */
export const KNOWN_ICON_SLUGS = Object.keys(ICONS_BY_SLUG)
