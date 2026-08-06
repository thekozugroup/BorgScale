import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent } from '../../test/test-utils'
import ErrorBoundary from '../ErrorBoundary'

function Boom(): JSX.Element {
  throw new Error('render exploded')
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // React re-throws to console.error for every caught boundary error.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders its children while nothing throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    )

    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('replaces a crashed tree with a recovery surface instead of a blank page', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('This page stopped working')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    expect(screen.queryByText(/render exploded/)).not.toBeInTheDocument()
  })

  it('logs the error and the component stack for diagnosis', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled render error:',
      expect.objectContaining({ message: 'render exploded' }),
      expect.stringContaining('Boom')
    )
  })

  it('keeps the stack behind a collapsed disclosure', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )

    await user.click(screen.getByRole('button', { name: /technical details/i }))

    expect(await screen.findByText(/render exploded/)).toBeInTheDocument()
  })

  it('reloads the page from the recovery action', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )

    await user.click(screen.getByRole('button', { name: /^reload$/i }))

    expect(reloadMock).toHaveBeenCalled()
  })
})
