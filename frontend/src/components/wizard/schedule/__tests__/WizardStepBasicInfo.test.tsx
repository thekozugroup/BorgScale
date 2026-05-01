import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../../../test/test-utils'
import WizardStepBasicInfo from '../WizardStepBasicInfo'

describe('WizardStepBasicInfo', () => {
  const mockRepositories = [
    { id: 1, name: 'Repo 1', path: '/path/to/repo1', mode: 'full' as const },
    { id: 2, name: 'Repo 2', path: '/path/to/repo2', mode: 'observe' as const },
    { id: 3, name: 'Repo 3', path: '/path/to/repo3', mode: 'full' as const },
  ]

  const defaultData = {
    name: '',
    description: '',
    repositoryIds: [],
  }

  const defaultProps = {
    data: defaultData,
    repositories: mockRepositories,
    onChange: vi.fn(),
  }

  it('renders name input field', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    const nameInput = screen.getByLabelText(/Job Name/i)
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toBeRequired()
  })

  it('renders description textarea', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    const descriptionInput = screen.getByLabelText(/Description/i)
    expect(descriptionInput).toBeInTheDocument()
    expect(descriptionInput).toHaveAttribute('rows', '2')
  })

  it('renders MultiRepositorySelector', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    expect(screen.getByText(/Use arrows to change backup order/i)).toBeInTheDocument()
  })

  it('calls onChange when name changes', () => {
    const onChange = vi.fn()
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} onChange={onChange} />)

    const nameInput = screen.getByLabelText(/Job Name/i)
    fireEvent.change(nameInput, { target: { value: 'Daily Backup' } })

    expect(onChange).toHaveBeenCalledWith({ name: 'Daily Backup' })
  })

  it('calls onChange when description changes', () => {
    const onChange = vi.fn()
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} onChange={onChange} />)

    const descriptionInput = screen.getByLabelText(/Description/i)
    fireEvent.change(descriptionInput, { target: { value: 'Backup all servers daily' } })

    expect(onChange).toHaveBeenCalledWith({ description: 'Backup all servers daily' })
  })

  it('displays warning when no repositories are selected', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} data={defaultData} />)

    expect(screen.getByText(/Select at least one repository to continue/i)).toBeInTheDocument()
  })

  it('does not display warning when repositories are selected', () => {
    const dataWithRepos = {
      ...defaultData,
      repositoryIds: [1, 2],
    }

    renderWithProviders(<WizardStepBasicInfo {...defaultProps} data={dataWithRepos} />)

    expect(
      screen.queryByText(/Select at least one repository to continue/i)
    ).not.toBeInTheDocument()
  })

  it('displays initial name value', () => {
    const dataWithName = {
      ...defaultData,
      name: 'Weekly Backup',
    }

    renderWithProviders(<WizardStepBasicInfo {...defaultProps} data={dataWithName} />)

    const nameInput = screen.getByLabelText(/Job Name/i) as HTMLInputElement
    expect(nameInput.value).toBe('Weekly Backup')
  })

  it('displays initial description value', () => {
    const dataWithDescription = {
      ...defaultData,
      description: 'Run backup every week',
    }

    renderWithProviders(<WizardStepBasicInfo {...defaultProps} data={dataWithDescription} />)

    const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
    expect(descriptionInput.value).toBe('Run backup every week')
  })

  it('displays placeholder text for name input', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    expect(screen.getByPlaceholderText(/Daily backup/i)).toBeInTheDocument()
  })

  it('displays placeholder text for description input', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    expect(screen.getByPlaceholderText(/Optional description/i)).toBeInTheDocument()
  })

  it('displays helper text for repositories selector', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    expect(screen.getByText(/Use arrows to change backup order/i)).toBeInTheDocument()
  })

  it('handles empty name gracefully', () => {
    const onChange = vi.fn()
    const dataWithName = {
      ...defaultData,
      name: 'Test',
    }

    renderWithProviders(<WizardStepBasicInfo {...defaultProps} data={dataWithName} onChange={onChange} />)

    const nameInput = screen.getByPlaceholderText(/Daily backup/i) as HTMLInputElement
    expect(nameInput.value).toBe('Test')

    fireEvent.change(nameInput, { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith({ name: '' })
  })

  it('handles empty description gracefully', () => {
    const onChange = vi.fn()
    const dataWithDescription = {
      ...defaultData,
      description: 'Test description',
    }

    renderWithProviders(<WizardStepBasicInfo {...defaultProps} data={dataWithDescription} onChange={onChange} />)

    const descriptionInput = screen.getByPlaceholderText(
      /Optional description/i
    ) as HTMLTextAreaElement
    expect(descriptionInput.value).toBe('Test description')

    fireEvent.change(descriptionInput, { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith({ description: '' })
  })

  it('applies medium size to inputs by default', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} />)

    const nameInput = screen.getByLabelText(/Job Name/i)
    expect(nameInput).toBeInTheDocument()
  })

  it('renders with empty repositories list', () => {
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} repositories={[]} />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
    expect(screen.getByText(/Use arrows to change backup order/i)).toBeInTheDocument()
  })

  it('handles multiple onChange calls correctly', () => {
    const onChange = vi.fn()
    renderWithProviders(<WizardStepBasicInfo {...defaultProps} onChange={onChange} />)

    const nameInput = screen.getByLabelText(/Job Name/i)
    fireEvent.change(nameInput, { target: { value: 'First Name' } })

    const descriptionInput = screen.getByLabelText(/Description/i)
    fireEvent.change(descriptionInput, { target: { value: 'First Description' } })

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenNthCalledWith(1, { name: 'First Name' })
    expect(onChange).toHaveBeenNthCalledWith(2, { description: 'First Description' })
  })
})
