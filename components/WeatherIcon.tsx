'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { TargetAndTransition, Transition } from 'motion/react'
import { weatherIconFor, type WeatherColorToken } from '@/lib/weatherIcon'
import type { WeatherCondition } from '@/types/weather'

export type WeatherIconProps = {
  condition: WeatherCondition
  /** MUI size token; the card wants a large icon, timeline cells a small one. */
  fontSize?: 'small' | 'medium' | 'large'
  /**
   * True where the condition is already written on screen next to the icon — the card.
   * The icon is then hidden from assistive tech so it isn't announced twice.
   *
   * Leave false wherever the icon *replaces* the words, as in the timeline cells: there
   * the label is the only way the condition is conveyed at all.
   */
  decorative?: boolean
  /**
   * Adds a slow looping motion suited to the weather. Only the card uses it — fifty
   * looping timeline cells would cost battery for no benefit.
   */
  idle?: boolean
}

type IdleMotion = { animate: TargetAndTransition; transition: Transition }

const LOOP = { repeat: Infinity, repeatType: 'loop' } as const

/**
 * Idle motion per weather family. Amplitudes are deliberately tiny — this should read
 * as "alive", not as something demanding attention while you're trying to read a
 * temperature.
 */
export function idleMotionFor(token: WeatherColorToken): IdleMotion {
  switch (token) {
    case 'sun':
      return {
        animate: { rotate: 360 },
        transition: { duration: 20, ease: 'linear', ...LOOP },
      }
    case 'rain':
    case 'snow':
      return {
        animate: { y: [0, 2, 0] },
        transition: { duration: 3, ease: 'easeInOut', ...LOOP },
      }
    case 'wind':
      return {
        animate: { x: [0, 2, 0] },
        transition: { duration: 2.5, ease: 'easeInOut', ...LOOP },
      }
    case 'storm':
      // A flash rather than constant movement: mostly still, with a brief dip.
      return {
        animate: { opacity: [1, 1, 0.55, 1] },
        transition: { duration: 4, times: [0, 0.7, 0.78, 0.86], ...LOOP },
      }
    default:
      // cloud, fog, night — a barely perceptible breathe.
      return {
        animate: { opacity: [1, 0.82, 1] },
        transition: { duration: 5, ease: 'easeInOut', ...LOOP },
      }
  }
}

export function WeatherIcon({
  condition,
  fontSize = 'medium',
  decorative = false,
  idle = false,
}: WeatherIconProps) {
  const { Icon, colorToken } = weatherIconFor(condition.icon)
  const shouldReduceMotion = useReducedMotion()

  const icon = (
    <Icon
      fontSize={fontSize}
      // role/aria-label make an <svg> announce as an image named for the condition.
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : condition.label}
      aria-hidden={decorative || undefined}
      sx={{ color: `weather.${colorToken}`, display: 'block' }}
    />
  )

  // No wrapper unless it earns one: cells render fifty of these.
  if (!idle || shouldReduceMotion) return icon

  const { animate, transition } = idleMotionFor(colorToken)

  return (
    <motion.span
      animate={animate}
      transition={transition}
      style={{ display: 'inline-flex' }}
    >
      {icon}
    </motion.span>
  )
}
