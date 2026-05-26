import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent, waitFor } from '../../../test/test-utils'
import QuickConnectModal from '../QuickConnectModal'

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('react-hot-toast', async () => {
  const actual = await vi.importActual<typeof import('react-hot-toast')>('react-hot-toast')
  return {
    ...actual,
    toast: {
      success: toastSuccess,
      error: toastError,
    },
  }
})

vi.mock('@/services/api', () => ({
  sshKeysAPI: {
    manualPairInit: vi.fn(),
    manualPairVerify: vi.fn(),
  },
}))

describe('QuickConnectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form step initially', async () => {
    renderWithProviders(
      <QuickConnectModal open={true} onOpenChange={() => {}} />
    )
    expect(await screen.findByLabelText(/host/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/port/i)).toBeInTheDocument()
  })

  it('moves to paste step after init', async () => {
    const { sshKeysAPI } = await import('@/services/api')
    ;(sshKeysAPI.manualPairInit as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ssh_key_id: 7,
        name: 'borgscale-default',
        key_type: 'ed25519',
        public_key: 'ssh-ed25519 AAAA test',
        created: false,
        suggested_command: 'echo ... >> ~/.ssh/authorized_keys',
      },
    })

    renderWithProviders(<QuickConnectModal open={true} onOpenChange={() => {}} />)

    fireEvent.change(await screen.findByLabelText(/host/i), {
      target: { value: 'demo.host' },
    })
    fireEvent.click(screen.getByTestId('qc-continue'))

    await waitFor(() => {
      expect(screen.getByTestId('qc-public-key')).toHaveValue('ssh-ed25519 AAAA test')
    })
  })

  it('shows success state on verify success', async () => {
    const { sshKeysAPI } = await import('@/services/api')
    ;(sshKeysAPI.manualPairInit as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ssh_key_id: 7,
        name: 'x',
        key_type: 'ed25519',
        public_key: 'ssh-ed25519 AAAA',
        created: false,
        suggested_command: 'echo ...',
      },
    })
    ;(sshKeysAPI.manualPairVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        borg_version: '1.2.7',
        stderr_raw: '',
        stdout: 'borg 1.2.7',
        hint_key: null,
        connection_id: 42,
        return_code: 0,
      },
    })

    renderWithProviders(<QuickConnectModal open={true} onOpenChange={() => {}} />)

    fireEvent.change(await screen.findByLabelText(/host/i), {
      target: { value: 'demo.host' },
    })
    fireEvent.click(screen.getByTestId('qc-continue'))
    await screen.findByTestId('qc-public-key')
    fireEvent.click(screen.getByTestId('qc-test-connection'))

    await screen.findByTestId('qc-success')
    expect(screen.getByText(/1\.2\.7/)).toBeInTheDocument()
  })

  it('shows hint + raw stderr on verify failure', async () => {
    const { sshKeysAPI } = await import('@/services/api')
    ;(sshKeysAPI.manualPairInit as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        ssh_key_id: 7,
        name: 'x',
        key_type: 'ed25519',
        public_key: 'ssh-ed25519 AAAA',
        created: false,
        suggested_command: 'echo ...',
      },
    })
    ;(sshKeysAPI.manualPairVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: false,
        borg_version: null,
        stderr_raw: 'Permission denied (publickey).',
        stdout: '',
        hint_key: 'backend.ssh.hint.publicKeyNotAuthorized',
        connection_id: null,
        return_code: 255,
      },
    })

    renderWithProviders(<QuickConnectModal open={true} onOpenChange={() => {}} />)

    fireEvent.change(await screen.findByLabelText(/host/i), {
      target: { value: 'demo.host' },
    })
    fireEvent.click(screen.getByTestId('qc-continue'))
    await screen.findByTestId('qc-public-key')
    fireEvent.click(screen.getByTestId('qc-test-connection'))

    await screen.findByTestId('qc-error')
    expect(screen.getByText(/rejected the key/i)).toBeInTheDocument()
    expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
  })
})
