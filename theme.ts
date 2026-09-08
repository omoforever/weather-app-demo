'use client'

import { createTheme } from '@mui/material/styles'

/**
 * Sift design system defaults (DESIGN.md): IKB blue primary, Inter for UI,
 * JetBrains Mono for numeric/data readouts, 4px base spacing unit.
 *
 * The font families reference CSS variables set by next/font in app/layout.tsx.
 */
const IKB_BLUE = '#002FA7'

export const theme = createTheme({
  spacing: 4,
  palette: {
    primary: { main: IKB_BLUE },
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
