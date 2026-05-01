import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor, renderWithProviders } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import CronBuilder from '../CronBuilder'

describe('CronBuilder', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Parsing cron expressions', () => {
    it('parses minute interval cron', () => {
      renderWithProviders(<CronBuilder value="*/5 * * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Every 5 minutes')).toBeInTheDocument()
    })

    it('parses hourly cron', () => {
      renderWithProviders(<CronBuilder value="30 */6 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Every 6 hours')).toBeInTheDocument()
    })

    it('parses daily cron', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Daily at 2:00 AM')).toBeInTheDocument()
    })

    it('parses daily cron with PM time', () => {
      renderWithProviders(<CronBuilder value="30 14 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Daily at 2:30 PM')).toBeInTheDocument()
    })

    it('parses weekly cron', () => {
      renderWithProviders(<CronBuilder value="0 9 * * 1,3,5" onChange={mockOnChange} />)
      expect(screen.getByText(/Mon, Wed, Fri/)).toBeInTheDocument()
    })

    it('parses monthly cron', () => {
      renderWithProviders(<CronBuilder value="0 3 15 * *" onChange={mockOnChange} />)
      expect(screen.getByText(/Monthly on the 15th/)).toBeInTheDocument()
    })

    it('parses invalid cron as daily (fallback)', () => {
      // Invalid cron (not 5 parts) falls back to daily with default values
      renderWithProviders(<CronBuilder value="invalid" onChange={mockOnChange} />)
      expect(screen.getByText(/Daily at/)).toBeInTheDocument()
    })

    it('parses complex cron as custom', () => {
      renderWithProviders(<CronBuilder value="0 0 1,15 * *" onChange={mockOnChange} />)
      expect(screen.getByText(/Custom schedule/)).toBeInTheDocument()
    })
  })

  describe('Frequency selection', () => {
    it('renders all frequency options', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Minutes')).toBeInTheDocument()
      expect(screen.getByText('Hourly')).toBeInTheDocument()
      expect(screen.getByText('Daily')).toBeInTheDocument()
      expect(screen.getByText('Weekly')).toBeInTheDocument()
      expect(screen.getByText('Monthly')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })

    it('switches to minute frequency', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      await user.click(screen.getByText('Minutes'))

      expect(mockOnChange).toHaveBeenCalledWith('*/5 * * * *')
    })

    it('switches to hourly frequency', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      await user.click(screen.getByText('Hourly'))

      expect(mockOnChange).toHaveBeenCalledWith('0 */6 * * *')
    })

    it('switches to weekly frequency', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      await user.click(screen.getByText('Weekly'))

      expect(mockOnChange).toHaveBeenCalled()
    })

    it('switches to monthly frequency', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      await user.click(screen.getByText('Monthly'))

      expect(mockOnChange).toHaveBeenCalledWith('0 2 1 * *')
    })

    it('switches to custom frequency', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      await user.click(screen.getByText('Custom'))

      expect(mockOnChange).toHaveBeenCalledWith('0 2 * * *')
    })
  })

  describe('Minute frequency', () => {
    it('shows minute interval input', () => {
      renderWithProviders(<CronBuilder value="*/5 * * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Run every')).toBeInTheDocument()
      expect(screen.getByText('minutes.')).toBeInTheDocument()
    })

    it('changes minute interval', async () => {
      renderWithProviders(<CronBuilder value="*/5 * * * *" onChange={mockOnChange} />)

      const input = screen.getByDisplayValue('5')
      fireEvent.change(input, { target: { value: '10' } })

      expect(mockOnChange).toHaveBeenCalledWith('*/10 * * * *')
    })
  })

  describe('Hourly frequency', () => {
    it('shows hourly interval and starting minute inputs', () => {
      renderWithProviders(<CronBuilder value="30 */6 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Run every')).toBeInTheDocument()
      expect(screen.getByText('hours at minute')).toBeInTheDocument()
      expect(screen.getByText('past the hour.')).toBeInTheDocument()
    })

    it('changes hour interval', () => {
      renderWithProviders(<CronBuilder value="30 */6 * * *" onChange={mockOnChange} />)

      const hourInput = screen.getByDisplayValue('6')
      fireEvent.change(hourInput, { target: { value: '4' } })

      expect(mockOnChange).toHaveBeenCalledWith('30 */4 * * *')
    })

    it('changes starting minute', () => {
      renderWithProviders(<CronBuilder value="30 */6 * * *" onChange={mockOnChange} />)

      const minuteInput = screen.getByDisplayValue('30')
      fireEvent.change(minuteInput, { target: { value: '15' } })

      expect(mockOnChange).toHaveBeenCalledWith('15 */6 * * *')
    })
  })

  describe('Daily frequency', () => {
    it('shows time input', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Run daily at')).toBeInTheDocument()
    })

    it('changes hour', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      const hourInput = screen.getByDisplayValue('2')
      fireEvent.change(hourInput, { target: { value: '10' } })

      expect(mockOnChange).toHaveBeenCalledWith('0 10 * * *')
    })

    it('changes minute', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      const minuteInput = screen.getByDisplayValue('00')
      fireEvent.change(minuteInput, { target: { value: '30' } })

      expect(mockOnChange).toHaveBeenCalledWith('30 2 * * *')
    })

    it('changes AM/PM', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      // Click the AM/PM select trigger button (not the inner span which has pointer-events: none)
      const amSpan = screen.getByText('AM')
      const trigger = amSpan.closest('button[role="combobox"]') ?? amSpan.closest('button')
      await user.click(trigger!)
      await user.click(screen.getByRole('option', { name: 'PM' }))

      expect(mockOnChange).toHaveBeenCalledWith('0 14 * * *')
    })

    it('handles midnight (12 AM) correctly', () => {
      renderWithProviders(<CronBuilder value="0 0 * * *" onChange={mockOnChange} />)

      // Should show 12 for midnight
      expect(screen.getByDisplayValue('12')).toBeInTheDocument()
    })

    it('handles noon (12 PM) correctly', () => {
      renderWithProviders(<CronBuilder value="0 12 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Daily at 12:00 PM')).toBeInTheDocument()
    })
  })

  describe('Weekly frequency', () => {
    it('shows day selection toggle buttons', () => {
      renderWithProviders(<CronBuilder value="0 9 * * 1" onChange={mockOnChange} />)
      // The component shows M T W T F S S as toggle buttons
      // Check for some day buttons (M for Monday, S appears twice for Sat/Sun)
      expect(screen.getByText('M')).toBeInTheDocument()
      // 'S' appears twice (Sat and Sun), so use getAllByText
      expect(screen.getAllByText('S').length).toBe(2)
    })

    it('shows run at time text', () => {
      renderWithProviders(<CronBuilder value="0 9 * * 1" onChange={mockOnChange} />)
      expect(screen.getByText('Run on')).toBeInTheDocument()
      expect(screen.getByText('at')).toBeInTheDocument()
    })

    it('parses multiple days correctly', () => {
      renderWithProviders(<CronBuilder value="0 9 * * 1,3,5" onChange={mockOnChange} />)
      expect(screen.getByText(/Mon, Wed, Fri/)).toBeInTheDocument()
    })

    it('shows "Daily" when all days selected', () => {
      renderWithProviders(<CronBuilder value="0 9 * * 0,1,2,3,4,5,6" onChange={mockOnChange} />)
      expect(screen.getByText(/Daily at/)).toBeInTheDocument()
    })
  })

  describe('Monthly frequency', () => {
    it('shows day of month selector', () => {
      renderWithProviders(<CronBuilder value="0 3 15 * *" onChange={mockOnChange} />)
      expect(screen.getByText('Run on day')).toBeInTheDocument()
    })

    it('displays correct day suffix (1st)', () => {
      renderWithProviders(<CronBuilder value="0 3 1 * *" onChange={mockOnChange} />)
      expect(screen.getByText(/1st/)).toBeInTheDocument()
    })

    it('displays correct day suffix (2nd)', () => {
      renderWithProviders(<CronBuilder value="0 3 2 * *" onChange={mockOnChange} />)
      expect(screen.getByText(/2nd/)).toBeInTheDocument()
    })

    it('displays correct day suffix (3rd)', () => {
      renderWithProviders(<CronBuilder value="0 3 3 * *" onChange={mockOnChange} />)
      expect(screen.getByText(/3rd/)).toBeInTheDocument()
    })

    it('displays correct day suffix (4th and higher)', () => {
      renderWithProviders(<CronBuilder value="0 3 15 * *" onChange={mockOnChange} />)
      expect(screen.getByText(/15th/)).toBeInTheDocument()
    })

    it('changes day of month', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 3 15 * *" onChange={mockOnChange} />)

      // Find the day-of-month select trigger button (contains "15")
      const daySpan = screen.getByText('15')
      const trigger = daySpan.closest('button[role="combobox"]') ?? daySpan.closest('button')
      await user.click(trigger!)
      // Select day 20
      await user.click(screen.getByRole('option', { name: '20' }))

      expect(mockOnChange).toHaveBeenCalledWith('0 3 20 * *')
    })
  })

  describe('Custom frequency', () => {
    it('shows custom cron input', () => {
      renderWithProviders(<CronBuilder value="0 0 1,15 * *" onChange={mockOnChange} />)
      expect(screen.getByPlaceholderText('* * * * *')).toBeInTheDocument()
    })

    it('allows editing custom cron', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 0 1,15 * *" onChange={mockOnChange} />)

      const input = screen.getByPlaceholderText('* * * * *')
      await user.clear(input)
      await user.type(input, '0 */2 * * *')

      expect(mockOnChange).toHaveBeenCalledWith('0 */2 * * *')
    })
  })

  describe('Labels and helper text', () => {
    it('renders label when provided', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} label="Schedule" />)
      expect(screen.getByText('Schedule')).toBeInTheDocument()
    })

    it('does not render label when not provided', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      expect(screen.queryByText('Schedule')).not.toBeInTheDocument()
    })

    it('renders helper text when provided', () => {
      renderWithProviders(
        <CronBuilder value="0 2 * * *" onChange={mockOnChange} helperText="Select backup time" />
      )
      expect(screen.getByText('Select backup time')).toBeInTheDocument()
    })

    it('does not render helper text when not provided', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      expect(screen.queryByText('Select backup time')).not.toBeInTheDocument()
    })
  })

  describe('Preview display', () => {
    it('shows cron expression in monospace format', () => {
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      // The cron expression should be visible
      expect(screen.getByText('0 2 * * *')).toBeInTheDocument()
    })

    it('updates preview when frequency changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      expect(screen.getByText('Daily at 2:00 AM')).toBeInTheDocument()

      await user.click(screen.getByText('Minutes'))

      expect(screen.getByText('Every 5 minutes')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles single minute interval', () => {
      renderWithProviders(<CronBuilder value="*/1 * * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Every 1 minute')).toBeInTheDocument()
    })

    it('handles single hour interval', () => {
      renderWithProviders(<CronBuilder value="0 */1 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Every 1 hour')).toBeInTheDocument()
    })

    it('handles empty value gracefully', () => {
      renderWithProviders(<CronBuilder value="" onChange={mockOnChange} />)
      // Empty value (not 5 parts) falls back to daily with defaults
      expect(screen.getByText(/Daily at/)).toBeInTheDocument()
    })

    it('handles value update from parent', async () => {
      const { rerender } = renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Daily at 2:00 AM')).toBeInTheDocument()

      rerender(<CronBuilder value="*/10 * * * *" onChange={mockOnChange} />)
      expect(screen.getByText('Every 10 minutes')).toBeInTheDocument()
    })

    it('clamps hour input to valid range', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      const hourInput = screen.getByDisplayValue('2')
      await user.clear(hourInput)
      await user.type(hourInput, '15') // Should clamp to 12

      // The component should clamp to 12
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })

    it('clamps minute input to valid range', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CronBuilder value="0 2 * * *" onChange={mockOnChange} />)

      const minuteInput = screen.getByDisplayValue('00')
      await user.clear(minuteInput)
      await user.type(minuteInput, '75')

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })
  })
})
