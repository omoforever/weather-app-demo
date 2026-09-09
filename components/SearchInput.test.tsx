import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { SearchInput } from '@/components/SearchInput'

afterEach(cleanup)

function renderSearchInput(isSearching = false) {
  const onSearch = vi.fn()
  render(<SearchInput onSearch={onSearch} isSearching={isSearching} />)
  return {
    onSearch,
    field: screen.getByLabelText('Location'),
    button: screen.getByRole('button', { name: 'Search' }),
  }
}

function type(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } })
}

describe('SearchInput', () => {
  it('renders a labelled location field', () => {
    const { field } = renderSearchInput()

    expect(field).toBeInTheDocument()
    expect(field).toHaveValue('')
  })

  it('shows what the user types', () => {
    const { field } = renderSearchInput()

    type(field, 'London')

    expect(field).toHaveValue('London')
  })

  it('cannot be submitted while the field is empty', () => {
    const { button } = renderSearchInput()

    expect(button).toBeDisabled()
  })

  it('cannot be submitted with only whitespace', () => {
    const { field, button } = renderSearchInput()

    type(field, '   ')

    expect(button).toBeDisabled()
  })

  it('becomes submittable once a location is typed', () => {
    const { field, button } = renderSearchInput()

    type(field, 'London')

    expect(button).toBeEnabled()
  })

  it('searches when the button is clicked', () => {
    const { field, button, onSearch } = renderSearchInput()

    type(field, 'London')
    fireEvent.click(button)

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('London')
  })

  it('searches when Enter is pressed in the field', () => {
    const { field, onSearch } = renderSearchInput()

    type(field, 'London')
    fireEvent.submit(field)

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('London')
  })

  it('trims surrounding whitespace before searching', () => {
    const { field, button, onSearch } = renderSearchInput()

    type(field, '  New York, NY  ')
    fireEvent.click(button)

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('New York, NY')
  })

  it('does not search while the user is still typing', () => {
    const { field, onSearch } = renderSearchInput()

    type(field, 'Lon')

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('ignores a submit that slips through with a blank field', () => {
    const { field, onSearch } = renderSearchInput()

    type(field, '   ')
    fireEvent.submit(field)

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('blocks a second submit while a search is running', () => {
    const { field, button } = renderSearchInput(true)

    type(field, 'London')

    expect(button).toBeDisabled()
  })

  it('keeps the field usable while a search is running', () => {
    const { field } = renderSearchInput(true)

    type(field, 'Paris')

    expect(field).toBeEnabled()
    expect(field).toHaveValue('Paris')
  })
})
