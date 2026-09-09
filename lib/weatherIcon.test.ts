import { describe, expect, it } from 'vitest'
import Cloud from '@mui/icons-material/Cloud'
import CloudQueue from '@mui/icons-material/CloudQueue'
import Nightlight from '@mui/icons-material/Nightlight'
import NightsStay from '@mui/icons-material/NightsStay'
import WbSunny from '@mui/icons-material/WbSunny'
import { KNOWN_ICON_SLUGS, weatherIconFor } from '@/lib/weatherIcon'

/** The 16 slugs Visual Crossing documents for its default icon set. */
const DOCUMENTED_SLUGS = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'partly-cloudy-night',
  'cloudy',
  'fog',
  'wind',
  'rain',
  'showers-day',
  'showers-night',
  'thunder-rain',
  'thunder-showers-day',
  'thunder-showers-night',
  'snow',
  'snow-showers-day',
  'snow-showers-night',
]

describe('weatherIconFor', () => {
  it('maps every slug Visual Crossing documents', () => {
    expect([...KNOWN_ICON_SLUGS].sort()).toEqual([...DOCUMENTED_SLUGS].sort())
  })

  it.each(DOCUMENTED_SLUGS)('gives %s an icon and a colour', (slug) => {
    const { Icon, colorToken } = weatherIconFor(slug)

    expect(Icon).toBeTypeOf('object')
    expect(colorToken).toBeTruthy()
  })

  /** Slugs seen in real responses from London, Auckland and New York. */
  it('picks the expected icon for the conditions we have actually seen', () => {
    expect(weatherIconFor('clear-night').Icon).toBe(Nightlight)
    expect(weatherIconFor('partly-cloudy-day').Icon).toBe(CloudQueue)
    expect(weatherIconFor('partly-cloudy-night').Icon).toBe(NightsStay)
    expect(weatherIconFor('cloudy').Icon).toBe(Cloud)
  })

  it('tells day and night apart by icon, not just colour', () => {
    expect(weatherIconFor('clear-day').Icon).toBe(WbSunny)
    expect(weatherIconFor('clear-night').Icon).not.toBe(WbSunny)

    expect(weatherIconFor('partly-cloudy-day').Icon).not.toBe(
      weatherIconFor('partly-cloudy-night').Icon,
    )
  })

  it('uses a distinct colour for each weather family', () => {
    expect(weatherIconFor('clear-day').colorToken).toBe('sun')
    expect(weatherIconFor('rain').colorToken).toBe('rain')
    expect(weatherIconFor('snow').colorToken).toBe('snow')
    expect(weatherIconFor('thunder-rain').colorToken).toBe('storm')
    expect(weatherIconFor('fog').colorToken).toBe('fog')
    expect(weatherIconFor('wind').colorToken).toBe('wind')
  })

  it('groups the variants of one condition onto one icon', () => {
    const rain = weatherIconFor('rain').Icon
    expect(weatherIconFor('showers-day').Icon).toBe(rain)
    expect(weatherIconFor('showers-night').Icon).toBe(rain)

    const snow = weatherIconFor('snow').Icon
    expect(weatherIconFor('snow-showers-day').Icon).toBe(snow)
  })

  /**
   * A slug we don't know must look dull, never break the page — Visual Crossing can
   * add one at any time.
   */
  it('falls back to a cloud for an unrecognised slug', () => {
    expect(weatherIconFor('volcanic-ash')).toEqual({ Icon: Cloud, colorToken: 'cloud' })
  })

  it('falls back rather than throwing on empty or missing input', () => {
    expect(() => weatherIconFor('')).not.toThrow()
    expect(weatherIconFor('').Icon).toBe(Cloud)
  })

  it('tolerates stray whitespace and casing', () => {
    expect(weatherIconFor('  CLEAR-DAY  ').Icon).toBe(WbSunny)
  })
})
