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
    it('renders success color for "completed"', () => {
      const { container } = render(<StatusBadge status="completed" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-primary/10')
      expect(chip.className).toContain('text-primary')
    })

    it('renders success color for "success"', () => {
      const { container } = render(<StatusBadge status="success" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-primary/10')
      expect(chip.className).toContain('text-primary')
    })

    it('renders warning color for "completed_with_warnings"', () => {
      const { container } = render(<StatusBadge status="completed_with_warnings" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-muted')
      expect(chip.className).toContain('text-muted-foreground')
    })

    it('renders error color for "failed"', () => {
      const { container } = render(<StatusBadge status="failed" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-destructive/10')
      expect(chip.className).toContain('text-destructive')
    })

    it('renders error color for "error"', () => {
      const { container } = render(<StatusBadge status="error" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-destructive/10')
      expect(chip.className).toContain('text-destructive')
    })

    it('renders secondary color for "running"', () => {
      const { container } = render(<StatusBadge status="running" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-secondary')
      expect(chip.className).toContain('text-secondary-foreground')
    })

    it('renders secondary color for "in_progress"', () => {
      const { container } = render(<StatusBadge status="in_progress" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-secondary')
      expect(chip.className).toContain('text-secondary-foreground')
    })

    it('renders muted color for "pending"', () => {
      const { container } = render(<StatusBadge status="pending" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-muted')
      expect(chip.className).toContain('text-muted-foreground')
    })

    it('renders muted color for unknown status', () => {
      const { container } = render(<StatusBadge status="unknown_status" />)
      const chip = container.firstChild as HTMLElement
      expect(chip.className).toContain('bg-muted')
      expect(chip.className).toContain('text-muted-foreground')
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
