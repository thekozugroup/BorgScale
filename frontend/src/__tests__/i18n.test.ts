import { describe, it, expect, afterAll } from 'vitest'
import i18n from '../i18n'

describe('i18n document language sync', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('reflects the active language on <html lang> after startup', () => {
    expect(document.documentElement.lang).toBe(i18n.language)
  })

  it('updates <html lang> when the user changes language', async () => {
    await i18n.changeLanguage('de')
    expect(document.documentElement.lang).toBe('de')

    await i18n.changeLanguage('es')
    expect(document.documentElement.lang).toBe('es')

    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
