import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import PruneSettingsInput from '../PruneSettingsInput'

describe('PruneSettingsInput', () => {
  const defaultValues = {
    keepHourly: 0,
    keepDaily: 7,
    keepWeekly: 4,
    keepMonthly: 6,
    keepQuarterly: 0,
    keepYearly: 1,
  }

  it('renders all six input fields with plain-English labels', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    expect(screen.getByLabelText(/Keep hourly backups for/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Keep daily backups for/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Keep weekly backups for/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Keep monthly backups for/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Keep quarterly backups for/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Keep yearly backups for/i)).toBeInTheDocument()
  })

  it('displays correct initial values', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    expect(screen.getByLabelText(/Keep hourly backups for/i)).toHaveValue(0)
    expect(screen.getByLabelText(/Keep daily backups for/i)).toHaveValue(7)
    expect(screen.getByLabelText(/Keep weekly backups for/i)).toHaveValue(4)
    expect(screen.getByLabelText(/Keep monthly backups for/i)).toHaveValue(6)
    expect(screen.getByLabelText(/Keep quarterly backups for/i)).toHaveValue(0)
    expect(screen.getByLabelText(/Keep yearly backups for/i)).toHaveValue(1)
  })

  it('calls onChange when hourly value changes', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    const hourlyInput = screen.getByLabelText(/Keep hourly backups for/i)
    fireEvent.change(hourlyInput, { target: { value: '24' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValues,
      keepHourly: 24,
    })
  })

  it('calls onChange when daily value changes', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    const dailyInput = screen.getByLabelText(/Keep daily backups for/i)
    fireEvent.change(dailyInput, { target: { value: '14' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValues,
      keepDaily: 14,
    })
  })

  it('prevents negative values', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    const dailyInput = screen.getByLabelText(/Keep daily backups for/i)
    fireEvent.change(dailyInput, { target: { value: '-5' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValues,
      keepDaily: 0, // Should be clamped to 0
    })
  })

  it('handles invalid input gracefully', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    const weeklyInput = screen.getByLabelText(/Keep weekly backups for/i)
    fireEvent.change(weeklyInput, { target: { value: 'invalid' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValues,
      keepWeekly: 0, // Should default to 0 for invalid input
    })
  })

  it('disables all inputs when disabled prop is true', () => {
    const onChange = vi.fn()
    renderWithProviders(
      <PruneSettingsInput values={defaultValues} onChange={onChange} disabled={true} />
    )

    expect(screen.getByLabelText(/Keep hourly backups for/i)).toBeDisabled()
    expect(screen.getByLabelText(/Keep daily backups for/i)).toBeDisabled()
    expect(screen.getByLabelText(/Keep weekly backups for/i)).toBeDisabled()
    expect(screen.getByLabelText(/Keep monthly backups for/i)).toBeDisabled()
    expect(screen.getByLabelText(/Keep quarterly backups for/i)).toBeDisabled()
    expect(screen.getByLabelText(/Keep yearly backups for/i)).toBeDisabled()
  })

  it('displays helper text for each field', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    expect(screen.getByText(/Number of hourly snapshots to retain/i)).toBeInTheDocument()
    expect(screen.getByText(/Number of daily snapshots to retain/i)).toBeInTheDocument()
    expect(screen.getByText(/Number of weekly snapshots to retain/i)).toBeInTheDocument()
    expect(screen.getByText(/Number of monthly snapshots to retain/i)).toBeInTheDocument()
    expect(screen.getByText(/Number of quarterly snapshots/i)).toBeInTheDocument()
    expect(screen.getByText(/Number of yearly snapshots to retain/i)).toBeInTheDocument()
  })

  it('renders the "snapshots" suffix next to each input', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    // Six fields, each with the suffix
    expect(screen.getAllByText('snapshots').length).toBe(6)
  })

  it('handles zero values correctly', () => {
    const onChange = vi.fn()
    const allZeroValues = {
      keepHourly: 0,
      keepDaily: 0,
      keepWeekly: 0,
      keepMonthly: 0,
      keepQuarterly: 0,
      keepYearly: 0,
    }

    renderWithProviders(<PruneSettingsInput values={allZeroValues} onChange={onChange} />)

    Object.values(screen.getAllByRole('spinbutton')).forEach((input) => {
      expect(input).toHaveValue(0)
    })
  })

  it('handles large values correctly', () => {
    const onChange = vi.fn()
    renderWithProviders(<PruneSettingsInput values={defaultValues} onChange={onChange} />)

    const yearlyInput = screen.getByLabelText(/Keep yearly backups for/i)
    fireEvent.change(yearlyInput, { target: { value: '999' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValues,
      keepYearly: 999,
    })
  })
})
