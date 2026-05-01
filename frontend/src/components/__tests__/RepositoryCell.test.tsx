import { describe, it, expect } from 'vitest'
import { screen, renderWithProviders } from '../../test/test-utils'
import RepositoryCell from '../RepositoryCell'

describe('RepositoryCell', () => {
  describe('Display name logic', () => {
    it('displays repository name when provided', () => {
      renderWithProviders(<RepositoryCell repositoryName="My Backup" repositoryPath="/backup/repo" />)
      expect(screen.getByText('My Backup')).toBeInTheDocument()
    })

    it('falls back to path when name is null', () => {
      renderWithProviders(<RepositoryCell repositoryName={null} repositoryPath="/backup/repo" />)
      // Path appears twice: once as displayName (main text) and once as caption
      const pathElements = screen.getAllByText('/backup/repo')
      expect(pathElements.length).toBe(2)
    })

    it('falls back to path when name is undefined', () => {
      renderWithProviders(<RepositoryCell repositoryPath="/backup/repo" />)
      // Path appears twice: once as displayName (main text) and once as caption
      const pathElements = screen.getAllByText('/backup/repo')
      expect(pathElements.length).toBe(2)
    })

    it('displays "Unknown" when both name and path are null', () => {
      renderWithProviders(<RepositoryCell repositoryName={null} repositoryPath={null} />)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('displays "Unknown" when both name and path are undefined', () => {
      renderWithProviders(<RepositoryCell />)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('Path display', () => {
    it('shows path in monospace below name', () => {
      renderWithProviders(<RepositoryCell repositoryName="My Backup" repositoryPath="/backup/repo" />)
      // Name is shown
      expect(screen.getByText('My Backup')).toBeInTheDocument()
      // Path is also shown (in caption)
      expect(screen.getByText('/backup/repo')).toBeInTheDocument()
    })

    it('does not show path caption when path is null', () => {
      renderWithProviders(<RepositoryCell repositoryName="My Backup" repositoryPath={null} />)
      expect(screen.getByText('My Backup')).toBeInTheDocument()
      // Should not have a separate path element
      expect(screen.queryAllByText('My Backup').length).toBe(1)
    })

    it('does not show path caption when path is undefined', () => {
      renderWithProviders(<RepositoryCell repositoryName="My Backup" />)
      expect(screen.getByText('My Backup')).toBeInTheDocument()
    })
  })

  describe('Icon display', () => {
    it('shows icon by default (withIcon=true)', () => {
      const { container } = renderWithProviders(
        <RepositoryCell repositoryName="My Backup" repositoryPath="/backup/repo" />
      )
      // lucide-react renders an svg with class "lucide"
      expect(container.querySelector('svg.lucide-hard-drive')).toBeInTheDocument()
    })

    it('hides icon when withIcon=false', () => {
      const { container } = renderWithProviders(
        <RepositoryCell repositoryName="My Backup" repositoryPath="/backup/repo" withIcon={false} />
      )
      expect(container.querySelector('svg.lucide-hard-drive')).not.toBeInTheDocument()
    })
  })

  describe('Tooltip', () => {
    it('wraps content in a tooltip element', () => {
      renderWithProviders(<RepositoryCell repositoryName="My Backup" repositoryPath="/very/long/backup/path" />)
      // MUI Tooltip wraps content - verify the structure exists
      expect(screen.getByText('My Backup')).toBeInTheDocument()
      expect(screen.getByText('/very/long/backup/path')).toBeInTheDocument()
    })

    it('renders without path caption when path is empty', () => {
      renderWithProviders(<RepositoryCell repositoryName="My Backup" repositoryPath="" />)
      // Main name is shown
      expect(screen.getByText('My Backup')).toBeInTheDocument()
      // No caption element should be present (empty path)
      expect(screen.queryAllByText('My Backup').length).toBe(1)
    })
  })
})
