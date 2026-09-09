'use client'

import { weatherIconFor } from '@/lib/weatherIcon'
import type { WeatherCondition } from '@/types/weather'

export type WeatherIconProps = {
  condition: WeatherCondition
  /** MUI size token; the card wants a large icon, timeline cells a small one. */
  fontSize?: 'small' | 'medium' | 'large'
  /**
   * True where the condition is already written on screen next to the icon — the card.
   * The icon is then hidden from assistive tech so it isn't announced twice.
   *
   * Leave false wherever the icon *replaces* the words, as in the timeline cells: there
   * the label is the only way the condition is conveyed at all.
   */
  decorative?: boolean
}

export function WeatherIcon({
  condition,
  fontSize = 'medium',
  decorative = false,
}: WeatherIconProps) {
  const { Icon, colorToken } = weatherIconFor(condition.icon)

  return (
    <Icon
      fontSize={fontSize}
      // role/aria-label make an <svg> announce as an image named for the condition.
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : condition.label}
      aria-hidden={decorative || undefined}
      sx={{ color: `weather.${colorToken}` }}
    />
  )
}
