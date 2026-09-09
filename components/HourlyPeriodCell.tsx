'use client'

import type { Ref } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { WeatherIcon } from '@/components/WeatherIcon'
import {
  formatPeriodLabel,
  formatPrecipitationChance,
  formatTemperature,
} from '@/lib/formatWeather'
import type { HourlyPeriod } from '@/types/weather'

export type HourlyPeriodCellProps = {
  period: HourlyPeriod
  /** IANA zone of the location, so the hour reads in local time. */
  timeZone: string
  /** The hour the current conditions fall in — labelled "Now" and not dimmed. */
  isCurrent?: boolean
  /** Lets the timeline scroll this cell into view. React 19 takes ref as a plain prop. */
  ref?: Ref<HTMLLIElement>
}

/**
 * One hour in the timeline. Presentational: it is told whether it is the current
 * hour rather than working it out, so the timeline stays the single place that
 * decides where "now" sits.
 */
export function HourlyPeriodCell({
  period,
  timeZone,
  isCurrent = false,
  ref,
}: HourlyPeriodCellProps) {
  // Past hours are context, not forecast — de-emphasised so the eye lands on now onward.
  const isDimmed = period.isPast && !isCurrent

  return (
    <Stack
      component="li"
      ref={ref}
      // Announces "current" to a screen reader; the background alone is visual-only.
      aria-current={isCurrent ? 'time' : undefined}
      spacing={2}
      sx={{
        // Narrower than when the condition was spelled out in words.
        minWidth: 72,
        px: 2,
        py: 3,
        borderRadius: 2,
        // textAlign centres the text; the icon is a flex item, so it needs alignItems
        // to sit in the middle rather than against the left edge.
        alignItems: 'center',
        textAlign: 'center',
        opacity: isDimmed ? 0.55 : 1,
        bgcolor: isCurrent ? 'action.selected' : 'transparent',
      }}
    >
      <Typography variant="overline" color="text.secondary" noWrap>
        {formatPeriodLabel(period.timestamp, timeZone, isCurrent)}
      </Typography>

      <Typography variant="caption" component="p">
        {formatTemperature(period.temperature)}
      </Typography>

      <Typography variant="caption" color="text.secondary" noWrap>
        {formatPrecipitationChance(period.precipitationProbability)}
      </Typography>

      {/* Not decorative: the icon replaces the condition words here, so its label is
          the only thing conveying the condition. */}
      <WeatherIcon condition={period.condition} fontSize="small" />
    </Stack>
  )
}
