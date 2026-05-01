import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import MountArchiveDialog from '../MountArchiveDialog'

describe('MountArchiveDialog', () => {
  const mockArchive = {
    id: '1',
    name: 'backup-2024-01-15',
    archive: 'backup-2024-01-15',
    start: '2024-01-15T10:00:00Z',
    time: '2024-01-15T10:00:00Z',
  }

  const mockHandlers = {
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    onMountPointChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <MountArchiveDialog open={false} archive={mockArchive} mountPoint="" {...mockHandlers} />
    )

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    renderWithProviders(<MountArchiveDialog open={true} archive={mockArchive} mountPoint="" {...mockHandlers} />)

    expect(screen.getByText('Mount Archive')).toBeInTheDocument()
    expect(screen.getByText('backup-2024-01-15')).toBeInTheDocument()
  })

  it('displays info alert about read-only filesystem', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MountArchiveDialog open={true} archive={mockArchive} mountPoint="" {...mockHandlers} />)

    const infoIcon = document.body.querySelector('.lucide-info')?.parentElement
    expect(infoIcon).toBeTruthy()

    if (infoIcon) {
      await user.hover(infoIcon)
      expect(infoIcon).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/The archive will be mounted as a read-only filesystem/i)
      )
    }
  })

  it('renders mount point input with placeholder', () => {
    renderWithProviders(<MountArchiveDialog open={true} archive={mockArchive} mountPoint="" {...mockHandlers} />)

    const input = screen.getByLabelText('Mount Point')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'my-backup-2024')
  })

  it('displays current mount point value', () => {
    renderWithProviders(
      <MountArchiveDialog
        open={true}
        archive={mockArchive}
        mountPoint="my-mount"
        {...mockHandlers}
      />
    )

    const input = screen.getByLabelText('Mount Point') as HTMLInputElement
    expect(input.value).toBe('my-mount')
  })

  it('calls onMountPointChange when input changes', () => {
    renderWithProviders(<MountArchiveDialog open={true} archive={mockArchive} mountPoint="" {...mockHandlers} />)

    const input = screen.getByLabelText('Mount Point')
    fireEvent.change(input, { target: { value: 'new-mount' } })

    expect(mockHandlers.onMountPointChange).toHaveBeenCalledWith('new-mount')
  })

  it('displays helper text with mount path preview', () => {
    renderWithProviders(
      <MountArchiveDialog
        open={true}
        archive={mockArchive}
        mountPoint="my-mount"
        {...mockHandlers}
      />
    )

    expect(screen.getByText(/Will be mounted at: \/data\/mounts\/my-mount/)).toBeInTheDocument()
  })

  it('shows placeholder in helper text when mount point is empty', () => {
    renderWithProviders(<MountArchiveDialog open={true} archive={mockArchive} mountPoint="" {...mockHandlers} />)

    expect(screen.getByText(/Will be mounted at: \/data\/mounts\/<name>/)).toBeInTheDocument()
  })

  it('calls onClose when Cancel button is clicked', () => {
    renderWithProviders(<MountArchiveDialog open={true} archive={mockArchive} mountPoint="" {...mockHandlers} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockHandlers.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Mount button is clicked', () => {
    renderWithProviders(
      <MountArchiveDialog
        open={true}
        archive={mockArchive}
        mountPoint="my-mount"
        {...mockHandlers}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /^mount$/i }))
    expect(mockHandlers.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables Mount button when mounting', () => {
    renderWithProviders(
      <MountArchiveDialog
        open={true}
        archive={mockArchive}
        mountPoint="my-mount"
        mounting={true}
        {...mockHandlers}
      />
    )

    const mountButton = screen.getByRole('button', { name: /mounting/i })
    expect(mountButton).toBeDisabled()
  })

  it('shows "Mounting..." text when mounting', () => {
    renderWithProviders(
      <MountArchiveDialog
        open={true}
        archive={mockArchive}
        mountPoint="my-mount"
        mounting={true}
        {...mockHandlers}
      />
    )

    expect(screen.getByText('Mounting...')).toBeInTheDocument()
  })

  it('handles null archive gracefully', () => {
    renderWithProviders(<MountArchiveDialog open={true} archive={null} mountPoint="" {...mockHandlers} />)

    expect(screen.getByText('Mount Archive')).toBeInTheDocument()
  })
})
