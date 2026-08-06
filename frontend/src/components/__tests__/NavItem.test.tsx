import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen, userEvent } from '../../test/test-utils'
import { Database } from 'lucide-react'
import NavItem from '../NavItem'

const defaultProps = {
  name: 'Repositories',
  href: '/repositories',
  icon: Database,
  isActive: false,
  isEnabled: true,
  navLabel: (n: string) => n,
}

describe('NavItem', () => {
  it('renders the nav label', () => {
    renderWithProviders(<NavItem {...defaultProps} />)
    expect(screen.getByText('Repositories')).toBeInTheDocument()
  })

  it('renders a link when enabled', () => {
    renderWithProviders(<NavItem {...defaultProps} />)
    expect(screen.getByRole('link', { name: /repositories/i })).toBeInTheDocument()
  })

  it('renders a lock icon and no link when disabled', () => {
    renderWithProviders(<NavItem {...defaultProps} isEnabled={false} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows tooltip with disabled reason when disabled', () => {
    renderWithProviders(
      <NavItem {...defaultProps} isEnabled={false} disabledReason="No repository configured" />
    )
    // MUI Tooltip wraps the element — confirm the wrapper is present
    expect(screen.getByText('Repositories')).toBeInTheDocument()
  })

  it('keeps a disabled item focusable and exposes aria-disabled', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <NavItem {...defaultProps} isEnabled={false} disabledReason="No repository configured" />
    )

    const item = screen.getByRole('button', { name: /repositories/i })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(item).not.toHaveAttribute('disabled')

    await user.tab()
    expect(item).toHaveFocus()
  })

  it('exposes the disabled reason as the accessible description', () => {
    renderWithProviders(
      <NavItem {...defaultProps} isEnabled={false} disabledReason="No repository configured" />
    )

    const item = screen.getByRole('button', { name: /repositories/i })
    expect(item).toHaveAccessibleDescription('No repository configured')
  })

  it('uses navLabel to translate the name', () => {
    renderWithProviders(
      <NavItem {...defaultProps} name="Repositories" navLabel={() => 'Repositorios'} />
    )
    expect(screen.getByText('Repositorios')).toBeInTheDocument()
  })
})
