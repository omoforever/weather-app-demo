'use client'

import type { Ref } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
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
        minWidth: 88,
        px: 2,
        py: 3,
        borderRadius: 2,
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

      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
        {period.condition.label}
      </Typography>
    </Stack>
  )
}
