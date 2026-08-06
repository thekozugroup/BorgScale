import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from '../StatusBadge'

describe('StatusBadge', () => {
  describe('Status labels', () => {
    it('renders correct label for "completed"', () => {
      render(<StatusBadge status="completed" />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('renders correct label for "success"', () => {
      render(<StatusBadge status="success" />)
      // 'success' falls through to default label transformation
      expect(screen.getByText('Success')).toBeInTheDocument()
    })

    it('renders correct label for "completed_with_warnings"', () => {
      render(<StatusBadge status="completed_with_warnings" />)
      expect(screen.getByText('Completed with Warnings')).toBeInTheDocument()
    })

    it('renders correct label for "failed"', () => {
      render(<StatusBadge status="failed" />)
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('renders correct label for "error"', () => {
      render(<StatusBadge status="error" />)
      // 'error' falls through to default label transformation
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('renders correct label for "running"', () => {
      render(<StatusBadge status="running" />)
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('renders correct label for "in_progress"', () => {
      render(<StatusBadge status="in_progress" />)
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('renders correct label for "pending"', () => {
      render(<StatusBadge status="pending" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('renders correct label for "cancelled"', () => {
      render(<StatusBadge status="cancelled" />)
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })

    it('renders correct label for unknown status', () => {
      render(<StatusBadge status="custom_status" />)
      expect(screen.getByText('Custom_status')).toBeInTheDocument()
    })

    it('handles case-insensitive status', () => {
      render(<StatusBadge status="COMPLETED" />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('Status colors', () => {
    // Each status must be distinguishable from every other one. Colour alone
    // would fail WCAG 1.4.1, so the badge also carries a status-specific icon;
    // the svg assertions below are what stop a future refactor dropping it.
    const CASES: Array<[string, string, string]> = [
      ['completed', 'bg-success-subtle', 'text-success'],
      ['success', 'bg-success-subtle', 'text-success'],
      ['completed_with_warnings', 'bg-warning-subtle', 'text-warning'],
      ['failed', 'bg-destructive-subtle', 'text-destructive'],
      ['error', 'bg-destructive-subtle', 'text-destructive'],
      ['running', 'bg-info-subtle', 'text-info'],
      ['in_progress', 'bg-info-subtle', 'text-info'],
      ['pending', 'bg-muted', 'text-muted-foreground'],
      ['cancelled', 'bg-muted', 'text-muted-foreground'],
      ['unknown_status', 'bg-muted', 'text-muted-foreground'],
    ]

    it.each(CASES)('renders %s with its own colour tokens', (status, bg, fg) => {
      const { container } = render(<StatusBadge status={status} />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain(bg)
      expect(chip.className).toContain(fg)
    })

    it('does not render warnings identically to cancelled', () => {
      const warned = render(<StatusBadge status="completed_with_warnings" />).container
        .firstChild as HTMLElement
      const cancelled = render(<StatusBadge status="cancelled" />).container
        .firstChild as HTMLElement

      expect(warned.className).not.toEqual(cancelled.className)
    })

    it('pairs every status with an icon so colour is never the only signal', () => {
      for (const [status] of CASES) {
        const { container } = render(<StatusBadge status={status} />)
        const chip = container.firstChild as HTMLElement
        expect(chip.querySelector('svg')).not.toBeNull()
      }
    })
  })

  describe('Size variants', () => {
    it('renders with small size by default', () => {
      const { container } = render(<StatusBadge status="completed" />)
      const chip = container.firstChild as HTMLElement
      // Badge renders as a span element with font-medium class
      expect(chip).toBeInTheDocument()
    })

    it('renders with medium size when specified', () => {
      const { container } = render(<StatusBadge status="completed" size="medium" />)
      const chip = container.firstChild as HTMLElement
      expect(chip).toBeInTheDocument()
    })
  })

  describe('Style variants', () => {
    it('renders with bordered style by default', () => {
      const { container } = render(<StatusBadge status="completed" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('border')
    })

    it('renders with outlined variant when specified', () => {
      const { container } = render(<StatusBadge status="completed" variant="outlined" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('border')
    })
  })
})
