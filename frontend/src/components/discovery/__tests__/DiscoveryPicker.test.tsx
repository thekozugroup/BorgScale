import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders, screen } from '../../../test/test-utils'
import DiscoveryPicker, { type FoundRepo } from '../DiscoveryPicker'

vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  repositoriesAPI: { getRepositories: vi.fn() },
  sshKeysAPI: { getSSHConnections: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

const sampleFound: FoundRepo[] = [
  {
    path: '/srv/borg/a',
    borg_version: 2,
    repository_id: 'aaa',
    last_modified_ts: 1700000000,
    size_bytes: 1024,
    encryption_guess: 'encrypted',
    archive_count: 5,
    already_imported: false,
    source: 'local',
  },
  {
    path: '/srv/borg/b',
    borg_version: 1,
    repository_id: 'bbb',
    last_modified_ts: 1700000000,
    size_bytes: 2048,
    encryption_guess: 'unencrypted',
    archive_count: 2,
    already_imported: true,
    source: 'local',
  },
]

describe('DiscoveryPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs a scan and renders found repositories', async () => {
    const { default: api } = await import('../../../services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        found: sampleFound,
        scanned_roots: ['/srv'],
        elapsed_ms: 120,
        partial: false,
      },
    } as never)

    renderWithProviders(<DiscoveryPicker mode="local" />)

    fireEvent.click(screen.getByTestId('discovery-scan-button'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
    })
    expect(api.post).toHaveBeenCalledWith(
      '/repositories/discover/local',
      expect.objectContaining({ max_depth: 8, budget_seconds: 30 })
    )

    await screen.findByTestId('found-repo-/srv/borg/a')
    expect(screen.getByTestId('found-repo-/srv/borg/b')).toBeInTheDocument()
  })

  it('disables Import button on already-imported repos', async () => {
    const { default: api } = await import('../../../services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        found: sampleFound,
        scanned_roots: ['/srv'],
        elapsed_ms: 50,
        partial: false,
      },
    } as never)

    renderWithProviders(<DiscoveryPicker mode="local" />)
    fireEvent.click(screen.getByTestId('discovery-scan-button'))

    const importedRowBtn = await screen.findByTestId('import-/srv/borg/b')
    expect(importedRowBtn).toBeDisabled()

    const newRowBtn = screen.getByTestId('import-/srv/borg/a')
    expect(newRowBtn).not.toBeDisabled()
  })

  it('shows passphrase field for encrypted repos and submits quick-import', async () => {
    const { default: api } = await import('../../../services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        found: sampleFound,
        scanned_roots: ['/srv'],
        elapsed_ms: 60,
        partial: false,
      },
    } as never)

    renderWithProviders(<DiscoveryPicker mode="local" />)
    fireEvent.click(screen.getByTestId('discovery-scan-button'))

    fireEvent.click(await screen.findByTestId('import-/srv/borg/a'))

    // Encrypted repo: passphrase field must be visible
    const passInput = await screen.findByTestId('qi-passphrase')
    expect(passInput).toBeInTheDocument()

    fireEvent.change(passInput, { target: { value: 'secret' } })

    // Now mock the quick-import response
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 42, name: 'a', path: '/srv/borg/a' },
    } as never)

    fireEvent.click(screen.getByTestId('qi-submit'))

    await waitFor(() => {
      const calls = vi.mocked(api.post).mock.calls
      const importCall = calls.find((c) => c[0] === '/repositories/quick-import')
      expect(importCall).toBeDefined()
      expect(importCall![1]).toMatchObject({
        path: '/srv/borg/a',
        mode: 'full',
        passphrase: 'secret',
      })
    })
  })

  it('defaults the import dialog to full mode', async () => {
    const { default: api } = await import('../../../services/api')
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        found: sampleFound,
        scanned_roots: ['/srv'],
        elapsed_ms: 60,
        partial: false,
      },
    } as never)

    renderWithProviders(<DiscoveryPicker mode="local" />)
    fireEvent.click(screen.getByTestId('discovery-scan-button'))

    fireEvent.click(await screen.findByTestId('import-/srv/borg/a'))

    const modeSelect = document.getElementById('qi-mode') as HTMLSelectElement
    expect(modeSelect).not.toBeNull()
    expect(modeSelect.value).toBe('full')
  })

  it('requires connectionId before scanning in remote mode', async () => {
    const { default: api } = await import('../../../services/api')
    const sonner = await import('sonner')

    renderWithProviders(<DiscoveryPicker mode="remote" />)
    fireEvent.click(screen.getByTestId('discovery-scan-button'))

    await waitFor(() => {
      expect(sonner.toast.error).toHaveBeenCalled()
    })
    expect(api.post).not.toHaveBeenCalled()
  })
})
