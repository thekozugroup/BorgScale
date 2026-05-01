import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import ArchiveNameTemplateInput from '../ArchiveNameTemplateInput'

describe('ArchiveNameTemplateInput', () => {
  const defaultProps = {
    value: '{job_name}-{now}',
    onChange: vi.fn(),
  }

  it('renders with default template', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('{job_name}-{now}')
  })

  it('calls onChange when template changes', () => {
    const onChange = vi.fn()
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    fireEvent.change(input, { target: { value: '{job_name}-{date}' } })

    expect(onChange).toHaveBeenCalledWith('{job_name}-{date}')
  })

  it('displays placeholder information in helper text', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    expect(
      screen.getByText(/Available placeholders: {job_name}, {now}, {date}, {time}, {timestamp}/i)
    ).toBeInTheDocument()
  })

  it('shows preview alert when value is provided', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    expect(screen.getByText(/Preview:/i)).toBeInTheDocument()
  })

  it('does not show preview alert when value is empty', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="" onChange={vi.fn()} />)

    expect(screen.queryByText(/Preview:/i)).not.toBeInTheDocument()
  })

  it('generates preview with job_name placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{job_name}-backup" onChange={vi.fn()} />)

    const preview = screen.getByText(/example-job-backup/i)
    expect(preview).toBeInTheDocument()
  })

  it('generates preview with custom job name', () => {
    renderWithProviders(
      <ArchiveNameTemplateInput
        value="{job_name}-archive"
        onChange={vi.fn()}
        jobName="my-custom-job"
      />
    )

    const preview = screen.getByText(/my-custom-job-archive/i)
    expect(preview).toBeInTheDocument()
  })

  it('generates preview with date placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{date}" onChange={vi.fn()} />)

    // Date format should be YYYY-MM-DD
    const preview = screen.getByText(/\d{4}-\d{2}-\d{2}/)
    expect(preview).toBeInTheDocument()
  })

  it('generates preview with time placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{time}" onChange={vi.fn()} />)

    // Time format should be HH-MM-SS
    const preview = screen.getByText(/\d{2}-\d{2}-\d{2}/)
    expect(preview).toBeInTheDocument()
  })

  it('generates preview with timestamp placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{timestamp}" onChange={vi.fn()} />)

    // Timestamp should be a number
    const preview = screen.getByText(/\d+/)
    expect(preview).toBeInTheDocument()
  })

  it('generates preview with now placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{now}" onChange={vi.fn()} />)

    // Now format should be ISO string with replacements
    const preview = screen.getByText(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
    expect(preview).toBeInTheDocument()
  })

  it('generates preview with multiple placeholders', () => {
    renderWithProviders(
      <ArchiveNameTemplateInput
        value="{job_name}-{date}-{time}"
        onChange={vi.fn()}
        jobName="test-job"
      />
    )

    const preview = screen.getByText(/test-job-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/)
    expect(preview).toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} disabled />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toBeDisabled()
  })

  it('applies small size when size prop is small', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} size="small" />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toBeInTheDocument()
  })

  it('applies medium size by default', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toBeInTheDocument()
  })

  it('uses default job name when not provided', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{job_name}" onChange={vi.fn()} />)

    const preview = screen.getByText(/example-job/)
    expect(preview).toBeInTheDocument()
  })

  it('handles empty template value', () => {
    const onChange = vi.fn()
    renderWithProviders(<ArchiveNameTemplateInput value="" onChange={onChange} />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toHaveValue('')

    fireEvent.change(input, { target: { value: '{job_name}' } })
    expect(onChange).toHaveBeenCalledWith('{job_name}')
  })

  it('applies monospace font styling', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    const input = screen.getByLabelText(/Archive Name Template/i)
    // shadcn Input uses font-mono class
    expect(input).toHaveClass('font-mono')
  })

  it('handles template with no placeholders', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="static-archive-name" onChange={vi.fn()} />)

    const preview = screen.getByText(/static-archive-name/)
    expect(preview).toBeInTheDocument()
  })

  it('updates preview when value changes', () => {
    const { rerender } = renderWithProviders(
      <ArchiveNameTemplateInput value="{job_name}-v1" onChange={vi.fn()} />
    )

    expect(screen.getByText(/example-job-v1/)).toBeInTheDocument()

    rerender(<ArchiveNameTemplateInput value="{job_name}-v2" onChange={vi.fn()} />)

    expect(screen.getByText(/example-job-v2/)).toBeInTheDocument()
  })
})
