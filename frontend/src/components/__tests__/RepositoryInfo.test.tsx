import { describe, it, expect } from 'vitest'
import { screen, renderWithProviders } from '../../test/test-utils'
import RepositoryInfo from '../RepositoryInfo'

describe('RepositoryInfo', () => {
  const mockRepoInfo = {
    repository: {
      id: 'test-repo',
      last_modified: '2024-01-15T10:30:00Z',
    },
    cache: {
      stats: {
        total_size: 1024 * 1024 * 100, // 100 MB
        total_csize: 1024 * 1024 * 50, // 50 MB
        unique_csize: 1024 * 1024 * 25, // 25 MB
        total_chunks: 1000,
        total_unique_chunks: 500,
      },
    },
    encryption: {
      mode: 'repokey-blake2',
    },
  }

  describe('Loading State', () => {
    it('shows loading message when loading is true', () => {
      renderWithProviders(<RepositoryInfo loading={true} />)
      expect(screen.getByText('Loading repository info...')).toBeInTheDocument()
    })

    it('does not show repository stats when loading', () => {
      renderWithProviders(<RepositoryInfo loading={true} repoInfo={mockRepoInfo} />)
      expect(screen.queryByText('Archives')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('returns null when repoInfo is undefined', () => {
      renderWithProviders(<RepositoryInfo />)
      expect(screen.queryByText('Archives')).not.toBeInTheDocument()
      expect(screen.queryByText('Total Size')).not.toBeInTheDocument()
    })

    it('returns null when repoInfo is null', () => {
      renderWithProviders(<RepositoryInfo repoInfo={undefined} />)
      expect(screen.queryByText('Archives')).not.toBeInTheDocument()
      expect(screen.queryByText('Total Size')).not.toBeInTheDocument()
    })
  })

  describe('Repository Statistics', () => {
    it('displays archives count', () => {
      renderWithProviders(<RepositoryInfo repoInfo={mockRepoInfo} archivesCount={10} />)
      expect(screen.getByText('Archives')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('displays archives count as 0 when not provided', () => {
      renderWithProviders(<RepositoryInfo repoInfo={mockRepoInfo} />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('displays formatted total size', () => {
      renderWithProviders(<RepositoryInfo repoInfo={mockRepoInfo} />)
      expect(screen.getByText('Total Size')).toBeInTheDocument()
      expect(screen.getByText('100.00 MB')).toBeInTheDocument()
    })

    it('displays formatted deduplicated size', () => {
      renderWithProviders(<RepositoryInfo repoInfo={mockRepoInfo} />)
      expect(screen.getByText('Unique Data')).toBeInTheDocument()
      expect(screen.getByText('25.00 MB')).toBeInTheDocument()
    })

    it('displays formatted last modified date', () => {
      renderWithProviders(<RepositoryInfo repoInfo={mockRepoInfo} />)
      expect(screen.getByText('Last Modified')).toBeInTheDocument()
      // The formatDate utility will format this, just check it's present
      expect(screen.getByText(/Jan|2024|15/)).toBeInTheDocument()
    })

    it('displays N/A when total size is missing', () => {
      const infoWithoutSize = {
        ...mockRepoInfo,
        cache: { stats: {} },
      }
      renderWithProviders(<RepositoryInfo repoInfo={infoWithoutSize} />)
      const naElements = screen.getAllByText('N/A')
      expect(naElements.length).toBeGreaterThan(0)
    })

    it('displays N/A when deduplicated size is missing', () => {
      const infoWithoutDedup = {
        ...mockRepoInfo,
        cache: {
          stats: {
            total_size: 1024 * 1024 * 100,
          },
        },
      }
      renderWithProviders(<RepositoryInfo repoInfo={infoWithoutDedup} />)
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
    })

    it('displays N/A when last modified is missing', () => {
      const infoWithoutDate = {
        ...mockRepoInfo,
        repository: {},
      }
      renderWithProviders(<RepositoryInfo repoInfo={infoWithoutDate} />)
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
    })
  })

  describe('Encryption Information', () => {
    it('displays encryption mode chip when present', () => {
      renderWithProviders(<RepositoryInfo repoInfo={mockRepoInfo} />)
      expect(screen.getByText('Encryption: repokey-blake2')).toBeInTheDocument()
    })

    it('does not display encryption chip when mode is missing', () => {
      const infoWithoutEncryption = {
        ...mockRepoInfo,
        encryption: {},
      }
      renderWithProviders(<RepositoryInfo repoInfo={infoWithoutEncryption} />)
      expect(screen.queryByText(/Encryption:/)).not.toBeInTheDocument()
    })

    it('does not display encryption chip when encryption object is missing', () => {
      const infoWithoutEncryption = {
        repository: mockRepoInfo.repository,
        cache: mockRepoInfo.cache,
      }
      renderWithProviders(<RepositoryInfo repoInfo={infoWithoutEncryption} />)
      expect(screen.queryByText(/Encryption:/)).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero stats gracefully', () => {
      const infoWithZeros = {
        ...mockRepoInfo,
        cache: {
          stats: {
            total_size: 0,
            unique_csize: 0,
          },
        },
      }
      renderWithProviders(<RepositoryInfo repoInfo={infoWithZeros} archivesCount={0} />)
      expect(screen.getByText('0')).toBeInTheDocument()
      // Zero values are treated as falsy, so N/A is displayed
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
    })

    it('handles partial repoInfo structure', () => {
      const partialInfo = {
        repository: {
          id: 'test',
        },
      }
      renderWithProviders(<RepositoryInfo repoInfo={partialInfo} />)
      expect(screen.getByText('Archives')).toBeInTheDocument()
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
    })
  })
})
