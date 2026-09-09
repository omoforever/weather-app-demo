import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest'
import { HourlyTimeline } from '@/components/HourlyTimeline'
import { toSnapshot } from '@/lib/shapeWeather'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import type { WeatherSnapshot } from '@/types/weather'

const SNAPSHOT: WeatherSnapshot = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

/** jsdom has no layout, so scrollIntoView doesn't exist — stub it to observe the call. */
type ScrollIntoView = (options?: boolean | ScrollIntoViewOptions) => void

let scrollIntoView: MockedFunction<ScrollIntoView>

beforeEach(() => {
  scrollIntoView = vi.fn<ScrollIntoView>()
  Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(cleanup)

describe('HourlyTimeline', () => {
  it('shows every hour in the window', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(SNAPSHOT.hourly.length)
  })

  it('reads as a named list', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    expect(screen.getByRole('list', { name: 'Hourly forecast' })).toBeInTheDocument()
  })

  it('says what span it covers', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    expect(
      screen.getByRole('heading', { name: 'Previous and next 24 hours' }),
    ).toBeInTheDocument()
  })

  it('marks exactly one hour as current', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    const current = screen
      .getAllByRole('listitem')
      .filter((cell) => cell.getAttribute('aria-current') === 'time')

    expect(current).toHaveLength(1)
  })

  it('marks the hour the current reading falls in, not the first hour', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    const cells = screen.getAllByRole('listitem')
    const currentIndex = cells.findIndex(
      (cell) => cell.getAttribute('aria-current') === 'time',
    )

    // The fixture's window is symmetrical, so "now" sits in the middle, not at the ends.
    expect(currentIndex).toBe(24)
    expect(cells[currentIndex]).toHaveTextContent('Now')
  })

  /** A reading timestamped 22:47 belongs to the 22:00 cell. */
  it('matches the current hour even when the reading is mid-hour', () => {
    const midHour = {
      ...SNAPSHOT,
      current: { ...SNAPSHOT.current, epochSeconds: NOW_EPOCH + 47 * 60 },
    }

    render(<HourlyTimeline snapshot={midHour} />)

    const current = screen
      .getAllByRole('listitem')
      .filter((cell) => cell.getAttribute('aria-current') === 'time')

    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('Now')
  })

  /**
   * The list opens 24 hours in the past, so without this the first thing on screen is
   * yesterday morning.
   */
  it('scrolls the current hour into view', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'center', block: 'nearest' })
  })

  it('scrolls the current cell, not some other one', () => {
    render(<HourlyTimeline snapshot={SNAPSHOT} />)

    const [scrolledElement] = scrollIntoView.mock.contexts
    expect(scrolledElement).toHaveAttribute('aria-current', 'time')
  })

  it('renders nothing when there are no hours to show', () => {
    const { container } = render(
      <HourlyTimeline snapshot={{ ...SNAPSHOT, hourly: [] }} />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
