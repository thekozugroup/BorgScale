import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { screen, act, renderWithProviders } from '../../../test/test-utils'
import WizardStepIndicator from '../WizardStepIndicator'
import { FolderOpen, Database, Shield, Settings, CheckCircle } from 'lucide-react'

// Helpers to simulate mobile / desktop viewport via window.matchMedia
function mockMediaQuery(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  return {
    matches,
    addEventListener: (_: string, handler: (e: { matches: boolean }) => void) => {
      listeners.push(handler)
    },
    removeEventListener: (_: string, handler: (e: { matches: boolean }) => void) => {
      const idx = listeners.indexOf(handler)
      if (idx !== -1) listeners.splice(idx, 1)
    },
  }
}

const mockSteps = [
  { key: 'location', label: 'Location', icon: <FolderOpen size={14} /> },
  { key: 'source', label: 'Source', icon: <Database size={14} /> },
  { key: 'security', label: 'Security', icon: <Shield size={14} /> },
  { key: 'config', label: 'Config', icon: <Settings size={14} /> },
  { key: 'review', label: 'Review', icon: <CheckCircle size={14} /> },
]

describe('WizardStepIndicator', () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn>

  describe('Desktop layout (md+)', () => {
    beforeEach(() => {
      matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(() =>
        mockMediaQuery(false) as unknown as MediaQueryList
      )
    })

    afterEach(() => {
      matchMediaSpy.mockRestore()
    })

    describe('Rendering', () => {
      it('renders all step labels', () => {
        renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={0} />)

        expect(screen.getByText('Location')).toBeInTheDocument()
        expect(screen.getByText('Source')).toBeInTheDocument()
        expect(screen.getByText('Security')).toBeInTheDocument()
        expect(screen.getByText('Config')).toBeInTheDocument()
        expect(screen.getByText('Review')).toBeInTheDocument()
      })

      it('renders step numbers', () => {
        renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={0} />)

        expect(screen.getByText('1.')).toBeInTheDocument()
        expect(screen.getByText('2.')).toBeInTheDocument()
        expect(screen.getByText('3.')).toBeInTheDocument()
        expect(screen.getByText('4.')).toBeInTheDocument()
        expect(screen.getByText('5.')).toBeInTheDocument()
      })

      it('renders with fewer steps', () => {
        const threeSteps = mockSteps.slice(0, 3)
        renderWithProviders(<WizardStepIndicator steps={threeSteps} currentStep={0} />)

        expect(screen.getByText('Location')).toBeInTheDocument()
        expect(screen.getByText('Source')).toBeInTheDocument()
        expect(screen.getByText('Security')).toBeInTheDocument()
        expect(screen.queryByText('Config')).not.toBeInTheDocument()
        expect(screen.queryByText('Review')).not.toBeInTheDocument()
      })
    })

    describe('Navigation', () => {
      it('calls onStepClick when a step is clicked', async () => {
        const user = userEvent.setup()
        const onStepClick = vi.fn()

        renderWithProviders(
          <WizardStepIndicator steps={mockSteps} currentStep={0} onStepClick={onStepClick} />
        )

        await user.click(screen.getByText('Security'))

        expect(onStepClick).toHaveBeenCalledWith(2)
      })

      it('calls onStepClick with correct index for each step', async () => {
        const user = userEvent.setup()
        const onStepClick = vi.fn()

        renderWithProviders(
          <WizardStepIndicator steps={mockSteps} currentStep={0} onStepClick={onStepClick} />
        )

        await user.click(screen.getByText('Review'))
        expect(onStepClick).toHaveBeenCalledWith(4)

        await user.click(screen.getByText('Source'))
        expect(onStepClick).toHaveBeenCalledWith(1)

        await user.click(screen.getByText('Config'))
        expect(onStepClick).toHaveBeenCalledWith(3)
      })

      it('allows clicking on any step regardless of current position', async () => {
        const user = userEvent.setup()
        const onStepClick = vi.fn()

        renderWithProviders(
          <WizardStepIndicator steps={mockSteps} currentStep={0} onStepClick={onStepClick} />
        )

        await user.click(screen.getByText('Review'))
        expect(onStepClick).toHaveBeenCalledWith(4)
      })

      it('allows clicking back to previous steps', async () => {
        const user = userEvent.setup()
        const onStepClick = vi.fn()

        renderWithProviders(
          <WizardStepIndicator steps={mockSteps} currentStep={4} onStepClick={onStepClick} />
        )

        await user.click(screen.getByText('Location'))
        expect(onStepClick).toHaveBeenCalledWith(0)
      })
    })

    describe('Theme Support', () => {
      it('renders in light mode', () => {
        renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={0} />)
        expect(screen.getByText('Location')).toBeInTheDocument()
      })

      it('renders in dark mode', () => {
        renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={0} />)
        expect(screen.getByText('Location')).toBeInTheDocument()
      })
    })

    describe('Current Step Highlighting', () => {
      it('highlights the current step', () => {
        renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={2} />)
        expect(screen.getByText('Security')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile layout (< md)', () => {
    beforeEach(() => {
      matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(() =>
        mockMediaQuery(true) as unknown as MediaQueryList
      )
    })

    afterEach(() => {
      matchMediaSpy.mockRestore()
    })

    it('shows "Step X / N" counter', () => {
      renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={1} />)
      expect(screen.getByText('Step 2 / 5')).toBeInTheDocument()
    })

    it('shows the active step label', () => {
      renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={2} />)
      // "Security" is the label for step index 2
      expect(screen.getByText('Security')).toBeInTheDocument()
    })

    it('does not show non-active step labels', () => {
      renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={2} />)
      expect(screen.queryByText('Location')).not.toBeInTheDocument()
      expect(screen.queryByText('Source')).not.toBeInTheDocument()
      expect(screen.queryByText('Config')).not.toBeInTheDocument()
      expect(screen.queryByText('Review')).not.toBeInTheDocument()
    })

    it('renders a clickable circle for each step', async () => {
      const user = userEvent.setup()
      const onStepClick = vi.fn()

      renderWithProviders(
        <WizardStepIndicator steps={mockSteps} currentStep={0} onStepClick={onStepClick} />
      )

      await user.click(screen.getByTestId('step-circle-security'))
      expect(onStepClick).toHaveBeenCalledWith(2)
    })

    it('updates the step counter when currentStep changes', () => {
      const { rerender } = renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={0} />)
      expect(screen.getByText('Step 1 / 5')).toBeInTheDocument()

      act(() => {
        rerender(<WizardStepIndicator steps={mockSteps} currentStep={4} />)
      })
      expect(screen.getByText('Step 5 / 5')).toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    })

    it('renders in dark mode', () => {
      renderWithProviders(<WizardStepIndicator steps={mockSteps} currentStep={0} />)
      expect(screen.getByText('Step 1 / 5')).toBeInTheDocument()
      expect(screen.getByText('Location')).toBeInTheDocument()
    })
  })
})
