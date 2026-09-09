'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

export type ErrorNoticeProps = {
  message: string
  /**
   * Pass a handler only when trying again could actually succeed — the page decides
   * that with `isRetryable` from lib/weatherErrors.ts. Without one, no button shows.
   */
  onRetry?: () => void
  isRetrying?: boolean
}

/**
 * Inline error message, sitting where the failure happened rather than in a toast
 * (DESIGN.md patterns log). Presentational: the message and whether a retry makes
 * sense are both decided elsewhere.
 */
export function ErrorNotice({ message, onRetry, isRetrying = false }: ErrorNoticeProps) {
  return (
    <Alert
      severity="error"
      // role="alert" so it's announced when it appears, not only when focused.
      role="alert"
      action={
        onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size="small"
            color="inherit"
            startIcon={
              isRetrying ? <CircularProgress size={14} aria-label="Retrying" /> : undefined
            }
          >
            Try again
          </Button>
        )
      }
    >
      {message}
    </Alert>
  )
}
