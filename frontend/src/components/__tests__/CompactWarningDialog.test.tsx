import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, renderWithProviders } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import CompactWarningDialog from '../CompactWarningDialog'

describe('CompactWarningDialog', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    mockOnConfirm.mockClear()
    mockOnCancel.mockClear()
  })

  describe('Rendering', () => {
    it('renders dialog title', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText('Compact Repository')).toBeInTheDocument()
    })

    it('renders repository name', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="my-backup-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText(/my-backup-repo/)).toBeInTheDocument()
    })

    it('renders description text', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(
        screen.getByText(/Compaction removes unused segments and reclaims disk space/)
      ).toBeInTheDocument()
    })

    it('renders warning about repository being locked', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText('Repository will be locked')).toBeInTheDocument()
    })

    it('renders progress tracking info', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText('Progress tracking')).toBeInTheDocument()
    })

    it('renders tip text', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText(/Tip: Run compaction after pruning/)).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders Start Compacting button', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByRole('button', { name: /Compact/ })).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={false}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.queryByText('Compact Repository')).not.toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('calls onConfirm when Start Compacting is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByRole('button', { name: /Compact/ }))
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('calls onCancel when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading state', () => {
    it('shows Starting... text when isLoading is true', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )
      expect(screen.getByRole('button', { name: /Running/i })).toBeInTheDocument()
    })

    it('disables Cancel button when isLoading is true', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })

    it('disables confirm button when isLoading is true', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )
      expect(screen.getByRole('button', { name: /Running/i })).toBeDisabled()
    })

    it('enables buttons when isLoading is false', () => {
      renderWithProviders(
        <CompactWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={false}
        />
      )
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Compact/ })).not.toBeDisabled()
    })
  })
})
