import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/page'
import { fetchWeather } from '@/lib/fetchWeather'
import { WeatherFetchError } from '@/lib/weatherErrors'
import { toSnapshot } from '@/lib/shapeWeather'
import { NOW_EPOCH, buildTimelineResponse } from '@/test/fixtures/timeline'
import type { WeatherSnapshot } from '@/types/weather'

/** The page is wired to the real hook; only the network call is stubbed. */
vi.mock('@/lib/fetchWeather', () => ({ fetchWeather: vi.fn() }))

const fetchWeatherMock = vi.mocked(fetchWeather)
const SNAPSHOT: WeatherSnapshot = toSnapshot(buildTimelineResponse(), NOW_EPOCH)

function searchFor(location: string) {
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: location } })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
}

beforeEach(() => {
  fetchWeatherMock.mockReset()
})

afterEach(cleanup)

describe('HomePage', () => {
  it('starts with just the search field and no results', () => {
    render(<HomePage />)

    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Now')).not.toBeInTheDocument()
  })

  it('searches for the location the user submitted', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)

    searchFor('London')

    expect(fetchWeatherMock).toHaveBeenCalledOnce()
    expect(fetchWeatherMock.mock.calls[0][0]).toBe('London')
    await screen.findByText(SNAPSHOT.resolvedAddress)
  })

  /** The card renders with the real Motion library here, not the stub its own tests use. */
  it('shows the weather in a card', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)

    searchFor('London')

    expect(
      await screen.findByRole('heading', { name: SNAPSHOT.resolvedAddress }),
    ).toBeInTheDocument()
    expect(screen.getByText('15°C')).toBeInTheDocument()
    expect(screen.getByText('Partially cloudy')).toBeInTheDocument()
    expect(screen.getByText('9 km/h')).toBeInTheDocument()
  })

  it('shows a loading message while the search runs', async () => {
    fetchWeatherMock.mockImplementation(() => new Promise(() => {}))
    render(<HomePage />)

    searchFor('London')

    expect(await screen.findByText('Loading…')).toBeInTheDocument()
  })

  it('blocks a second submit while the search is running', async () => {
    fetchWeatherMock.mockImplementation(() => new Promise(() => {}))
    render(<HomePage />)

    searchFor('London')

    await screen.findByText('Loading…')
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled()
  })

  it('shows the error message when the location is not found', async () => {
    fetchWeatherMock.mockRejectedValue(
      new WeatherFetchError(404, "Couldn't find that location."),
    )
    render(<HomePage />)

    searchFor('zzzznotaplace')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't find that location.")
    expect(screen.queryByText('Now')).not.toBeInTheDocument()
  })

  it('replaces an error with results when the next search succeeds', async () => {
    fetchWeatherMock.mockRejectedValueOnce(new WeatherFetchError(404, 'nope'))
    render(<HomePage />)

    searchFor('zzzznotaplace')
    await screen.findByRole('alert')

    fetchWeatherMock.mockResolvedValueOnce(SNAPSHOT)
    searchFor('London')

    expect(await screen.findByText(SNAPSHOT.resolvedAddress)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
