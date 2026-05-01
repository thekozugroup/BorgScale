import { describe, it, expect } from 'vitest'
import { screen, renderWithProviders } from '../../test/test-utils'
import RepoMenuItem from '../RepoMenuItem'

describe('RepoMenuItem', () => {
  it('renders repo name and path', () => {
    renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" />)

    expect(screen.getByText('My Repo')).toBeInTheDocument()
    expect(screen.getByText('/data/backups')).toBeInTheDocument()
  })

  it('shows v2 chip when borgVersion is 2', () => {
    renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" borgVersion={2} />)

    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  it('does not show v2 chip when borgVersion is 1', () => {
    renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" borgVersion={1} />)

    expect(screen.queryByText('v2')).not.toBeInTheDocument()
  })

  describe('observe mode', () => {
    it('shows Observe Only chip for observe mode', () => {
      renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" mode="observe" />)

      expect(screen.getByText('Observe Only')).toBeInTheDocument()
    })

    it('does not show Observe Only chip for full mode', () => {
      renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" mode="full" />)

      expect(screen.queryByText('Observe Only')).not.toBeInTheDocument()
    })

    it('does not show Observe Only chip when mode is not set', () => {
      renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" />)

      expect(screen.queryByText('Observe Only')).not.toBeInTheDocument()
    })

    it('can show both v2 and Observe Only chips simultaneously', () => {
      renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" borgVersion={2} mode="observe" />)

      expect(screen.getByText('v2')).toBeInTheDocument()
      expect(screen.getByText('Observe Only')).toBeInTheDocument()
    })
  })

  it('hides path when hidePath is true', () => {
    renderWithProviders(<RepoMenuItem name="My Repo" path="/data/backups" hidePath={true} />)

    expect(screen.getByText('My Repo')).toBeInTheDocument()
    expect(screen.queryByText('/data/backups')).not.toBeInTheDocument()
  })

  it('shows maintenance label when hasRunningMaintenance is true', () => {
    renderWithProviders(
      <RepoMenuItem
        name="My Repo"
        path="/data/backups"
        hasRunningMaintenance={true}
        maintenanceLabel="maintenance running"
      />
    )

    expect(screen.getByText('maintenance running')).toBeInTheDocument()
  })
})
