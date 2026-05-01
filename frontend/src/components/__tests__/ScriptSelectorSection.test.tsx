import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, renderWithProviders } from '../../test/test-utils'
import ScriptSelectorSection from '../ScriptSelectorSection'

describe('ScriptSelectorSection', () => {
  const mockScripts = [
    { id: 1, name: 'Wake Server', parameters: null },
    { id: 2, name: 'Shutdown Server', parameters: null },
    {
      id: 3,
      name: 'Database Backup',
      parameters: [
        {
          name: 'db_name',
          type: 'text' as const,
          default: '',
          description: 'Database name',
          required: true,
        },
        {
          name: 'db_password',
          type: 'password' as const,
          default: '',
          description: 'Database password',
          required: true,
        },
      ],
    },
  ]

  const defaultProps = {
    preBackupScriptId: null,
    postBackupScriptId: null,
    runRepositoryScripts: false,
    scripts: mockScripts,
    onPreChange: vi.fn(),
    onPostChange: vi.fn(),
    onRunRepoScriptsChange: vi.fn(),
  }

  it('renders both pre and post script dropdowns', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('renders section title and description', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} />)

    expect(screen.getByText(/Schedule-Level Scripts/i)).toBeInTheDocument()
    expect(screen.getByText(/These scripts run once per schedule/i)).toBeInTheDocument()
  })

  it('displays repository scripts checkbox', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox', { name: /Run repository-level scripts/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('calls onPreChange when pre-backup script is selected', () => {
    const onPreChange = vi.fn()
    renderWithProviders(<ScriptSelectorSection {...defaultProps} onPreChange={onPreChange} />)

    const selects = screen.getAllByRole('combobox')
    const preSelect = selects[0]
    fireEvent.pointerDown(preSelect, { button: 0, pointerType: 'mouse' })

    const option = screen.getByRole('option', { name: 'Wake Server' })
    fireEvent.click(option)

    expect(onPreChange).toHaveBeenCalledWith(1)
  })

  it('calls onPostChange when post-backup script is selected', () => {
    const onPostChange = vi.fn()
    renderWithProviders(<ScriptSelectorSection {...defaultProps} onPostChange={onPostChange} />)

    const selects = screen.getAllByRole('combobox')
    const postSelect = selects[1]
    fireEvent.pointerDown(postSelect, { button: 0, pointerType: 'mouse' })

    const option = screen.getByRole('option', { name: 'Shutdown Server' })
    fireEvent.click(option)

    expect(onPostChange).toHaveBeenCalledWith(2)
  })

  it('calls onPreChange with null when "None" is selected', () => {
    const onPreChange = vi.fn()
    renderWithProviders(
      <ScriptSelectorSection {...defaultProps} preBackupScriptId={1} onPreChange={onPreChange} />
    )

    const selects = screen.getAllByRole('combobox')
    const preSelect = selects[0]
    fireEvent.pointerDown(preSelect, { button: 0, pointerType: 'mouse' })

    const noneOption = screen.getByRole('option', { name: /None/i })
    fireEvent.click(noneOption)

    expect(onPreChange).toHaveBeenCalledWith(null)
  })

  it('calls onRunRepoScriptsChange when checkbox is toggled', () => {
    const onRunRepoScriptsChange = vi.fn()
    renderWithProviders(
      <ScriptSelectorSection {...defaultProps} onRunRepoScriptsChange={onRunRepoScriptsChange} />
    )

    const checkbox = screen.getByRole('checkbox', { name: /Run repository-level scripts/i })
    fireEvent.click(checkbox)

    expect(onRunRepoScriptsChange).toHaveBeenCalledWith(true)
  })

  it('displays script parameter inputs when script with parameters is selected', () => {
    renderWithProviders(
      <ScriptSelectorSection
        {...defaultProps}
        preBackupScriptId={3}
        onPreParametersChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Script Parameters/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/db_name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/db_password/i)).toBeInTheDocument()
  })

  it('does not display parameter inputs when script has no parameters', () => {
    renderWithProviders(
      <ScriptSelectorSection
        {...defaultProps}
        preBackupScriptId={1}
        onPreParametersChange={vi.fn()}
      />
    )

    expect(screen.queryByText(/Script Parameters/i)).not.toBeInTheDocument()
  })

  it('calls onPreParametersChange when parameter value changes', () => {
    const onPreParametersChange = vi.fn()
    renderWithProviders(
      <ScriptSelectorSection
        {...defaultProps}
        preBackupScriptId={3}
        preBackupScriptParameters={{ db_name: '', db_password: '' }}
        onPreParametersChange={onPreParametersChange}
      />
    )

    const dbNameInput = screen.getByLabelText(/db_name/i)
    fireEvent.change(dbNameInput, { target: { value: 'mydb' } })

    expect(onPreParametersChange).toHaveBeenCalledWith({
      db_name: 'mydb',
      db_password: '',
    })
  })

  it('displays post-backup script parameters when selected', () => {
    renderWithProviders(
      <ScriptSelectorSection
        {...defaultProps}
        postBackupScriptId={3}
        onPostParametersChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Script Parameters/i)).toBeInTheDocument()
  })

  it('calls onPostParametersChange when parameter value changes', () => {
    const onPostParametersChange = vi.fn()
    renderWithProviders(
      <ScriptSelectorSection
        {...defaultProps}
        postBackupScriptId={3}
        postBackupScriptParameters={{ db_name: '', db_password: '' }}
        onPostParametersChange={onPostParametersChange}
      />
    )

    const dbNameInput = screen.getByLabelText(/db_name/i)
    fireEvent.change(dbNameInput, { target: { value: 'production' } })

    expect(onPostParametersChange).toHaveBeenCalledWith({
      db_name: 'production',
      db_password: '',
    })
  })

  it('disables all controls when disabled prop is true', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} disabled />)

    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toBeDisabled()
    expect(selects[1]).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('handles empty scripts array', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} scripts={[]} />)

    const selects = screen.getAllByRole('combobox')
    const preSelect = selects[0]
    fireEvent.pointerDown(preSelect, { button: 0, pointerType: 'mouse' })

    // Should only show "None" option
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent(/None/i)
  })

  it('applies small size when size prop is small', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} size="small" />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('applies medium size by default', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('displays repository scripts checkbox description', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} />)

    expect(
      screen.getByText(/each repository's pre\/post scripts will run during its backup/i)
    ).toBeInTheDocument()
  })

  it('shows checked repository scripts checkbox when enabled', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} runRepositoryScripts />)

    const checkbox = screen.getByRole('checkbox', { name: /Run repository-level scripts/i })
    expect(checkbox).toBeChecked()
  })

  it('displays selected pre-backup script', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} preBackupScriptId={1} />)

    expect(screen.getByText('Wake Server')).toBeInTheDocument()
  })

  it('displays selected post-backup script', () => {
    renderWithProviders(<ScriptSelectorSection {...defaultProps} postBackupScriptId={2} />)

    expect(screen.getByText('Shutdown Server')).toBeInTheDocument()
  })

  it('uses default empty parameters when not provided', () => {
    renderWithProviders(
      <ScriptSelectorSection
        {...defaultProps}
        preBackupScriptId={3}
        onPreParametersChange={vi.fn()}
      />
    )

    const dbNameInput = screen.getByLabelText(/db_name/i) as HTMLInputElement
    expect(dbNameInput.value).toBe('')
  })
})
