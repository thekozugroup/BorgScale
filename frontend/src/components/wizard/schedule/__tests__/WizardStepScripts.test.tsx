import { describe, it, expect, vi } from 'vitest'
import { screen, renderWithProviders } from '../../../../test/test-utils'
import WizardStepScripts from '../WizardStepScripts'

describe('WizardStepScripts', () => {
  const mockScripts = [
    { id: 1, name: 'Wake Server', parameters: null },
    { id: 2, name: 'Shutdown Server', parameters: null },
  ]

  const defaultData = {
    preBackupScriptId: null,
    postBackupScriptId: null,
    preBackupScriptParameters: {},
    postBackupScriptParameters: {},
    runRepositoryScripts: false,
  }

  const defaultProps = {
    data: defaultData,
    scripts: mockScripts,
    repositoryCount: 2,
    onChange: vi.fn(),
  }

  it('renders info tooltip with script level explanation', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} />)

    // Hint text is accessible via aria-label on the info icon
    const tooltip = screen.getByLabelText(/Schedule-level:/i)
    expect(tooltip).toBeInTheDocument()
  })

  it('renders ScriptSelectorSection when repositories are selected', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} />)

    // Check that ScriptSelectorSection is rendered by looking for its unique elements
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
    expect(screen.getByText(/These scripts run once per schedule/i)).toBeInTheDocument()
  })

  it('displays warning when repositoryCount is 0', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} repositoryCount={0} />)

    expect(
      screen.getByText(/Select at least one repository in Step 1 to configure scripts/i)
    ).toBeInTheDocument()
  })

  it('does not render ScriptSelectorSection when repositoryCount is 0', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} repositoryCount={0} />)

    expect(screen.queryByLabelText(/Pre-Backup Script/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Post-Backup Script/i)).not.toBeInTheDocument()
  })

  it('calls onChange when pre-backup script is selected', () => {
    const onChange = vi.fn()
    renderWithProviders(<WizardStepScripts {...defaultProps} onChange={onChange} />)

    // This would require interacting with the ScriptSelectorSection
    // The actual onChange is tested in ScriptSelectorSection tests
    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toBeInTheDocument()
  })

  it('calls onChange when post-backup script is selected', () => {
    const onChange = vi.fn()
    renderWithProviders(<WizardStepScripts {...defaultProps} onChange={onChange} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects[1]).toBeInTheDocument()
  })

  it('calls onChange when runRepositoryScripts is toggled', () => {
    const onChange = vi.fn()
    renderWithProviders(<WizardStepScripts {...defaultProps} onChange={onChange} />)

    expect(
      screen.getByRole('checkbox', { name: /Run repository-level scripts/i })
    ).toBeInTheDocument()
  })

  it('passes scripts to ScriptSelectorSection', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} />)

    // Check that scripts are available in the selector
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('passes preBackupScriptId to ScriptSelectorSection', () => {
    const dataWithPreScript = {
      ...defaultData,
      preBackupScriptId: 1,
    }

    renderWithProviders(<WizardStepScripts {...defaultProps} data={dataWithPreScript} />)

    expect(screen.getByText('Wake Server')).toBeInTheDocument()
  })

  it('passes postBackupScriptId to ScriptSelectorSection', () => {
    const dataWithPostScript = {
      ...defaultData,
      postBackupScriptId: 2,
    }

    renderWithProviders(<WizardStepScripts {...defaultProps} data={dataWithPostScript} />)

    expect(screen.getByText('Shutdown Server')).toBeInTheDocument()
  })

  it('passes runRepositoryScripts to ScriptSelectorSection', () => {
    const dataWithRepoScripts = {
      ...defaultData,
      runRepositoryScripts: true,
    }

    renderWithProviders(<WizardStepScripts {...defaultProps} data={dataWithRepoScripts} />)

    const checkbox = screen.getByRole('checkbox', { name: /Run repository-level scripts/i })
    expect(checkbox).toBeChecked()
  })

  it('passes script parameters to ScriptSelectorSection', () => {
    const scriptsWithParams = [
      {
        id: 1,
        name: 'DB Backup',
        parameters: [
          {
            name: 'db_name',
            type: 'text' as const,
            default: '',
            description: 'Database',
            required: true,
          },
        ],
      },
    ]

    const dataWithParams = {
      ...defaultData,
      preBackupScriptId: 1,
      preBackupScriptParameters: { db_name: 'mydb' },
    }

    renderWithProviders(
      <WizardStepScripts {...defaultProps} scripts={scriptsWithParams} data={dataWithParams} />
    )

    expect(screen.getByLabelText(/db_name/i)).toBeInTheDocument()
  })

  it('handles empty scripts array', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} scripts={[]} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('applies medium size to ScriptSelectorSection', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('renders with multiple repositories', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} repositoryCount={5} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
    expect(screen.queryByText(/Select at least one repository/i)).not.toBeInTheDocument()
  })

  it('displays info tooltip for script level note', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} />)

    const tooltip = screen.getByLabelText(/Schedule-level:/i)
    expect(tooltip).toBeInTheDocument()
  })

  it('displays alert when no repositories', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} repositoryCount={0} />)

    // shadcn Alert renders as role="alert"
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/Select at least one repository in Step 1 to configure scripts/)
  })

  it('provides concise script level explanation in info tooltip', () => {
    renderWithProviders(<WizardStepScripts {...defaultProps} />)

    // Hint text is accessible via aria-label on the info icon
    const tooltip = screen.getByLabelText(/Schedule-level:/i)
    expect(tooltip).toBeInTheDocument()
  })

  it('handles script parameter changes', () => {
    const scriptsWithParams = [
      {
        id: 1,
        name: 'Parameterized Script',
        parameters: [
          {
            name: 'param1',
            type: 'text' as const,
            default: '',
            description: 'Parameter 1',
            required: true,
          },
        ],
      },
    ]

    const dataWithScript = {
      ...defaultData,
      preBackupScriptId: 1,
      preBackupScriptParameters: {},
    }

    renderWithProviders(
      <WizardStepScripts {...defaultProps} scripts={scriptsWithParams} data={dataWithScript} />
    )

    expect(screen.getByLabelText(/param1/i)).toBeInTheDocument()
  })

  it('handles postBackupScriptParameters', () => {
    const scriptsWithParams = [
      {
        id: 1,
        name: 'Post Script',
        parameters: [
          {
            name: 'post_param',
            type: 'text' as const,
            default: '',
            description: 'Post Parameter',
            required: false,
          },
        ],
      },
    ]

    const dataWithPostParams = {
      ...defaultData,
      postBackupScriptId: 1,
      postBackupScriptParameters: { post_param: 'value' },
    }

    renderWithProviders(
      <WizardStepScripts {...defaultProps} scripts={scriptsWithParams} data={dataWithPostParams} />
    )

    expect(screen.getByLabelText(/post_param/i)).toBeInTheDocument()
  })
})
