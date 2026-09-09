import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/page'
import { fetchWeather } from '@/lib/fetchWeather'
import { clearWeatherCache } from '@/lib/weatherCache'
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
  // Module state: without this, a cached London leaks into later tests.
  clearWeatherCache()
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

    // Scoped to the card: the timeline shows temperatures too, so page-wide text
    // queries would be ambiguous.
    const card = await screen.findByRole('region', { name: 'Current conditions' })

    expect(within(card).getByRole('heading', { name: SNAPSHOT.resolvedAddress })).toBeInTheDocument()
    expect(within(card).getByText('15°C')).toBeInTheDocument()
    expect(within(card).getByText('Partially cloudy')).toBeInTheDocument()
    expect(within(card).getByText('9 km/h')).toBeInTheDocument()
  })

  it('shows the hourly timeline below the card', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)

    searchFor('London')

    const timeline = await screen.findByRole('list', { name: 'Hourly forecast' })
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(SNAPSHOT.hourly.length)
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

describe('HomePage refresh', () => {
  it('offers no refresh until something is loaded', () => {
    render(<HomePage />)

    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument()
  })

  it('offers refresh once weather is showing', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)

    searchFor('London')

    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  /** The button must reach the network even though the location is cached. */
  it('re-fetches the loaded location when refresh is pressed', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)

    searchFor('London')
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }))

    await screen.findByRole('button', { name: 'Refresh' })
    expect(fetchWeatherMock).toHaveBeenCalledTimes(2)
    expect(fetchWeatherMock.mock.calls[1][0]).toBe('London')
  })

  it('keeps the weather on screen while refreshing', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)
    searchFor('London')
    await screen.findByRole('region', { name: 'Current conditions' })

    fetchWeatherMock.mockImplementation(() => new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('progressbar', { name: 'Refreshing' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Current conditions' })).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('spends no request when the same place is searched twice', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)

    searchFor('London')
    await screen.findByRole('region', { name: 'Current conditions' })
    searchFor('London')
    await screen.findByRole('region', { name: 'Current conditions' })

    expect(fetchWeatherMock).toHaveBeenCalledOnce()
  })
})

describe('HomePage errors', () => {
  it('shows a not-found error as an alert with no retry', async () => {
    fetchWeatherMock.mockRejectedValue(
      new WeatherFetchError(404, "Couldn't find that location."),
    )
    render(<HomePage />)

    searchFor('zzzznotaplace')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't find that location.")
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('leaves the search field usable after an error', async () => {
    fetchWeatherMock.mockRejectedValue(new WeatherFetchError(404, 'nope'))
    render(<HomePage />)

    searchFor('zzzznotaplace')
    await screen.findByRole('alert')

    expect(screen.getByLabelText('Location')).toBeEnabled()
  })

  it('offers a retry when the service was unavailable', async () => {
    fetchWeatherMock.mockRejectedValue(
      new WeatherFetchError(502, 'Weather service is unavailable.'),
    )
    render(<HomePage />)

    searchFor('London')

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('re-runs the failed search when retry is pressed', async () => {
    fetchWeatherMock.mockRejectedValue(new WeatherFetchError(502, 'down'))
    render(<HomePage />)

    searchFor('London')
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    await screen.findByRole('alert')
    expect(fetchWeatherMock).toHaveBeenCalledTimes(2)
    expect(fetchWeatherMock.mock.calls[1][0]).toBe('London')
  })

  it('replaces the error with weather when the retry succeeds', async () => {
    fetchWeatherMock.mockRejectedValueOnce(new WeatherFetchError(502, 'down'))
    render(<HomePage />)

    searchFor('London')
    fetchWeatherMock.mockResolvedValueOnce(SNAPSHOT)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('region', { name: 'Current conditions' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  /**
   * The bug this ticket fixes: a failed refresh must not throw away weather the user was
   * reading.
   */
  it('keeps the weather on screen when a refresh fails', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)
    searchFor('London')
    await screen.findByRole('region', { name: 'Current conditions' })

    fetchWeatherMock.mockRejectedValue(
      new WeatherFetchError(502, 'Weather service is unavailable.'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Weather service is unavailable.')
    expect(screen.getByRole('region', { name: 'Current conditions' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Hourly forecast' })).toBeInTheDocument()
  })

  it('clears the error once a later search succeeds', async () => {
    fetchWeatherMock.mockRejectedValueOnce(new WeatherFetchError(404, 'nope'))
    render(<HomePage />)
    searchFor('zzzznotaplace')
    await screen.findByRole('alert')

    fetchWeatherMock.mockResolvedValueOnce(SNAPSHOT)
    searchFor('London')

    await screen.findByRole('region', { name: 'Current conditions' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('HomePage recovery after an error', () => {
  /**
   * Regression, reported from the browser: the search button stayed disabled and
   * "Loading…" kept showing after a failed search, so there was no way to try
   * somewhere else.
   */
  it('lets the user search again after a failed search', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)
    searchFor('London')
    await screen.findByRole('region', { name: 'Current conditions' })

    fetchWeatherMock.mockRejectedValue(
      new WeatherFetchError(404, "Couldn't find that location."),
    )
    searchFor('zzzznotaplace')
    await screen.findByRole('alert')

    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('stops showing a loading state once a first search fails', async () => {
    fetchWeatherMock.mockRejectedValue(new WeatherFetchError(404, 'nope'))
    render(<HomePage />)

    searchFor('zzzznotaplace')
    await screen.findByRole('alert')

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled()
  })

  it('finds the next place after a failure', async () => {
    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    render(<HomePage />)
    searchFor('London')
    await screen.findByRole('region', { name: 'Current conditions' })

    fetchWeatherMock.mockRejectedValue(new WeatherFetchError(404, 'nope'))
    searchFor('zzzznotaplace')
    await screen.findByRole('alert')

    fetchWeatherMock.mockResolvedValue(SNAPSHOT)
    searchFor('Paris')

    await screen.findByRole('region', { name: 'Current conditions' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
