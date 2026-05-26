import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import CronExpressionInput from '../CronExpressionInput'
import { cronMatchesPreset } from '../cronPresets'

// Stub the API so the live "next runs" fetch resolves predictably.
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          expression: '0 2 * * *',
          next_runs: [
            '2026-05-27T02:00:00',
            '2026-05-28T02:00:00',
            '2026-05-29T02:00:00',
          ],
        },
      }),
    ),
  },
}))

describe('CronExpressionInput', () => {
  const defaultProps = {
    value: '0 2 * * *',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    defaultProps.onChange = vi.fn()
  })

  it('renders the preset tabs by default (presets-primary UI)', () => {
    renderWithProviders(<CronExpressionInput {...defaultProps} />)

    expect(screen.getByTestId('cron-preset-tabs')).toBeInTheDocument()
    expect(screen.getByText('Minutes')).toBeInTheDocument()
    expect(screen.getByText('Hourly')).toBeInTheDocument()
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByText('Weekly')).toBeInTheDocument()
    expect(screen.getByText('Monthly')).toBeInTheDocument()
  })

  it('renders the default Schedule label when none is supplied', () => {
    renderWithProviders(<CronExpressionInput {...defaultProps} />)
    expect(screen.getByText(/^Schedule$/)).toBeInTheDocument()
  })

  it('renders a custom label when provided', () => {
    renderWithProviders(
      <CronExpressionInput {...defaultProps} label="Custom Schedule Label" />,
    )
    expect(screen.getByText(/Custom Schedule Label/i)).toBeInTheDocument()
  })

  it('marks the input as required when required is set (raw input visible)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CronExpressionInput {...defaultProps} required />)
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw).toBeRequired()
  })

  it('disables the raw input when disabled prop is true', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CronExpressionInput {...defaultProps} disabled />)
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw).toBeDisabled()
  })

  it('hides the raw cron text input until the Advanced disclosure is toggled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CronExpressionInput {...defaultProps} />)

    expect(screen.queryByPlaceholderText('0 2 * * *')).not.toBeInTheDocument()

    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw).toBeInTheDocument()
    expect(raw).toHaveValue('0 2 * * *')
  })

  it('force-opens the Advanced disclosure when the value does not match any preset', () => {
    renderWithProviders(
      <CronExpressionInput value="0 0 1,15 * *" onChange={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('0 2 * * *')).toBeInTheDocument()
  })

  it('renders a cronstrue description for the current value', () => {
    renderWithProviders(<CronExpressionInput {...defaultProps} />)
    const desc = screen.getByTestId('cron-description')
    expect(desc.textContent ?? '').toMatch(/02:00|2:00/i)
  })

  it('shows helper text inside the Advanced disclosure when provided', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CronExpressionInput {...defaultProps} helperText="Custom helper text" />,
    )
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    expect(screen.getByText(/Custom helper text/i)).toBeInTheDocument()
  })

  it('calls onChange when the raw input is edited via Advanced', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<CronExpressionInput {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    fireEvent.change(raw, { target: { value: '0 0 * * 0' } })

    expect(onChange).toHaveBeenCalledWith('0 0 * * 0')
  })

  it('handles complex cron expressions via the Advanced raw input', () => {
    const onChange = vi.fn()
    renderWithProviders(<CronExpressionInput value="0 0 1,15 * *" onChange={onChange} />)
    // Force-open because the value is non-preset
    const raw = screen.getByPlaceholderText('0 2 * * *')
    fireEvent.change(raw, { target: { value: '*/15 9-17 * * 1-5' } })
    expect(onChange).toHaveBeenCalledWith('*/15 9-17 * * 1-5')
  })

  it('handles empty string value gracefully', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<CronExpressionInput value="" onChange={onChange} />)
    // Empty value is treated as "matching a preset" so disclosure is closed
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw).toHaveValue('')
    fireEvent.change(raw, { target: { value: '* * * * *' } })
    expect(onChange).toHaveBeenCalledWith('* * * * *')
  })

  it('applies the small font size class when size="small"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CronExpressionInput {...defaultProps} size="small" />)
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw.className).toContain('text-sm')
  })

  it('applies the medium font size class by default', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CronExpressionInput {...defaultProps} />)
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw.className).toContain('text-lg')
  })

  it('applies monospace font styling to the raw input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CronExpressionInput {...defaultProps} />)
    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw).toHaveClass('font-mono')
  })

  it('wraps the whole control in a full-width container', () => {
    const { container } = renderWithProviders(<CronExpressionInput {...defaultProps} />)
    expect(container.querySelector('.w-full')).toBeInTheDocument()
  })

  it('exposes cronMatchesPreset helper that recognises preset shapes', () => {
    expect(cronMatchesPreset('0 2 * * *')).toBe(true) // daily
    expect(cronMatchesPreset('*/5 * * * *')).toBe(true) // every-N-minutes
    expect(cronMatchesPreset('0 3 * * 1,3,5')).toBe(true) // weekly
    expect(cronMatchesPreset('0 3 15 * *')).toBe(true) // monthly
    expect(cronMatchesPreset('30 */6 * * *')).toBe(true) // hourly
    expect(cronMatchesPreset('0 0 1,15 * *')).toBe(false) // complex day list
    expect(cronMatchesPreset('not a cron')).toBe(false)
    expect(cronMatchesPreset('')).toBe(true)
  })
})
