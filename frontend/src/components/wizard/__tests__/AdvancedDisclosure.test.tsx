import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import AdvancedDisclosure from '../AdvancedDisclosure'

function withI18n(ui: React.ReactNode) {
  return <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
}

describe('AdvancedDisclosure', () => {
  it('hides children by default', () => {
    render(
      withI18n(
        <AdvancedDisclosure label="Toggle">
          <span>inner</span>
        </AdvancedDisclosure>
      )
    )
    expect(screen.queryByText('inner')).not.toBeInTheDocument()
  })

  it('reveals children when toggled', () => {
    render(
      withI18n(
        <AdvancedDisclosure label="Toggle">
          <span>inner</span>
        </AdvancedDisclosure>
      )
    )
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(screen.getByText('inner')).toBeInTheDocument()
  })

  it('forces open when forceOpen=true', () => {
    render(
      withI18n(
        <AdvancedDisclosure label="Toggle" forceOpen>
          <span>inner</span>
        </AdvancedDisclosure>
      )
    )
    expect(screen.getByText('inner')).toBeInTheDocument()
  })

  it('uses labelKey when label is not provided', () => {
    render(
      withI18n(
        <AdvancedDisclosure labelKey="wizard.advanced.label">
          <span>inner</span>
        </AdvancedDisclosure>
      )
    )
    expect(
      screen.getByRole('button', { name: /Advanced settings/i })
    ).toBeInTheDocument()
  })
})
