import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders, screen, waitFor } from '../../test/test-utils'
import GuidedSetup from '../GuidedSetup'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const apiGetMock = vi.fn()
const apiPostMock = vi.fn()
const getSSHConnectionsMock = vi.fn()

vi.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
  sshKeysAPI: {
    getSSHConnections: (...args: unknown[]) => getSSHConnectionsMock(...args),
  },
}))

const toastSuccessMock = vi.fn()
const toastWarningMock = vi.fn()
const toastErrorMock = vi.fn()
vi.mock('sonner', () => ({
  toast: Object.assign(
    (msg: string) => toastSuccessMock(msg),
    {
      success: (msg: string) => toastSuccessMock(msg),
      warning: (msg: string) => toastWarningMock(msg),
      error: (msg: string) => toastErrorMock(msg),
    }
  ),
}))

function defaultApiGet(url: string) {
  if (url === '/filesystem/browse') {
    return Promise.resolve({
      data: {
        current_path: '/local/home',
        items: [
          { name: 'alice', is_directory: true, path: '/local/home/alice' },
        ],
        parent_path: '/local',
        is_inside_local_mount: true,
      },
    })
  }
  if (url === '/schedule/preview') {
    return Promise.resolve({
      data: {
        expression: '0 3 * * *',
        next_runs: ['2026-05-27T03:00:00Z', '2026-05-28T03:00:00Z', '2026-05-29T03:00:00Z'],
      },
    })
  }
  return Promise.resolve({ data: {} })
}

function defaultApiPost(url: string) {
  if (url === '/filesystem/validate-path') {
    // Default: path doesn't exist yet (acceptable — will be created)
    return Promise.resolve({
      data: { exists: false, is_directory: false, is_borg_repo: false, path: '' },
    })
  }
  if (url === '/repositories/guided-setup') {
    return Promise.resolve({
      data: {
        repository_id: 42,
        scheduled_job_id: 7,
        backup_job_id: 11,
        stage: 'ready',
      },
    })
  }
  return Promise.resolve({ data: {} })
}

async function advanceToStage4() {
  // Stage 1 → 2: continue (path is pre-filled, defaults to valid via mock)
  await waitFor(() =>
    expect(screen.getByTestId('guided-setup-continue')).not.toBeDisabled()
  )
  fireEvent.click(screen.getByTestId('guided-setup-continue'))

  // Stage 2: add a source
  fireEvent.click(screen.getByTestId('guided-use-home'))
  await waitFor(() =>
    expect(screen.getByTestId('guided-sources-list')).toBeInTheDocument()
  )
  fireEvent.click(screen.getByTestId('guided-setup-continue'))

  // Stage 3: matching passphrase
  fireEvent.change(screen.getByTestId('guided-passphrase'), {
    target: { value: 'a-very-strong-passphrase' },
  })
  fireEvent.change(screen.getByTestId('guided-passphrase-confirm'), {
    target: { value: 'a-very-strong-passphrase' },
  })
  fireEvent.click(screen.getByTestId('guided-passphrase-saved'))
  await waitFor(() =>
    expect(screen.getByTestId('guided-setup-continue')).not.toBeDisabled()
  )
  fireEvent.click(screen.getByTestId('guided-setup-continue'))
}

describe('GuidedSetup', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    apiGetMock.mockReset().mockImplementation(defaultApiGet)
    apiPostMock.mockReset().mockImplementation(defaultApiPost)
    getSSHConnectionsMock.mockReset().mockResolvedValue({ data: { connections: [] } })
    toastSuccessMock.mockReset()
    toastWarningMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('renders stage 1 with destination tiles + path field', () => {
    renderWithProviders(<GuidedSetup />)
    expect(screen.getByTestId('guided-tile-local')).toBeInTheDocument()
    expect(screen.getByTestId('guided-tile-ssh')).toBeInTheDocument()
    expect(screen.getByTestId('guided-path')).toBeInTheDocument()
  })

  it('enables Continue once a valid local path is validated', async () => {
    renderWithProviders(<GuidedSetup />)
    fireEvent.click(screen.getByTestId('guided-tile-local'))
    fireEvent.change(screen.getByTestId('guided-path'), {
      target: { value: '/data/borg/x' },
    })
    await waitFor(() =>
      expect(screen.getByTestId('guided-setup-continue')).not.toBeDisabled()
    )
  })

  it('Stage 2 starts empty; "Use my home folder" populates a directory', async () => {
    renderWithProviders(<GuidedSetup />)
    await waitFor(() =>
      expect(screen.getByTestId('guided-setup-continue')).not.toBeDisabled()
    )
    fireEvent.click(screen.getByTestId('guided-setup-continue'))
    // Stage 2
    expect(screen.queryByTestId('guided-sources-list')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('guided-use-home'))
    await waitFor(() =>
      expect(screen.getByTestId('guided-sources-list')).toBeInTheDocument()
    )
    expect(screen.getByText('/local/home/alice')).toBeInTheDocument()
  })

  it('Stage 3 blocks Continue when passphrases mismatch', async () => {
    renderWithProviders(<GuidedSetup />)
    await waitFor(() =>
      expect(screen.getByTestId('guided-setup-continue')).not.toBeDisabled()
    )
    fireEvent.click(screen.getByTestId('guided-setup-continue'))
    fireEvent.click(screen.getByTestId('guided-use-home'))
    await waitFor(() =>
      expect(screen.getByTestId('guided-sources-list')).toBeInTheDocument()
    )
    fireEvent.click(screen.getByTestId('guided-setup-continue'))
    // Stage 3
    fireEvent.change(screen.getByTestId('guided-passphrase'), {
      target: { value: 'abcdefghijklm' },
    })
    fireEvent.change(screen.getByTestId('guided-passphrase-confirm'), {
      target: { value: 'different-value-here' },
    })
    expect(
      screen.getByTestId('guided-passphrase-mismatch')
    ).toBeInTheDocument()
    expect(screen.getByTestId('guided-setup-continue')).toBeDisabled()
  })

  it('Stage 3 blocks Continue when "saved passphrase" checkbox unchecked', async () => {
    renderWithProviders(<GuidedSetup />)
    await waitFor(() =>
      expect(screen.getByTestId('guided-setup-continue')).not.toBeDisabled()
    )
    fireEvent.click(screen.getByTestId('guided-setup-continue'))
    fireEvent.click(screen.getByTestId('guided-use-home'))
    await waitFor(() =>
      expect(screen.getByTestId('guided-sources-list')).toBeInTheDocument()
    )
    fireEvent.click(screen.getByTestId('guided-setup-continue'))
    fireEvent.change(screen.getByTestId('guided-passphrase'), {
      target: { value: 'a-very-strong-passphrase' },
    })
    fireEvent.change(screen.getByTestId('guided-passphrase-confirm'), {
      target: { value: 'a-very-strong-passphrase' },
    })
    // Did NOT tick the checkbox
    expect(screen.getByTestId('guided-setup-continue')).toBeDisabled()
  })

  it('Stage 4 Daily preset selected by default; submit POSTs guided-setup', async () => {
    renderWithProviders(<GuidedSetup />)
    await advanceToStage4()
    const daily = screen.getByTestId('guided-preset-daily')
    expect(daily.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByTestId('guided-submit'))
    await waitFor(() => expect(apiPostMock).toHaveBeenCalled())
    const guidedCall = apiPostMock.mock.calls.find(
      (c) => c[0] === '/repositories/guided-setup'
    )
    expect(guidedCall).toBeTruthy()
    const body = guidedCall![1] as {
      repository: { path: string; encryption: string; passphrase: string }
      schedule: { cron_expression: string }
      auto_start_backup: boolean
    }
    expect(body.repository.encryption).toBe('repokey-blake2')
    expect(body.repository.passphrase).toBe('a-very-strong-passphrase')
    expect(body.schedule.cron_expression).toBe('0 3 * * *')
    expect(body.auto_start_backup).toBe(true)
  })

  it('navigates to /dashboard?just_setup=ID on stage=ready', async () => {
    renderWithProviders(<GuidedSetup />)
    await advanceToStage4()
    fireEvent.click(screen.getByTestId('guided-submit'))
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/dashboard?just_setup=42')
    )
  })

  it('renders inline error on 409 and stays on stage 4', async () => {
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/filesystem/validate-path') {
        return Promise.resolve({
          data: { exists: false, is_borg_repo: false, path: '' },
        })
      }
      if (url === '/repositories/guided-setup') {
        return Promise.reject({
          response: { status: 409, data: { detail: 'name already taken' } },
        })
      }
      return Promise.resolve({ data: {} })
    })
    renderWithProviders(<GuidedSetup />)
    await advanceToStage4()
    fireEvent.click(screen.getByTestId('guided-submit'))
    await waitFor(() =>
      expect(screen.getByTestId('guided-submit-error')).toBeInTheDocument()
    )
    // Still on stage 4
    expect(screen.getByTestId('guided-submit')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows partial-success toast on schedule_created_backup_failed and navigates', async () => {
    apiPostMock.mockImplementation((url: string) => {
      if (url === '/filesystem/validate-path') {
        return Promise.resolve({
          data: { exists: false, is_borg_repo: false, path: '' },
        })
      }
      if (url === '/repositories/guided-setup') {
        return Promise.resolve({
          data: {
            repository_id: 99,
            scheduled_job_id: 1,
            backup_job_id: null,
            stage: 'schedule_created_backup_failed',
          },
        })
      }
      return Promise.resolve({ data: {} })
    })
    renderWithProviders(<GuidedSetup />)
    await advanceToStage4()
    fireEvent.click(screen.getByTestId('guided-submit'))
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/dashboard?just_setup=99')
    )
    expect(toastWarningMock).toHaveBeenCalled()
  })
})
