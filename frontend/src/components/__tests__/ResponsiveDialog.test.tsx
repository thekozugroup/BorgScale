import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, renderWithProviders, userEvent, waitFor } from '../../test/test-utils'
import ResponsiveDialog from '../ResponsiveDialog'

// Helper: mock window.matchMedia for mobile vs desktop
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('ResponsiveDialog', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  describe('desktop (md+)', () => {
    beforeEach(() => {
      mockMatchMedia(false) // max-width: 767px does NOT match → desktop
    })

    it('renders a Dialog (role=dialog) when open', () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      renderWithProviders(
        <ResponsiveDialog open={false} onClose={onClose}>
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders children', () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>hello world</div>
        </ResponsiveDialog>
      )
      expect(screen.getByText('hello world')).toBeInTheDocument()
    })
  })

  describe('mobile (< md)', () => {
    beforeEach(() => {
      mockMatchMedia(true) // max-width: 767px matches → mobile
    })

    it('renders the drag handle when open', () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    })

    it('renders children', () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>mobile content</div>
        </ResponsiveDialog>
      )
      expect(screen.getByText('mobile content')).toBeInTheDocument()
    })

    it('does not render content when open is false', () => {
      renderWithProviders(
        <ResponsiveDialog open={false} onClose={onClose}>
          <div>hidden</div>
        </ResponsiveDialog>
      )
      expect(screen.queryByText('hidden')).not.toBeInTheDocument()
    })

    it('announces the bottom sheet as a dialog', () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('moves focus into the sheet when it opens', async () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <button>first action</button>
        </ResponsiveDialog>
      )
      const dialog = screen.getByRole('dialog')
      await waitFor(() => {
        expect(dialog.contains(document.activeElement)).toBe(true)
      })
    })

    it('keeps Tab focus trapped inside the sheet', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <button>first action</button>
          <button>second action</button>
        </ResponsiveDialog>
      )
      const dialog = screen.getByRole('dialog')
      // Cycle past every tabbable element — focus must never escape the dialog
      for (let i = 0; i < 5; i++) {
        await user.tab()
        expect(dialog.contains(document.activeElement)).toBe(true)
      }
    })

    it('closes on Escape and reports the escapeKeyDown reason', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>content</div>
        </ResponsiveDialog>
      )
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledWith({}, 'escapeKeyDown')
    })
  })

  describe('footer prop — mobile', () => {
    beforeEach(() => {
      mockMatchMedia(true)
    })

    it('renders footer outside the scrollable area when provided', () => {
      renderWithProviders(
        <ResponsiveDialog
          open={true}
          onClose={onClose}
          footer={<div data-testid="test-footer">Actions</div>}
        >
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.getByTestId('test-footer')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-dialog-footer')).toBeInTheDocument()
    })

    it('does not render footer container when footer is not provided', () => {
      renderWithProviders(
        <ResponsiveDialog open={true} onClose={onClose}>
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.queryByTestId('responsive-dialog-footer')).not.toBeInTheDocument()
    })
  })

  describe('footer prop — desktop', () => {
    beforeEach(() => {
      mockMatchMedia(false)
    })

    it('renders footer as part of dialog children when provided', () => {
      renderWithProviders(
        <ResponsiveDialog
          open={true}
          onClose={onClose}
          footer={<div data-testid="test-footer">Actions</div>}
        >
          <div>content</div>
        </ResponsiveDialog>
      )
      expect(screen.getByTestId('test-footer')).toBeInTheDocument()
    })
  })
})
