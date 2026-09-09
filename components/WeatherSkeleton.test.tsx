import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WeatherSkeleton } from '@/components/WeatherSkeleton'

afterEach(cleanup)

describe('WeatherSkeleton', () => {
  it('tells assistive tech that weather is loading', () => {
    render(<WeatherSkeleton />)

    expect(screen.getByRole('status', { name: 'Loading weather' })).toBeInTheDocument()
  })

  /**
   * There are ~30 grey boxes in here. Announcing each one would bury the one thing worth
   * saying, so the wrapper carries the label and the contents are hidden.
   */
  it('says it once, not once per placeholder', () => {
    render(<WeatherSkeleton />)

    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('hides the decorative placeholders from assistive tech', () => {
    const { container } = render(<WeatherSkeleton />)

    const hidden = container.querySelectorAll('[aria-hidden="true"]')
    expect(hidden.length).toBeGreaterThan(0)
    // Every placeholder sits inside something hidden.
    for (const placeholder of container.querySelectorAll('.MuiSkeleton-root')) {
      expect(placeholder.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })

  /** Shaped like the real thing so the layout doesn't jump when data lands. */
  it('stands in for both the card and the timeline', () => {
    const { container } = render(<WeatherSkeleton />)

    expect(container.querySelector('.MuiCard-root')).toBeInTheDocument()
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(10)
  })

  it('includes a round placeholder where the weather icon goes', () => {
    const { container } = render(<WeatherSkeleton />)

    expect(container.querySelector('.MuiSkeleton-circular')).toBeInTheDocument()
  })

  it('shows enough timeline cells to fill the strip without rendering all fifty', () => {
    const { container } = render(<WeatherSkeleton />)

    // The real timeline has ~50 hours; most would scroll out of sight.
    const circles = container.querySelectorAll('.MuiSkeleton-circular')
    expect(circles.length).toBeGreaterThan(1)
    expect(circles.length).toBeLessThan(20)
  })

  it('renders no real weather values', () => {
    render(<WeatherSkeleton />)

    expect(screen.queryByText(/°C/)).not.toBeInTheDocument()
    expect(screen.queryByText(/km\/h/)).not.toBeInTheDocument()
  })
})
