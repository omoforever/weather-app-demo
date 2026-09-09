import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { useReducedMotion } from 'motion/react'
import { WeatherIcon, idleMotionFor } from '@/components/WeatherIcon'
import { theme } from '@/theme'
import type { WeatherCondition } from '@/types/weather'

/** Only the reduced-motion hook is faked; Motion itself still renders. */
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: vi.fn(() => false),
}))

const reducedMotionMock = vi.mocked(useReducedMotion)

const RAIN: WeatherCondition = { label: 'Rain', icon: 'rain' }

/** Rendered inside the real theme so `weather.*` colour tokens actually resolve. */
function renderIcon(
  condition: WeatherCondition = RAIN,
  props: {
    decorative?: boolean
    fontSize?: 'small' | 'medium' | 'large'
    idle?: boolean
  } = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <WeatherIcon condition={condition} {...props} />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  reducedMotionMock.mockReturnValue(false)
})

afterEach(cleanup)

describe('WeatherIcon', () => {
  describe('when it stands in for the condition text (timeline cells)', () => {
    it('announces itself as an image named for the condition', () => {
      renderIcon()

      expect(screen.getByRole('img', { name: 'Rain' })).toBeInTheDocument()
    })

    it('names the condition even when the icon is shared by several slugs', () => {
      renderIcon({ label: 'Light rain shower', icon: 'showers-day' })

      // Same icon as plain rain, but the label must stay specific.
      expect(screen.getByRole('img', { name: 'Light rain shower' })).toBeInTheDocument()
    })
  })

  describe('when the condition is already written beside it (the card)', () => {
    it('stays out of the accessibility tree so it is not announced twice', () => {
      renderIcon(RAIN, { decorative: true })

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('is marked aria-hidden', () => {
      const { container } = renderIcon(RAIN, { decorative: true })

      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })

    it('carries no label that a screen reader could read out', () => {
      const { container } = renderIcon(RAIN, { decorative: true })

      expect(container.querySelector('svg')).not.toHaveAttribute('aria-label')
    })
  })

  it('colours the icon from the weather palette, not a default', () => {
    renderIcon()

    expect(screen.getByRole('img')).toHaveStyle({ color: theme.palette.weather.rain })
  })

  it('uses a different palette colour for a different condition', () => {
    renderIcon({ label: 'Clear', icon: 'clear-day' })

    expect(screen.getByRole('img')).toHaveStyle({ color: theme.palette.weather.sun })
  })

  it('renders the fallback icon for a slug we do not know', () => {
    renderIcon({ label: 'Volcanic ash', icon: 'volcanic-ash' })

    // Still labelled, still coloured — just a generic icon.
    expect(screen.getByRole('img', { name: 'Volcanic ash' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveStyle({ color: theme.palette.weather.cloud })
  })

  describe('idle motion', () => {
    /** Only the card idles; the timeline renders ~50 icons and must stay still. */
    it('adds no wrapper element when it is not idling', () => {
      const { container } = renderIcon()

      expect(container.querySelector('span')).not.toBeInTheDocument()
    })

    it('wraps the icon when asked to idle', () => {
      const { container } = renderIcon(RAIN, { idle: true })

      expect(container.querySelector('span')).toBeInTheDocument()
    })

    it('stays still for a viewer who asked for reduced motion', () => {
      reducedMotionMock.mockReturnValue(true)

      const { container } = renderIcon(RAIN, { idle: true })

      expect(container.querySelector('span')).not.toBeInTheDocument()
    })

    it('is still announced normally while idling', () => {
      renderIcon(RAIN, { idle: true })

      expect(screen.getByRole('img', { name: 'Rain' })).toBeInTheDocument()
    })
  })

  it('can be sized for the card rather than a cell', () => {
    renderIcon(RAIN, { fontSize: 'large' })

    // An <svg>'s .className is an SVGAnimatedString, not a string — read the attribute.
    expect(screen.getByRole('img').getAttribute('class')).toContain('fontSizeLarge')
  })
})

/**
 * Each weather family moves in a way that suits it, and every loop repeats forever —
 * these assert the choice, not that Motion can animate.
 */
describe('idleMotionFor', () => {
  it('turns the sun slowly rather than quickly', () => {
    const { animate, transition } = idleMotionFor('sun')

    expect(animate).toMatchObject({ rotate: 360 })
    expect(transition).toMatchObject({ duration: 20 })
  })

  it('drifts rain and snow downwards', () => {
    for (const token of ['rain', 'snow'] as const) {
      expect(idleMotionFor(token).animate).toMatchObject({ y: [0, 2, 0] })
    }
  })

  it('drifts wind sideways instead', () => {
    expect(idleMotionFor('wind').animate).toMatchObject({ x: [0, 2, 0] })
  })

  it('flashes a storm rather than moving it', () => {
    const { animate } = idleMotionFor('storm')

    expect(animate).toMatchObject({ opacity: [1, 1, 0.55, 1] })
    expect(animate).not.toHaveProperty('x')
    expect(animate).not.toHaveProperty('y')
  })

  it('gives the quiet conditions a barely visible breathe', () => {
    for (const token of ['cloud', 'fog', 'night'] as const) {
      expect(idleMotionFor(token).animate).toMatchObject({ opacity: [1, 0.82, 1] })
    }
  })

  it('loops every family forever', () => {
    for (const token of ['sun', 'rain', 'snow', 'wind', 'storm', 'cloud', 'fog', 'night'] as const) {
      expect(idleMotionFor(token).transition).toMatchObject({ repeat: Infinity })
    }
  })

  /** Anything faster would pull the eye away from the temperature beside it. */
  it('keeps every loop slow', () => {
    for (const token of ['sun', 'rain', 'snow', 'wind', 'storm', 'cloud', 'fog', 'night'] as const) {
      const { transition } = idleMotionFor(token)
      expect(transition.duration).toBeGreaterThanOrEqual(2)
    }
  })
})
