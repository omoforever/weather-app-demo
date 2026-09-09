import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { WeatherIcon } from '@/components/WeatherIcon'
import { theme } from '@/theme'
import type { WeatherCondition } from '@/types/weather'

const RAIN: WeatherCondition = { label: 'Rain', icon: 'rain' }

/** Rendered inside the real theme so `weather.*` colour tokens actually resolve. */
function renderIcon(
  condition: WeatherCondition = RAIN,
  props: { decorative?: boolean; fontSize?: 'small' | 'medium' | 'large' } = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <WeatherIcon condition={condition} {...props} />
    </ThemeProvider>,
  )
}

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

  it('can be sized for the card rather than a cell', () => {
    renderIcon(RAIN, { fontSize: 'large' })

    // An <svg>'s .className is an SVGAnimatedString, not a string — read the attribute.
    expect(screen.getByRole('img').getAttribute('class')).toContain('fontSizeLarge')
  })
})
