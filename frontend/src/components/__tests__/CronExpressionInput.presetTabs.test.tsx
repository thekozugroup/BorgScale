import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import CronExpressionInput from '../CronExpressionInput'

// Stub the API so the live "next runs" fetch resolves predictably.
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          expression: '0 3 * * *',
          next_runs: ['2026-05-27T03:00:00', '2026-05-28T03:00:00', '2026-05-29T03:00:00'],
        },
      })
    ),
  },
}))

describe('CronExpressionInput preset tabs', () => {
  it('clicking Daily with the time set to 03:00 produces cron "0 3 * * *"', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<CronExpressionInput value="0 2 * * *" onChange={onChange} />)

    // Click the Daily preset tab — CronBuilder fires an onChange with the
    // current daily template.
    await user.click(screen.getByText('Daily'))

    // The CronBuilder maintains state internally; editing the hour input
    // updates the cron value. Find the two number inputs (hour/min).
    const numericInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[]
    // first numeric input is "hour" (12-hour clock), second is "minute"
    fireEvent.change(numericInputs[0], { target: { value: '3' } })

    // The last call should be a daily expression at 03:00 (24h) with the
    // CronBuilder's AM default → "0 3 * * *".
    expect(onChange.mock.calls.some((call) => call[0] === '0 3 * * *')).toBe(true)
  })

  it('renders a description containing "03:00" for the daily 3am preset', () => {
    renderWithProviders(<CronExpressionInput value="0 3 * * *" onChange={vi.fn()} />)
    const desc = screen.getByTestId('cron-description')
    expect(desc.textContent ?? '').toMatch(/03:00|3:00/)
  })
})
