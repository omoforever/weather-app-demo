'use client'

import { useState, type SyntheticEvent } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'

export type SearchInputProps = {
  /** Called with the trimmed location. Never called with a blank one. */
  onSearch: (location: string) => void
  /** Shows the search is running; the field stays usable so a new one can start. */
  isSearching?: boolean
}

/**
 * Location field and submit control. Presentational only — it owns the text being
 * typed and nothing else; fetching and results live in hooks/useWeatherSearch.ts.
 */
export function SearchInput({ onSearch, isSearching = false }: SearchInputProps) {
  const [location, setLocation] = useState('')
  const canSubmit = location.trim().length > 0

  // React 19's types deprecate FormEvent; SyntheticEvent is the supported spelling.
  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    // Submitting a form reloads the page by default; PRODUCT.md wants updates in place.
    event.preventDefault()
    if (!canSubmit) return
    onSearch(location.trim())
  }

  return (
    <Box component="form" onSubmit={handleSubmit} role="search">
      <TextField
        fullWidth
        label="Location"
        placeholder="Try London, or New York, NY"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  aria-label="Search"
                  edge="end"
                  disabled={!canSubmit || isSearching}
                >
                  {/* Feedback sits on the control that was pressed. The spinner keeps
                      the icon's size so the field doesn't jump while searching. */}
                  {isSearching ? (
                    <CircularProgress size={20} aria-label="Searching" />
                  ) : (
                    <SearchIcon />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  )
}
