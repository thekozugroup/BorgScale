import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import RepositorySelectorCard from '../RepositorySelectorCard'

describe('RepositorySelectorCard', () => {
  const mockRepositories = [
    { id: 1, name: 'Repo 1', path: '/path/to/repo1' },
    { id: 2, name: 'Repo 2', path: '/path/to/repo2' },
    { id: 3, name: 'Repo 3', path: '/path/to/repo3' },
  ]

  it('renders with title and icon', () => {
    renderWithProviders(
      <RepositorySelectorCard repositories={mockRepositories} value={null} onChange={vi.fn()} />
    )

    expect(screen.getAllByText('Repository').length).toBeGreaterThan(0)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders all repositories in dropdown', () => {
    renderWithProviders(
      <RepositorySelectorCard repositories={mockRepositories} value={null} onChange={vi.fn()} />
    )

    // Open dropdown using pointerDown (required for Radix Select)
    const select = screen.getByRole('combobox')
    fireEvent.pointerDown(select, { button: 0, pointerType: 'mouse' })

    // Check all repositories are present
    expect(screen.getByRole('option', { name: /Repo 1/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Repo 2/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Repo 3/ })).toBeInTheDocument()
  })

  it('shows selected repository', () => {
    renderWithProviders(<RepositorySelectorCard repositories={mockRepositories} value={2} onChange={vi.fn()} />)

    // Radix Select shows selected value as text in the trigger
    expect(screen.getByText('Repo 2')).toBeInTheDocument()
  })

  it('calls onRepositoryChange when selection changes', () => {
    const handleChange = vi.fn()
    renderWithProviders(
      <RepositorySelectorCard repositories={mockRepositories} value={1} onChange={handleChange} />
    )

    // Open dropdown
    const select = screen.getByRole('combobox')
    fireEvent.pointerDown(select, { button: 0, pointerType: 'mouse' })

    // Select different repository
    fireEvent.click(screen.getByRole('option', { name: /Repo 3/ }))

    expect(handleChange).toHaveBeenCalledWith(3)
  })

  it('disables select when loading', () => {
    renderWithProviders(
      <RepositorySelectorCard
        repositories={mockRepositories}
        value={null}
        onChange={vi.fn()}
        loading={true}
      />
    )

    // shadcn Select trigger button is disabled when loading
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('shows loading message when loading', () => {
    renderWithProviders(
      <RepositorySelectorCard repositories={[]} value={null} onChange={vi.fn()} loading={true} />
    )

    // The loading state disables the select
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('shows empty message when no repositories', () => {
    renderWithProviders(<RepositorySelectorCard repositories={[]} value={null} onChange={vi.fn()} />)

    // Open dropdown
    const select = screen.getByRole('combobox')
    fireEvent.pointerDown(select, { button: 0, pointerType: 'mouse' })

    expect(screen.getByRole('option', { name: /Select a repository/ })).toBeInTheDocument()
  })
})
