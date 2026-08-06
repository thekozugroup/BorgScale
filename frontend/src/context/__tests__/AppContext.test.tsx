import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { renderWithProviders, screen, waitFor } from '../../test/test-utils'
import { AppProvider, useAppState, useTabEnablement } from '../AppContext'
import { repositoriesAPI } from '../../services/api'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

const getRepositoriesMock = vi.fn()
const getSSHKeysMock = vi.fn()

vi.mock('../../services/api', () => ({
  repositoriesAPI: {
    getRepositories: () => getRepositoriesMock(),
  },
  sshKeysAPI: {
    getSSHKeys: () => getSSHKeysMock(),
  },
}))

function Probe() {
  const appState = useAppState()
  const { tabEnablement, getTabDisabledReason } = useTabEnablement()

  return (
    <div>
      <div>hasSSHKey:{String(appState.hasSSHKey)}</div>
      <div>hasRepositories:{String(appState.hasRepositories)}</div>
      <div>hasArchives:{String(appState.hasArchives)}</div>
      <div>loading:{String(appState.isLoading)}</div>
      <div>backups:{String(tabEnablement.backups)}</div>
      <div>archives:{String(tabEnablement.archives)}</div>
      <div>restore:{String(tabEnablement.restore)}</div>
      <div>schedule:{String(tabEnablement.schedule)}</div>
      <div>reason:{getTabDisabledReason('backups') ?? 'none'}</div>
    </div>
  )
}

function RepositoriesConsumer() {
  const { data } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getRepositories,
  })

  return <div>consumerRepositories:{data?.data?.repositories?.length ?? 'none'}</div>
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    })
    getSSHKeysMock.mockResolvedValue({ data: { ssh_keys: [] } })
    getRepositoriesMock.mockResolvedValue({ data: { repositories: [] } })
  })

  it('disables repository-dependent tabs when no repositories exist', async () => {
    renderWithProviders(
      <AppProvider>
        <Probe />
      </AppProvider>
    )

    await screen.findByText('hasRepositories:false')
    await waitFor(() => {
      expect(screen.getByText('loading:false')).toBeInTheDocument()
      expect(screen.getByText('backups:false')).toBeInTheDocument()
      expect(screen.getByText('archives:false')).toBeInTheDocument()
      expect(screen.getByText('restore:false')).toBeInTheDocument()
      expect(screen.getByText('schedule:false')).toBeInTheDocument()
      expect(screen.getByText('reason:Please create a repository first')).toBeInTheDocument()
    })
  })

  it('shares the repository list cache with the other repository call sites', async () => {
    getRepositoriesMock.mockResolvedValue({
      data: { repositories: [{ id: 1, archive_count: 2 }] },
    })

    renderWithProviders(
      <AppProvider>
        <Probe />
        <RepositoriesConsumer />
      </AppProvider>
    )

    await screen.findByText('consumerRepositories:1')
    await screen.findByText('hasRepositories:true')
    expect(getRepositoriesMock).toHaveBeenCalledTimes(1)
  })

  it('enables repository-dependent tabs and derives archive state from repository counts', async () => {
    getSSHKeysMock.mockResolvedValue({ data: { ssh_keys: [{ id: 1 }] } })
    getRepositoriesMock.mockResolvedValue({
      data: {
        repositories: [
          { id: 1, archive_count: 0 },
          { id: 2, archive_count: 3 },
        ],
      },
    })

    renderWithProviders(
      <AppProvider>
        <Probe />
      </AppProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('hasSSHKey:true')).toBeInTheDocument()
      expect(screen.getByText('hasRepositories:true')).toBeInTheDocument()
      expect(screen.getByText('hasArchives:true')).toBeInTheDocument()
      expect(screen.getByText('backups:true')).toBeInTheDocument()
      expect(screen.getByText('archives:true')).toBeInTheDocument()
      expect(screen.getByText('restore:true')).toBeInTheDocument()
      expect(screen.getByText('schedule:true')).toBeInTheDocument()
      expect(screen.getByText('reason:none')).toBeInTheDocument()
    })
  })
})
