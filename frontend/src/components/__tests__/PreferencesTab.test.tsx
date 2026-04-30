import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent } from '../../test/test-utils'
import PreferencesTab from '../PreferencesTab'
import { toast } from 'react-hot-toast'
import i18n from '../../i18n'

vi.mock('react-hot-toast', async () => {
  const actual = await vi.importActual<typeof import('react-hot-toast')>('react-hot-toast')
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('PreferencesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('changes the UI language and persists the selection locally', async () => {
    const user = userEvent.setup()
    const changeLanguageSpy = vi
      .spyOn(i18n, 'changeLanguage')
      .mockResolvedValue(i18n.t.bind(i18n) as typeof i18n.t)

    renderWithProviders(<PreferencesTab />)

    const languageSelect = await screen.findByRole('combobox')
    await user.click(languageSelect)
    await user.click(await screen.findByRole('option', { name: 'Deutsch' }))

    expect(changeLanguageSpy).toHaveBeenCalledWith('de')
    expect(localStorage.getItem('i18nextLng')).toBe('de')
    expect(toast.success).toHaveBeenCalled()
  })
})
