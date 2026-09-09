import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HourlyPeriodCell } from '@/components/HourlyPeriodCell'
import type { HourlyPeriod } from '@/types/weather'

const PERIOD: HourlyPeriod = {
  timestamp: '2026-09-08T12:00:00.000Z',
  epochSeconds: 1_788_868_800,
  temperature: 15.2,
  windSpeed: 9.4,
  precipitationProbability: 34.6,
  condition: { label: 'Partially cloudy', icon: 'partly-cloudy-day' },
  isPast: false,
}

function renderCell(overrides: Partial<HourlyPeriod> = {}, isCurrent = false) {
  render(
    <ul>
      <HourlyPeriodCell
        period={{ ...PERIOD, ...overrides }}
        timeZone="Europe/London"
        isCurrent={isCurrent}
      />
    </ul>,
  )
  return screen.getByRole('listitem')
}

afterEach(cleanup)

describe('HourlyPeriodCell', () => {
  it('labels the hour in the location’s timezone', () => {
    renderCell()

    // Noon UTC is 13:00 in London.
    expect(screen.getByText('13:00')).toBeInTheDocument()
  })

  it('labels the current hour as Now instead of a time', () => {
    renderCell({}, true)

    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.queryByText('13:00')).not.toBeInTheDocument()
  })

  it('marks the current hour for assistive tech, not just visually', () => {
    const cell = renderCell({}, true)

    expect(cell).toHaveAttribute('aria-current', 'time')
  })

  it('leaves other hours unmarked', () => {
    const cell = renderCell()

    expect(cell).not.toHaveAttribute('aria-current')
  })

  it('rounds the temperature and rain chance', () => {
    renderCell()

    expect(screen.getByText('15°C')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.queryByText(/15\.2|34\.6/)).not.toBeInTheDocument()
  })

  it('names the conditions', () => {
    renderCell()

    expect(screen.getByText('Partially cloudy')).toBeInTheDocument()
  })

  it('dims a past hour', () => {
    const cell = renderCell({ isPast: true })

    expect(cell).toHaveStyle({ opacity: '0.55' })
  })

  it('does not dim an upcoming hour', () => {
    const cell = renderCell({ isPast: false })

    expect(cell).toHaveStyle({ opacity: '1' })
  })

  /** The hour containing "now" is technically past, but it is the one you care about. */
  it('does not dim the current hour even though it has started', () => {
    const cell = renderCell({ isPast: true }, true)

    expect(cell).toHaveStyle({ opacity: '1' })
  })

  it('renders as a list item so the timeline reads as a list', () => {
    const cell = renderCell()

    expect(cell.tagName).toBe('LI')
  })
})
