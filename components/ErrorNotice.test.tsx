import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorNotice } from '@/components/ErrorNotice'
import { UNKNOWN_LOCATION_MESSAGE } from '@/lib/weatherErrors'

afterEach(cleanup)

describe('ErrorNotice', () => {
  it('shows the message it was given', () => {
    render(<ErrorNotice message={UNKNOWN_LOCATION_MESSAGE} />)

    expect(screen.getByText(UNKNOWN_LOCATION_MESSAGE)).toBeInTheDocument()
  })

  /** Announced on appearance, so a failure isn't silent for anyone not looking at it. */
  it('announces itself to assistive tech', () => {
    render(<ErrorNotice message="Weather service is unavailable." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Weather service is unavailable.')
  })

  describe('when retrying could help', () => {
    it('offers a retry button', () => {
      render(<ErrorNotice message="Weather service is unavailable." onRetry={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    })

    it('asks for a retry when pressed', () => {
      const onRetry = vi.fn()
      render(<ErrorNotice message="Weather service is unavailable." onRetry={onRetry} />)

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(onRetry).toHaveBeenCalledOnce()
    })
  })

  /**
   * Retrying an unknown location returns the same answer and spends another 25 records,
   * so the page withholds the handler and no button should appear.
   */
  describe('when retrying could not help', () => {
    it('offers no retry button', () => {
      render(<ErrorNotice message={UNKNOWN_LOCATION_MESSAGE} />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('while retrying', () => {
    it('shows a spinner', () => {
      render(
        <ErrorNotice message="Weather service is unavailable." onRetry={vi.fn()} isRetrying />,
      )

      expect(screen.getByRole('progressbar', { name: 'Retrying' })).toBeInTheDocument()
    })

    it('cannot be pressed again', () => {
      const onRetry = vi.fn()
      render(
        <ErrorNotice message="Weather service is unavailable." onRetry={onRetry} isRetrying />,
      )

      const button = screen.getByRole('button', { name: /Try again/ })
      expect(button).toBeDisabled()
      fireEvent.click(button)
      expect(onRetry).not.toHaveBeenCalled()
    })

    it('keeps the message visible', () => {
      render(
        <ErrorNotice message="Weather service is unavailable." onRetry={vi.fn()} isRetrying />,
      )

      expect(screen.getByText('Weather service is unavailable.')).toBeInTheDocument()
    })
  })

  it('shows no spinner when idle', () => {
    render(<ErrorNotice message="Weather service is unavailable." onRetry={vi.fn()} />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
