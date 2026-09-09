'use client'

import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CurrentWeatherCard } from '@/components/CurrentWeatherCard'
import { SearchInput } from '@/components/SearchInput'
import { useWeatherSearch } from '@/hooks/useWeatherSearch'

/**
 * Wires the search field to the search state. The loading and error lines are still
 * plain text — the Hourly timeline, Loading state and Error state tickets each
 * replace one of them with a real component.
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

        {status === 'success' && snapshot && <CurrentWeatherCard snapshot={snapshot} />}
      </Stack>
    </Container>
  )
}
