'use client'

import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { SearchInput } from '@/components/SearchInput'
import { useWeatherSearch } from '@/hooks/useWeatherSearch'

/**
 * Wires the search field to the search state. The plain-text results below are a
 * placeholder — the Current weather card, Hourly timeline, Loading state and Error
 * state tickets each replace one of them with a real component.
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
          <Stack spacing={2}>
            <Typography variant="h6" component="h2">
              {snapshot.resolvedAddress}
            </Typography>
            <Typography variant="caption">
              {snapshot.current.temperature}°C · {snapshot.current.condition.label} ·{' '}
              {snapshot.current.windSpeed} km/h · {snapshot.current.precipitationProbability}% rain
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {snapshot.hourly.length} hourly readings loaded
            </Typography>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
