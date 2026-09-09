'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { motion, useReducedMotion } from 'motion/react'
import { WeatherIcon } from '@/components/WeatherIcon'
import {
  formatPrecipitationChance,
  formatTemperature,
  formatWindSpeed,
} from '@/lib/formatWeather'
import type { WeatherSnapshot } from '@/types/weather'

export type CurrentWeatherCardProps = {
  snapshot: WeatherSnapshot
}

/**
 * Conditions right now for the searched location. Presentational — every value it
 * shows is already in the snapshot; it only decides how to display them.
 */
export function CurrentWeatherCard({ snapshot }: CurrentWeatherCardProps) {
  const { current, resolvedAddress } = snapshot
  const shouldReduceMotion = useReducedMotion()

  const details = [
    { label: 'Wind', value: formatWindSpeed(current.windSpeed) },
    { label: 'Chance of rain', value: formatPrecipitationChance(current.precipitationProbability) },
  ]

  return (
    <motion.div
      // DESIGN.md: the card fades and slides in when data lands. Someone who has asked
      // their system for less motion gets the fade only.
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* A labelled section, so it reads as its own region and can be addressed as one. */}
      <Card variant="outlined" component="section" aria-label="Current conditions">
        <CardContent>
          <Stack spacing={4}>
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">
                Now
              </Typography>
              <Typography variant="h6" component="h2">
                {resolvedAddress}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
              {/* Decorative: the condition is written just below, so announcing the
                  icon too would repeat it. */}
              <WeatherIcon condition={current.condition} fontSize="large" decorative />
              <Stack spacing={1}>
                <Typography variant="h2" component="p">
                  {formatTemperature(current.temperature)}
                </Typography>
                <Typography color="text.secondary">{current.condition.label}</Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={8}>
              {details.map(({ label, value }) => (
                <Stack key={label} spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="caption">{value}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  )
}
