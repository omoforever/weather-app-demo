import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from 'motion/react'
import { HourlyPeriodCell } from '@/components/HourlyPeriodCell'
import type { HourlyPeriod } from '@/types/weather'

/**
 * Only the reduced-motion hook is faked — Motion itself still renders, so these tests
 * observe the real inline styles it applies rather than a stub's props.
 */
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: vi.fn(() => false),
}))

const reducedMotionMock = vi.mocked(useReducedMotion)

const PERIOD: HourlyPeriod = {
  timestamp: '2026-09-08T12:00:00.000Z',
  epochSeconds: 1_788_868_800,
  temperature: 15.2,
  windSpeed: 9.4,
  precipitationProbability: 34.6,
  condition: { label: 'Partially cloudy', icon: 'partly-cloudy-day' },
  isPast: false,
}

function renderCell(
  overrides: Partial<HourlyPeriod> = {},
  isCurrent = false,
  entranceDelay = 0,
) {
  render(
    <ul>
      <HourlyPeriodCell
        period={{ ...PERIOD, ...overrides }}
        timeZone="Europe/London"
        isCurrent={isCurrent}
        entranceDelay={entranceDelay}
      />
    </ul>,
  )
  return screen.getByRole('listitem')
}

beforeEach(() => {
  reducedMotionMock.mockReturnValue(false)
})

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

  /**
   * The icon replaces the condition words, so the label is the only thing carrying the
   * condition — without it a screen reader would hear the numbers and nothing else.
   */
  it('conveys the conditions through the icon’s label', () => {
    renderCell()

    expect(screen.getByRole('img', { name: 'Partially cloudy' })).toBeInTheDocument()
    expect(screen.queryByText('Partially cloudy')).not.toBeInTheDocument()
  })

  it('shows an icon for every hour, whatever the condition', () => {
    renderCell({ condition: { label: 'Heavy rain', icon: 'rain' } })

    expect(screen.getByRole('img', { name: 'Heavy rain' })).toBeInTheDocument()
  })

  it('dims a past hour', () => {
    const cell = renderCell({ isPast: true })

    expect(cell).toHaveStyle({ filter: 'opacity(0.55)' })
  })

  it('does not dim an upcoming hour', () => {
    const cell = renderCell({ isPast: false })

    expect(cell).toHaveStyle({ filter: 'none' })
  })

  /** The hour containing "now" is technically past, but it is the one you care about. */
  it('does not dim the current hour even though it has started', () => {
    const cell = renderCell({ isPast: true }, true)

    expect(cell).toHaveStyle({ filter: 'none' })
  })

  /**
   * Regression: textAlign centres text but not the icon, which is a flex item — it sat
   * against the left edge of the cell.
   */
  it('centres its contents, icon included', () => {
    const cell = renderCell()

    expect(cell).toHaveStyle({ alignItems: 'center' })
  })

  describe('entrance', () => {
    it('starts invisible so it can fade in', () => {
      const cell = renderCell()

      expect(cell).toHaveStyle({ opacity: '0' })
    })

    it('appears immediately for a viewer who asked for reduced motion', () => {
      reducedMotionMock.mockReturnValue(true)

      const cell = renderCell()

      expect(cell).not.toHaveStyle({ opacity: '0' })
    })

    /**
     * Dimming moved to `filter` precisely so the entrance fade could own `opacity`.
     * A past cell must still be dimmed while it is fading in.
     */
    it('keeps dimming independent of the fade', () => {
      const cell = renderCell({ isPast: true })

      expect(cell).toHaveStyle({ opacity: '0', filter: 'opacity(0.55)' })
    })
  })

  it('renders as a list item so the timeline reads as a list', () => {
    const cell = renderCell()

    expect(cell.tagName).toBe('LI')
  })
})
