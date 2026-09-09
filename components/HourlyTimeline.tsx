'use client'

import { useEffect, useRef } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { HourlyPeriodCell } from '@/components/HourlyPeriodCell'
import type { WeatherSnapshot } from '@/types/weather'

export type HourlyTimelineProps = {
  snapshot: WeatherSnapshot
}

const SECONDS_PER_HOUR = 3600

/**
 * Total spread of the staggered entrance, in seconds.
 *
 * Fixed for the whole strip rather than per cell: at a flat 20ms each, ~50 cells would
 * take a second to finish arriving, and the last of them would still be moving after
 * the scroll-to-now has happened.
 */
const STAGGER_WINDOW_SECONDS = 0.25

/**
 * The previous and next 24 hours, scrolling sideways.
 *
 * This is the one place that decides which hour counts as "now" — the cells are told,
 * so they can't disagree with each other.
 */
export function HourlyTimeline({ snapshot }: HourlyTimelineProps) {
  const { hourly, timezone, current } = snapshot
  const currentEpochSeconds = startOfHour(current.epochSeconds)
  const currentCellRef = useRef<HTMLLIElement | null>(null)

  // The list opens 24 hours in the past, so bring "now" into view — otherwise the
  // first thing you see is yesterday morning.
  useEffect(() => {
    currentCellRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [currentEpochSeconds])

  if (hourly.length === 0) return null

  return (
    <Stack spacing={2}>
      <Typography variant="overline" color="text.secondary" component="h2">
        Previous and next 24 hours
      </Typography>

      <Stack
        component="ul"
        direction="row"
        spacing={1}
        aria-label="Hourly forecast"
        sx={{
          overflowX: 'auto',
          listStyle: 'none',
          m: 0,
          p: 0,
          pb: 2,
          scrollSnapType: 'x proximity',
          '& > li': { scrollSnapAlign: 'center' },
        }}
      >
        {hourly.map((period, index) => {
          const isCurrent = period.epochSeconds === currentEpochSeconds
          return (
            <HourlyPeriodCell
              key={period.epochSeconds}
              ref={isCurrent ? currentCellRef : undefined}
              period={period}
              timeZone={timezone}
              isCurrent={isCurrent}
              entranceDelay={staggerDelay(index, hourly.length)}
            />
          )
        })}
      </Stack>
    </Stack>
  )
}

/** Readings sit on the hour, so "now" is the hour the current reading falls in. */
function startOfHour(epochSeconds: number): number {
  return Math.floor(epochSeconds / SECONDS_PER_HOUR) * SECONDS_PER_HOUR
}

/**
 * Spreads the cells' entrances across a fixed window, so the whole strip has arrived
 * within STAGGER_WINDOW_SECONDS however many hours there are.
 */
export function staggerDelay(index: number, total: number): number {
  if (total <= 1) return 0
  return (index / (total - 1)) * STAGGER_WINDOW_SECONDS
}
