import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent, waitFor } from '../../test/test-utils'
import Login from '../Login'
import { toast } from 'sonner'

const {
  loginMock,
  verifyTotpLoginMock,
  loginWithPasskeyMock,
  refreshUserMock,
  navigateMock,
  beginPasskeyAuthenticationMock,
  finishPasskeyAuthenticationMock,
  isConditionalMediationAvailableMock,
  getConditionalPasskeyAssertionMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  verifyTotpLoginMock: vi.fn(),
  loginWithPasskeyMock: vi.fn(),
  refreshUserMock: vi.fn(),
  navigateMock: vi.fn(),
  beginPasskeyAuthenticationMock: vi.fn(),
  finishPasskeyAuthenticationMock: vi.fn(),
  isConditionalMediationAvailableMock: vi.fn(),
  getConditionalPasskeyAssertionMock: vi.fn(),
}))

vi.mock('../../hooks/useAuth.tsx', () => ({
  useAuth: () => ({
    login: loginMock,
    verifyTotpLogin: verifyTotpLoginMock,
    loginWithPasskey: loginWithPasskeyMock,
    refreshUser: refreshUserMock,
    mustChangePassword: false,
  }),
}))

vi.mock('../../services/api', () => ({
  authAPI: {
    beginPasskeyAuthentication: () => beginPasskeyAuthenticationMock(),
    finishPasskeyAuthentication: (ceremonyToken: string, credential: unknown) =>
      finishPasskeyAuthenticationMock(ceremonyToken, credential),
  },
}))

vi.mock('../../utils/webauthn', () => ({
  isConditionalMediationAvailable: () => isConditionalMediationAvailableMock(),
  getConditionalPasskeyAssertion: (options: unknown, signal?: AbortSignal) =>
    getConditionalPasskeyAssertionMock(options, signal),
}))

vi.mock('../FirstLoginPasswordSetup', () => ({
  default: () => <div>Password Setup Card</div>,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('sonner', async () => {
  const actual = await vi.importActual<typeof import('sonner')>('sonner')
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    isConditionalMediationAvailableMock.mockResolvedValue(false)
    refreshUserMock.mockResolvedValue(undefined)
  })

  it('submits credentials and redirects to the dashboard by default', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue({ totpRequired: false, mustChangePassword: false })

    renderWithProviders(<Login />)

    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin', 'secret')
      expect(toast.success).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('replaces the login card with the password setup card for first-time users', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue({ totpRequired: false, mustChangePassword: true })

    renderWithProviders(<Login />)

    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Login successful!')
    })
    expect(screen.getByText('Password Setup Card')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows the translated backend error and resets loading after a failed login', async () => {
    const user = userEvent.setup()
    loginMock.mockRejectedValue({
      response: {
        data: {
          detail: 'backend.errors.auth.incorrectCredentials',
        },
      },
    })

    renderWithProviders(<Login />)

    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-secret')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Incorrect username or password')
    })
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled()
  })

  it('switches to TOTP verification when the backend requires a second factor', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue({
      totpRequired: true,
      mustChangePassword: false,
      loginChallengeToken: 'challenge-token',
    })
    verifyTotpLoginMock.mockResolvedValue({ mustChangePassword: false })

    renderWithProviders(<Login />)

    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByLabelText(/authentication code/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/authentication code/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify code/i }))

    await waitFor(() => {
      expect(verifyTotpLoginMock).toHaveBeenCalledWith('challenge-token', '123456')
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('supports passkey login from the login page', async () => {
    const user = userEvent.setup()
    loginWithPasskeyMock.mockResolvedValue({ mustChangePassword: false })

    renderWithProviders(<Login />)

    await user.click(screen.getByRole('button', { name: /sign in with passkey/i }))

    await waitFor(() => {
      expect(loginWithPasskeyMock).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('establishes the auth session before navigating after an autofill passkey sign-in', async () => {
    isConditionalMediationAvailableMock.mockResolvedValue(true)
    beginPasskeyAuthenticationMock.mockResolvedValue({
      data: { ceremony_token: 'ceremony-token', options: {} },
    })
    getConditionalPasskeyAssertionMock.mockResolvedValue({ id: 'credential-id' })
    finishPasskeyAuthenticationMock.mockResolvedValue({
      data: { access_token: 'jwt-token', must_change_password: false },
    })

    renderWithProviders(<Login />)

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('jwt-token')
      expect(refreshUserMock).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })

    expect(refreshUserMock.mock.invocationCallOrder[0]).toBeLessThan(
      navigateMock.mock.invocationCallOrder[0]
    )
  })
})
