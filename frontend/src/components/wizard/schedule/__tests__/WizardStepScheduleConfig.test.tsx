import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import WizardStepScheduleConfig from '../WizardStepScheduleConfig'

// Mock the live preview API used by CronExpressionInput
vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          expression: '0 2 * * *',
          next_runs: ['2026-05-27T02:00:00', '2026-05-28T02:00:00', '2026-05-29T02:00:00'],
        },
      })
    ),
  },
}))

// Mock cron-parser used by the wizard for its inline tooltip
vi.mock('cron-parser', () => ({
  default: {
    parse: vi.fn((expr: string) => {
      if (expr === 'invalid') {
        throw new Error('Invalid cron expression')
      }
      return {
        next: vi.fn(() => ({
          toDate: vi.fn(() => new Date('2024-01-01T02:00:00')),
        })),
      }
    }),
  },
}))

describe('WizardStepScheduleConfig', () => {
  const defaultData = {
    cronExpression: '0 2 * * *',
    archiveNameTemplate: '{job_name}-{now}',
  }

  const defaultProps = {
    data: defaultData,
    jobName: 'test-job',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the preset tabs (presets-primary UI) by default', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.getByTestId('cron-preset-tabs')).toBeInTheDocument()
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByText('Weekly')).toBeInTheDocument()
  })

  it('renders the Backup schedule label', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.getByText(/Backup schedule/i)).toBeInTheDocument()
  })

  it('hides the raw cron text input behind the Advanced disclosure', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.queryByPlaceholderText('0 2 * * *')).not.toBeInTheDocument()
    expect(screen.getByText(/Custom schedule \(cron syntax\)/i)).toBeInTheDocument()
  })

  it('exposes the raw cron input only after opening the Advanced disclosure', async () => {
    const user = userEvent.setup()
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)

    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    expect(raw).toBeInTheDocument()
    expect((raw as HTMLInputElement).value).toBe('0 2 * * *')
  })

  it('calls onChange when the raw cron input is edited via Advanced', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    fireEvent.change(raw, { target: { value: '0 0 * * 0' } })
    expect(onChange).toHaveBeenCalledWith({ cronExpression: '0 0 * * 0' })
  })

  it('renders the archive-name "Files will be named:" preview by default', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.getByTestId('archive-name-preview-intro')).toBeInTheDocument()
  })

  it('hides the archive-name template syntax behind its Advanced disclosure', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.queryByLabelText(/Archive Name Template/i)).not.toBeInTheDocument()
  })

  it('opens the archive-name Advanced disclosure when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    await user.click(screen.getByText(/Customize archive naming \(advanced\)/i))
    const templateInput = screen.getByLabelText(/Archive Name Template/i)
    expect(templateInput).toBeInTheDocument()
    expect((templateInput as HTMLInputElement).value).toBe('{job_name}-{now}')
  })

  it('calls onChange when archive-name template is edited via Advanced', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByText(/Customize archive naming \(advanced\)/i))
    const templateInput = screen.getByLabelText(/Archive Name Template/i)
    fireEvent.change(templateInput, { target: { value: '{job_name}-{date}' } })
    expect(onChange).toHaveBeenCalledWith({ archiveNameTemplate: '{job_name}-{date}' })
  })

  it('displays "Next 3 Run Times" tooltip text for a valid cron expression', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.getByText(/Next 3 Run Times:/i)).toBeInTheDocument()
  })

  it('does not display the wizard tooltip for an invalid cron expression', () => {
    const invalidData = { ...defaultData, cronExpression: 'invalid' }
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} data={invalidData} />)
    expect(screen.queryByText(/Next 3 Run Times:/i)).not.toBeInTheDocument()
  })

  it('uses jobName in the archive-name preview', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} jobName="my-custom-job" />)
    expect(screen.getByText(/my-custom-job/)).toBeInTheDocument()
  })

  it('falls back to example-job when jobName is empty', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} jobName="" />)
    expect(screen.getByText(/example-job/)).toBeInTheDocument()
  })

  it('handles empty cron expression by closing the disclosure (empty matches preset)', () => {
    const emptyData = { ...defaultData, cronExpression: '' }
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} data={emptyData} />)
    // Empty value is treated as preset-matching
    expect(screen.queryByPlaceholderText('0 2 * * *')).not.toBeInTheDocument()
  })

  it('handles empty archive name template by still rendering preview', () => {
    const emptyData = { ...defaultData, archiveNameTemplate: '' }
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} data={emptyData} />)
    expect(screen.getByTestId('archive-name-preview-intro')).toBeInTheDocument()
  })

  it('shows the inline info icon tooltip for next run times', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    const tooltip = screen.getByLabelText(/Next 3 Run Times:/i)
    expect(tooltip).toBeInTheDocument()
  })

  it('formats first run time with localeString inline', () => {
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    const dates = screen.getAllByText(/1\/1\/2024/i)
    expect(dates.length).toBeGreaterThanOrEqual(1)
  })

  it('updates the wizard tooltip when cron expression becomes invalid', () => {
    const { rerender } = renderWithProviders(<WizardStepScheduleConfig {...defaultProps} />)
    expect(screen.getByText(/Next 3 Run Times:/i)).toBeInTheDocument()

    const newData = { ...defaultData, cronExpression: 'invalid' }
    rerender(<WizardStepScheduleConfig {...defaultProps} data={newData} />)
    expect(screen.queryByText(/Next 3 Run Times:/i)).not.toBeInTheDocument()
  })

  it('supports multiple onChange calls in sequence', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<WizardStepScheduleConfig {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByText(/Custom schedule \(cron syntax\)/i))
    const raw = screen.getByPlaceholderText('0 2 * * *')
    fireEvent.change(raw, { target: { value: '0 3 * * *' } })

    await user.click(screen.getByText(/Customize archive naming \(advanced\)/i))
    const templateInput = screen.getByLabelText(/Archive Name Template/i)
    fireEvent.change(templateInput, { target: { value: '{date}-backup' } })

    expect(onChange).toHaveBeenCalledWith({ cronExpression: '0 3 * * *' })
    expect(onChange).toHaveBeenCalledWith({ archiveNameTemplate: '{date}-backup' })
  })
})
