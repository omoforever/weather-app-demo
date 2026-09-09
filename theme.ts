'use client'

import { createTheme } from '@mui/material/styles'

/**
 * Sift design system defaults (DESIGN.md): IKB blue primary, Inter for UI,
 * JetBrains Mono for numeric/data readouts, 4px base spacing unit.
 *
 * The font families reference CSS variables set by next/font in app/layout.tsx.
 */
const IKB_BLUE = '#002FA7'

/**
 * Colours for weather icons, named for what they mean rather than for a severity
 * level, so `lib/weatherIcon.ts` can say "sun" and this file decides what that looks
 * like. Colour is never the only signal — the icon shape differs too, and the
 * condition is always available as text or an accessible label.
 */
export type WeatherPalette = {
  sun: string
  night: string
  cloud: string
  rain: string
  snow: string
  storm: string
  fog: string
  wind: string
}

const weather: WeatherPalette = {
  sun: '#B26A00', // warm amber, darkened for contrast on white
  night: '#3949AB', // indigo, a cousin of the IKB primary
  cloud: '#546E7A', // blue-grey
  rain: '#0277BD', // rain blue
  snow: '#3E86A6', // pale-leaning, but dark enough for 3:1 on white (measured)
  storm: '#5E35B1', // deep violet
  fog: '#78909C', // lighter blue-grey than cloud
  wind: '#00838F', // teal, distinct from rain
}

declare module '@mui/material/styles' {
  interface Palette {
    weather: WeatherPalette
  }
  interface PaletteOptions {
    weather?: WeatherPalette
  }
}

export const theme = createTheme({
  spacing: 4,
  palette: {
    primary: { main: IKB_BLUE },
    weather,
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    // Temperatures, wind speeds and rain percentages read as tabular data.
    caption: {
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
    },
  },
  shape: { borderRadius: 8 },
})
