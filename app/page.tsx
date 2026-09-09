'use client'

import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CurrentWeatherCard } from '@/components/CurrentWeatherCard'
import { ErrorNotice } from '@/components/ErrorNotice'
import { HourlyTimeline } from '@/components/HourlyTimeline'
import { RefreshControl } from '@/components/RefreshControl'
import { SearchInput } from '@/components/SearchInput'
import { useWeatherSearch } from '@/hooks/useWeatherSearch'
import { isRetryable } from '@/lib/weatherErrors'

/**
 * Wires the search field to the search state. Loading is still plain text — the
 * Loading state ticket replaces it.
 */
export default function HomePage() {
  const {
    status,
    snapshot,
    errorMessage,
    errorStatus,
    search,
    refresh,
    retry,
    isRefreshing,
    updatedAtMs,
  } = useWeatherSearch()

  const hasResults = status === 'success' && snapshot !== null
  // Retry only where it could succeed; an unknown location gives the same answer again.
  const canRetry = errorStatus !== null && isRetryable(errorStatus)

  return (
    <Container maxWidth="sm" sx={{ py: 12 }}>
      <Stack spacing={6}>
        <Typography variant="h4" component="h1">
          Weather
        </Typography>

        <SearchInput onSearch={search} isSearching={status === 'loading'} />

        {status === 'loading' && <Typography>Loading…</Typography>}

        {/* Sits above the results when there are some — a failed refresh reports next to
            what it failed to update — and in their place when there are none. */}
        {errorMessage && (
          <ErrorNotice
            message={errorMessage}
            onRetry={canRetry ? retry : undefined}
            isRetrying={isRefreshing}
          />
        )}

        {hasResults && (
          <>
            <RefreshControl
              onRefresh={refresh}
              isRefreshing={isRefreshing}
              updatedAtMs={updatedAtMs}
            />
            <CurrentWeatherCard snapshot={snapshot} />
            <HourlyTimeline snapshot={snapshot} />
          </>
        )}
      </Stack>
    </Container>
  )
}
