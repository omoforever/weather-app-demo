'use client'

import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CurrentWeatherCard } from '@/components/CurrentWeatherCard'
import { HourlyTimeline } from '@/components/HourlyTimeline'
import { SearchInput } from '@/components/SearchInput'
import { useWeatherSearch } from '@/hooks/useWeatherSearch'

/**
 * Wires the search field to the search state. The loading and error lines are still
 * plain text — the Loading state and Error state tickets replace them.
 */
export default function HomePage() {
  const { status, snapshot, errorMessage, search } = useWeatherSearch()

  return (
    <Container maxWidth="sm" sx={{ py: 12 }}>
      <Stack spacing={6}>
        <Typography variant="h4" component="h1">
          Weather
        </Typography>

        <SearchInput onSearch={search} isSearching={status === 'loading'} />

        {status === 'loading' && <Typography>Loading…</Typography>}

        {status === 'error' && (
          <Typography role="alert" color="error">
            {errorMessage}
          </Typography>
        )}

        {status === 'success' && snapshot && (
          <>
            <CurrentWeatherCard snapshot={snapshot} />
            <HourlyTimeline snapshot={snapshot} />
          </>
        )}
      </Stack>
    </Container>
  )
}
