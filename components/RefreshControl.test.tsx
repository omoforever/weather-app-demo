import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RefreshControl } from '@/components/RefreshControl'

/** 2026-09-08T12:00:00Z — 13:00 in London, where these tests run (TZ is set by vitest). */
const UPDATED_AT_MS = 1_788_868_800_000

function renderControl(
  props: { isRefreshing?: boolean; updatedAtMs?: number | null } = {},
) {
  const onRefresh = vi.fn()
  render(<RefreshControl onRefresh={onRefresh} {...props} />)
  return { onRefresh, button: screen.getByRole('button', { name: 'Refresh' }) }
}

afterEach(cleanup)

describe('RefreshControl', () => {
  it('offers a refresh button', () => {
    const { button } = renderControl()

    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
  })

  it('asks for a refresh when clicked', () => {
    const { button, onRefresh } = renderControl()

    fireEvent.click(button)

    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('says when the showing data was fetched', () => {
    renderControl({ updatedAtMs: UPDATED_AT_MS })

    expect(screen.getByText(/^Updated \d{2}:\d{2}$/)).toBeInTheDocument()
  })

  it('says nothing about timing before anything has loaded', () => {
    renderControl({ updatedAtMs: null })

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument()
  })

  describe('while refreshing', () => {
    it('shows a spinner in place of the icon', () => {
      renderControl({ isRefreshing: true })

      expect(screen.getByRole('progressbar', { name: 'Refreshing' })).toBeInTheDocument()
    })

    it('cannot be pressed again', () => {
      const { button, onRefresh } = renderControl({ isRefreshing: true })

      expect(button).toBeDisabled()
      fireEvent.click(button)
      expect(onRefresh).not.toHaveBeenCalled()
    })

    /** The previous timestamp stays put until new data actually arrives. */
    it('keeps showing when the current data was fetched', () => {
      renderControl({ isRefreshing: true, updatedAtMs: UPDATED_AT_MS })

      expect(screen.getByText(/^Updated \d{2}:\d{2}$/)).toBeInTheDocument()
    })
  })

  it('shows no spinner when idle', () => {
    renderControl()

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
