import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent, waitFor } from '../../test/test-utils'
import PasskeyEnrollmentPrompt from '../PasskeyEnrollmentPrompt'
import { toast } from 'sonner'

const { enrollPasskeyFromRecentLoginMock, onSnoozeMock, onIgnoreMock, onSuccessMock } = vi.hoisted(
  () => ({
    enrollPasskeyFromRecentLoginMock: vi.fn(),
    onSnoozeMock: vi.fn(),
    onIgnoreMock: vi.fn(),
    onSuccessMock: vi.fn(),
  })
)

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    enrollPasskeyFromRecentLogin: enrollPasskeyFromRecentLoginMock,
  }),
}))

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

describe('PasskeyEnrollmentPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enrollPasskeyFromRecentLoginMock.mockResolvedValue(undefined)
    onSuccessMock.mockResolvedValue(undefined)
  })

  it('enrolls a passkey from the prompt', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <PasskeyEnrollmentPrompt
        open
        onSnooze={onSnoozeMock}
        onIgnore={onIgnoreMock}
        onSuccess={onSuccessMock}
      />
    )

    await user.click(screen.getByRole('button', { name: /set up passkey/i }))

    await waitFor(() => {
      expect(enrollPasskeyFromRecentLoginMock).toHaveBeenCalledTimes(1)
      expect(toast.success).toHaveBeenCalledWith('Passkey added')
      expect(onSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  it('forwards snooze and ignore actions', async () => {
    const user = userEvent.setup()

    const { rerender } = renderWithProviders(
      <PasskeyEnrollmentPrompt
        open
        onSnooze={onSnoozeMock}
        onIgnore={onIgnoreMock}
        onSuccess={onSuccessMock}
      />
    )

    await user.click(screen.getByRole('button', { name: /remind me later/i }))
    expect(onSnoozeMock).toHaveBeenCalledTimes(1)

    rerender(
      <PasskeyEnrollmentPrompt
        open
        onSnooze={onSnoozeMock}
        onIgnore={onIgnoreMock}
        onSuccess={onSuccessMock}
      />
    )

    await user.click(screen.getByRole('button', { name: /don't ask again/i }))
    expect(onIgnoreMock).toHaveBeenCalledTimes(1)
  })
})
