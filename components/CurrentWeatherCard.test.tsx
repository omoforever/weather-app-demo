import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { CurrentWeatherCard } from '@/components/CurrentWeatherCard'
import { useReducedMotion } from 'motion/react'
import { toSnapshot } from '@/lib/shapeWeather'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import type { WeatherSnapshot } from '@/types/weather'

/**
 * Motion is stubbed so these tests assert our own animation decision — slide unless
 * the viewer asked for less motion — rather than the library's rendering. The real
 * thing is exercised when the page renders in app/page.test.tsx.
 */
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial }: { children: ReactNode; initial: { y: number } }) => (
      <div data-slide-from={String(initial.y)}>{children}</div>
    ),
  },
  useReducedMotion: vi.fn(() => false),
}))

const reducedMotionMock = vi.mocked(useReducedMotion)

/** Fixture values: 15.2°C, 9.4 km/h, 35% — each needs rounding to display. */
const SNAPSHOT: WeatherSnapshot = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

function renderCard(snapshot: WeatherSnapshot = SNAPSHOT) {
  render(<CurrentWeatherCard snapshot={snapshot} />)
}

beforeEach(() => {
  reducedMotionMock.mockReturnValue(false)
})

afterEach(cleanup)

describe('CurrentWeatherCard', () => {
  it('names the location it is showing', () => {
    renderCard()

    expect(
      screen.getByRole('heading', { name: 'London, England, United Kingdom' }),
    ).toBeInTheDocument()
  })

  it('marks the reading as current', () => {
    renderCard()

    expect(screen.getByText('Now')).toBeInTheDocument()
  })

  it('shows the temperature rounded to whole degrees', () => {
    renderCard()

    expect(screen.getByText('15°C')).toBeInTheDocument()
    expect(screen.queryByText(/15\.2/)).not.toBeInTheDocument()
  })

  it('describes the conditions in words', () => {
    renderCard()

    expect(screen.getByText('Partially cloudy')).toBeInTheDocument()
  })

  it('shows wind speed with its unit', () => {
    renderCard()

    expect(screen.getByText('Wind')).toBeInTheDocument()
    expect(screen.getByText('9 km/h')).toBeInTheDocument()
  })

  it('shows the chance of rain as a percentage', () => {
    renderCard()

    expect(screen.getByText('Chance of rain')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
  })

  it('handles a freezing temperature without losing the minus sign', () => {
    renderCard({
      ...SNAPSHOT,
      current: { ...SNAPSHOT.current, temperature: -3.4 },
    })

    expect(screen.getByText('-3°C')).toBeInTheDocument()
  })

  it('slides in by default', () => {
    renderCard()

    expect(screen.getByText('Now').closest('[data-slide-from]')).toHaveAttribute(
      'data-slide-from',
      '8',
    )
  })

  it('does not slide when the viewer has asked for reduced motion', () => {
    reducedMotionMock.mockReturnValue(true)

    renderCard()

    expect(screen.getByText('Now').closest('[data-slide-from]')).toHaveAttribute(
      'data-slide-from',
      '0',
    )
  })
})
