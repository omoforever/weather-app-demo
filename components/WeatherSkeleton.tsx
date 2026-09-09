'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

/** Enough cells to fill the strip on a wide screen; the rest would scroll out of view. */
const PLACEHOLDER_CELL_COUNT = 8

/**
 * Stands in for the card and timeline while a search runs.
 *
 * Shaped like the real thing — a card with a big value in it, then a row of narrow
 * cells — so the layout doesn't jump when the data lands. DESIGN.md: the loading state
 * replaces the card content, not the whole page.
 */
export function WeatherSkeleton() {
  return (
    // One label for the whole thing: a screen reader should hear "loading weather", not
    // a description of every grey box.
    <Stack spacing={6} role="status" aria-label="Loading weather">
      <Card variant="outlined" aria-hidden>
        <CardContent>
          <Stack spacing={4}>
            <Stack spacing={1}>
              <Skeleton variant="text" width={48} />
              <Skeleton variant="text" width="60%" height={32} />
            </Stack>

            <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
              <Skeleton variant="circular" width={56} height={56} />
              <Stack spacing={1} sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width={120} height={64} />
                <Skeleton variant="text" width="40%" />
              </Stack>
            </Stack>

            <Stack direction="row" spacing={8}>
              <Skeleton variant="text" width={64} />
              <Skeleton variant="text" width={64} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} aria-hidden sx={{ overflow: 'hidden' }}>
        {Array.from({ length: PLACEHOLDER_CELL_COUNT }, (_, index) => (
          <Stack key={index} spacing={2} sx={{ minWidth: 72, alignItems: 'center' }}>
            <Skeleton variant="text" width={40} />
            <Skeleton variant="text" width={32} />
            <Skeleton variant="circular" width={20} height={20} />
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}
