import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import ArchiveNameTemplateInput from '../ArchiveNameTemplateInput'

describe('ArchiveNameTemplateInput', () => {
  const defaultProps = {
    value: '{job_name}-{now}',
    onChange: vi.fn(),
  }

  const openAdvanced = async () => {
    const user = userEvent.setup()
    await user.click(screen.getByText(/Customize archive naming \(advanced\)/i))
  }

  it('renders the always-visible "Files will be named:" preview line', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    expect(screen.getByTestId('archive-name-preview-intro')).toBeInTheDocument()
    expect(screen.getByText(/Files will be named:/i)).toBeInTheDocument()
  })

  it('hides the placeholder syntax hint by default; reveals it after toggling Advanced', async () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    expect(screen.queryByText(/Available placeholders:/i)).not.toBeInTheDocument()

    await openAdvanced()

    expect(
      screen.getByText(/Available placeholders: {job_name}, {now}, {date}, {time}, {timestamp}/i)
    ).toBeInTheDocument()
  })

  it('hides the raw template input by default; shows it after Advanced is opened', async () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)

    expect(screen.queryByLabelText(/Archive Name Template/i)).not.toBeInTheDocument()

    await openAdvanced()

    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('{job_name}-{now}')
  })

  it('calls onChange when the template input is edited', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} onChange={onChange} />)
    await openAdvanced()
    const input = screen.getByLabelText(/Archive Name Template/i)
    fireEvent.change(input, { target: { value: '{job_name}-{date}' } })
    expect(onChange).toHaveBeenCalledWith('{job_name}-{date}')
  })

  it('generates preview with job_name placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{job_name}-backup" onChange={vi.fn()} />)
    expect(screen.getByText(/example-job-backup/)).toBeInTheDocument()
  })

  it('generates preview with custom job name', () => {
    renderWithProviders(
      <ArchiveNameTemplateInput
        value="{job_name}-archive"
        onChange={vi.fn()}
        jobName="my-custom-job"
      />
    )
    expect(screen.getByText(/my-custom-job-archive/)).toBeInTheDocument()
  })

  it('generates preview with date placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{date}" onChange={vi.fn()} />)
    expect(screen.getByText(/\d{4}-\d{2}-\d{2}/)).toBeInTheDocument()
  })

  it('generates preview with time placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{time}" onChange={vi.fn()} />)
    expect(screen.getByText(/\d{2}-\d{2}-\d{2}/)).toBeInTheDocument()
  })

  it('generates preview with timestamp placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{timestamp}" onChange={vi.fn()} />)
    expect(screen.getByText(/\d+/)).toBeInTheDocument()
  })

  it('generates preview with now placeholder', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{now}" onChange={vi.fn()} />)
    expect(screen.getByText(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)).toBeInTheDocument()
  })

  it('generates preview with multiple placeholders', () => {
    renderWithProviders(
      <ArchiveNameTemplateInput
        value="{job_name}-{date}-{time}"
        onChange={vi.fn()}
        jobName="test-job"
      />
    )
    expect(screen.getByText(/test-job-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}/)).toBeInTheDocument()
  })

  it('disables the input when disabled prop is true (after opening Advanced)', async () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} disabled />)
    await openAdvanced()
    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toBeDisabled()
  })

  it('uses the default {job_name}-{timestamp} template for the preview when value is empty', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="" onChange={vi.fn()} />)
    // Preview line still renders because we fall back to the default template
    expect(screen.getByTestId('archive-name-preview-intro')).toBeInTheDocument()
    expect(screen.getByText(/example-job-\d+/)).toBeInTheDocument()
  })

  it('uses default job name when not provided', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="{job_name}" onChange={vi.fn()} />)
    expect(screen.getByText(/example-job/)).toBeInTheDocument()
  })

  it('handles template with no placeholders', () => {
    renderWithProviders(<ArchiveNameTemplateInput value="static-archive-name" onChange={vi.fn()} />)
    expect(screen.getByText(/static-archive-name/)).toBeInTheDocument()
  })

  it('updates preview when value changes', () => {
    const { rerender } = renderWithProviders(
      <ArchiveNameTemplateInput value="{job_name}-v1" onChange={vi.fn()} />
    )
    expect(screen.getByText(/example-job-v1/)).toBeInTheDocument()

    rerender(<ArchiveNameTemplateInput value="{job_name}-v2" onChange={vi.fn()} />)
    expect(screen.getByText(/example-job-v2/)).toBeInTheDocument()
  })

  it('shows the Advanced disclosure toggle by default', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)
    expect(screen.getByText(/Customize archive naming \(advanced\)/i)).toBeInTheDocument()
  })

  it('renders monospace styling on the raw input (after opening Advanced)', async () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)
    await openAdvanced()
    const input = screen.getByLabelText(/Archive Name Template/i)
    expect(input).toHaveClass('font-mono')
  })

  it('renders the always-visible preview as monospace text', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} />)
    const previewIntro = screen.getByTestId('archive-name-preview-intro')
    expect(previewIntro.querySelector('.font-mono')).toBeInTheDocument()
  })

  it('size="small" still renders the preview line', () => {
    renderWithProviders(<ArchiveNameTemplateInput {...defaultProps} size="small" />)
    expect(screen.getByTestId('archive-name-preview-intro')).toBeInTheDocument()
  })
})
