import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '../../test/test-utils'
import ProtectedRoute from '../ProtectedRoute'

const {
  getTabDisabledReasonMock,
  useAppStateMock,
  useTabEnablementMock,
} = vi.hoisted(() => ({
  getTabDisabledReasonMock: vi.fn(),
  useAppStateMock: vi.fn(),
  useTabEnablementMock: vi.fn(),
}))

vi.mock('../../context/AppContext', () => ({
  useAppState: () => useAppStateMock(),
  useTabEnablement: () => useTabEnablementMock(),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStateMock.mockReturnValue({ isLoading: false })
    getTabDisabledReasonMock.mockReturnValue('Please create a repository first')
    useTabEnablementMock.mockReturnValue({
      tabEnablement: {
        dashboard: true,
        sshKeys: true,
        connections: true,
        repositories: true,
        backups: true,
        archives: true,
        restore: true,
        schedule: true,
        settings: true,
      },
      getTabDisabledReason: getTabDisabledReasonMock,
    })
  })

  it('renders children when the tab is enabled', () => {
    renderWithProviders(
      <ProtectedRoute requiredTab="backups">
        <div>Backup Page</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Backup Page')).toBeInTheDocument()
  })

  it('renders nothing while app state is still loading', () => {
    useAppStateMock.mockReturnValue({ isLoading: true })
    useTabEnablementMock.mockReturnValue({
      tabEnablement: {
        dashboard: true,
        sshKeys: true,
        connections: true,
        repositories: true,
        backups: false,
        archives: true,
        restore: true,
        schedule: true,
        settings: true,
      },
      getTabDisabledReason: getTabDisabledReasonMock,
    })

    renderWithProviders(
      <ProtectedRoute requiredTab="backups">
        <div>Backup Page</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Backup Page')).not.toBeInTheDocument()
  })

  it('shows a RouteGate empty-state when the tab is disabled', () => {
    useTabEnablementMock.mockReturnValue({
      tabEnablement: {
        dashboard: true,
        sshKeys: true,
        connections: true,
        repositories: true,
        backups: false,
        archives: true,
        restore: true,
        schedule: true,
        settings: true,
      },
      getTabDisabledReason: getTabDisabledReasonMock,
    })

    renderWithProviders(
      <ProtectedRoute requiredTab="backups">
        <div>Backup Page</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Backup Page')).not.toBeInTheDocument()
    expect(screen.getByText('Please create a repository first')).toBeInTheDocument()
  })

  it('shows fallback message when disabled reason is null', () => {
    getTabDisabledReasonMock.mockReturnValue(null)
    useTabEnablementMock.mockReturnValue({
      tabEnablement: {
        dashboard: true,
        sshKeys: true,
        connections: true,
        repositories: true,
        backups: false,
        archives: true,
        restore: true,
        schedule: true,
        settings: true,
      },
      getTabDisabledReason: getTabDisabledReasonMock,
    })

    renderWithProviders(
      <ProtectedRoute requiredTab="backups">
        <div>Backup Page</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Backup Page')).not.toBeInTheDocument()
    expect(screen.getByText('Please create a repository first')).toBeInTheDocument()
  })
})
