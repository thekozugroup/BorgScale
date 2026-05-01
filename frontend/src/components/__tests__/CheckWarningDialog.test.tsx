import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import CheckWarningDialog from '../CheckWarningDialog'

describe('CheckWarningDialog', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    mockOnConfirm.mockClear()
    mockOnCancel.mockClear()
  })

  describe('Rendering', () => {
    it('renders dialog title', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText('Check Repository Integrity')).toBeInTheDocument()
    })

    it('renders repository name', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="my-backup-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText(/my-backup-repo/)).toBeInTheDocument()
    })

    it('renders warning about repository being locked', () => {
      renderWithProviders(
        <CheckWarningDialog
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
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText('Progress tracking')).toBeInTheDocument()
    })

    it('renders accessibility info about other repos', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText(/Other repositories will remain accessible/)).toBeInTheDocument()
    })

    it('renders max duration input with default value', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveValue(3600)
    })

    it('renders max duration helper text', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByText(/Maximum time for the check operation/)).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders Start Check button', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.getByRole('button', { name: /Run Check/ })).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={false}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )
      expect(screen.queryByText('Check Repository Integrity')).not.toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('calls onConfirm with default duration when Start Check is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByRole('button', { name: /Run Check/ }))
      expect(mockOnConfirm).toHaveBeenCalledWith(3600)
    })

    it('calls onCancel when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm with custom duration', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '7200' } })
      fireEvent.click(screen.getByRole('button', { name: /Run Check/ }))

      expect(mockOnConfirm).toHaveBeenCalledWith(7200)
    })

    it('handles empty input by using default value', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '' } })

      // The component should convert NaN to 3600 (default)
      expect(input).toHaveValue(3600)
    })

    it('handles invalid input by using default value', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: 'abc' } })

      // The component should convert NaN to 3600 (default)
      expect(input).toHaveValue(3600)
    })

    it('allows zero as duration', () => {
      renderWithProviders(
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '0' } })

      expect(input).toHaveValue(0)
    })
  })

  describe('Loading state', () => {
    it('shows Starting... text when isLoading is true', () => {
      renderWithProviders(
        <CheckWarningDialog
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
        <CheckWarningDialog
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
        <CheckWarningDialog
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
        <CheckWarningDialog
          open={true}
          repositoryName="test-repo"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={false}
        />
      )
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Run Check/ })).not.toBeDisabled()
    })
  })
})
