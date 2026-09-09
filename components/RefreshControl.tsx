'use client'

import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import { formatHour } from '@/lib/formatWeather'

export type RefreshControlProps = {
  onRefresh: () => void
  isRefreshing?: boolean
  /** When the showing data was fetched. Null before anything has loaded. */
  updatedAtMs?: number | null
}

/**
 * Re-fetches the loaded location and says when the data on screen was fetched.
 *
 * Presentational: it neither knows the location nor decides whether to use the cache.
 */
export function RefreshControl({
  onRefresh,
  isRefreshing = false,
  updatedAtMs = null,
}: RefreshControlProps) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <IconButton
        onClick={onRefresh}
        aria-label="Refresh"
        size="small"
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <CircularProgress size={18} aria-label="Refreshing" />
        ) : (
          <RefreshIcon fontSize="small" />
        )}
      </IconButton>

      {updatedAtMs !== null && (
        <Typography variant="caption" color="text.secondary">
          Updated {formatLocalTime(updatedAtMs)}
        </Typography>
      )}
    </Stack>
  )
}

/**
 * The viewer's own clock, not the location's — this says when *you* last fetched, so
 * Tokyo's time would be misleading here even while the forecast is shown in it.
 */
function formatLocalTime(epochMs: number): string {
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return formatHour(new Date(epochMs).toISOString(), viewerTimeZone)
}
