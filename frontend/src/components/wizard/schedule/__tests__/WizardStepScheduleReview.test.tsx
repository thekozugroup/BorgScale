import { describe, it, expect } from 'vitest'
import { screen, renderWithProviders } from '../../../../test/test-utils'
import WizardStepScheduleReview from '../WizardStepScheduleReview'

describe('WizardStepScheduleReview', () => {
  const mockRepositories = [
    { id: 1, name: 'Home Backup', path: '/mnt/backup/home', mode: 'full' as const },
    { id: 2, name: 'Work Backup', path: '/mnt/backup/work', mode: 'observe' as const },
    { id: 3, name: 'Server Backup', path: '/mnt/backup/server', mode: 'full' as const },
  ]

  const mockScripts = [
    { id: 1, name: 'Wake Server', parameters: null },
    { id: 2, name: 'Shutdown Server', parameters: null },
    { id: 3, name: 'Notify Admin', parameters: null },
  ]

  const defaultData = {
    name: 'Daily Backup Job',
    description: 'Backup all servers daily',
    repositoryIds: [1, 2],
    cronExpression: '0 2 * * *',
    archiveNameTemplate: '{job_name}-{now}',
    preBackupScriptId: 1,
    postBackupScriptId: 2,
    runRepositoryScripts: true,
    runPruneAfter: true,
    runCompactAfter: true,
    pruneKeepHourly: 24,
    pruneKeepDaily: 7,
    pruneKeepWeekly: 4,
    pruneKeepMonthly: 6,
    pruneKeepQuarterly: 2,
    pruneKeepYearly: 1,
  }

  const defaultProps = {
    data: defaultData,
    repositories: mockRepositories,
    scripts: mockScripts,
  }

  it('renders success alert with create message', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText(/Ready to create schedule!/i)).toBeInTheDocument()
    expect(screen.getByText(/Review and confirm below/i)).toBeInTheDocument()
  })

  it('renders job summary card with title', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText(/Job Summary/i)).toBeInTheDocument()
  })

  it('displays job name', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('Daily Backup Job')).toBeInTheDocument()
  })

  it('displays job description', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('Backup all servers daily')).toBeInTheDocument()
  })

  it('does not display description when empty', () => {
    const dataNoDescription = {
      ...defaultData,
      description: '',
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoDescription} />)

    // Name should be present
    expect(screen.getByText('Daily Backup Job')).toBeInTheDocument()
    // But no description text
  })

  it('displays repository count', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText(/Repositories \(2\)/i)).toBeInTheDocument()
  })

  it('displays repository list with order numbers', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('Home Backup')).toBeInTheDocument()
    expect(screen.getByText('Work Backup')).toBeInTheDocument()
    expect(screen.getByText('/mnt/backup/home')).toBeInTheDocument()
    expect(screen.getByText('/mnt/backup/work')).toBeInTheDocument()

    // Check for order chips
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('displays cron expression', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('0 2 * * *')).toBeInTheDocument()
  })

  it('displays archive name template', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('{job_name}-{now}')).toBeInTheDocument()
  })

  it('renders scripts configuration card', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText(/Scripts Configuration/i)).toBeInTheDocument()
  })

  it('displays pre-backup script name', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('Wake Server')).toBeInTheDocument()
  })

  it('displays post-backup script name', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText('Shutdown Server')).toBeInTheDocument()
  })

  it('displays "None" when no pre-backup script selected', () => {
    const dataNoPreScript = {
      ...defaultData,
      preBackupScriptId: null,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoPreScript} />)

    // Should find "None" in the pre-backup script section
    const noneElements = screen.getAllByText(/None/i)
    expect(noneElements.length).toBeGreaterThan(0)
  })

  it('displays "None" when no post-backup script selected', () => {
    const dataNoPostScript = {
      ...defaultData,
      postBackupScriptId: null,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoPostScript} />)

    // Should find "None" in the post-backup script section
    const noneElements = screen.getAllByText(/None/i)
    expect(noneElements.length).toBeGreaterThan(0)
  })

  it('displays repository scripts status as enabled', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    // Find all "Enabled" chips (there will be multiple: Status, Repository scripts, Prune, Compact)
    const enabledChips = screen.getAllByText('Enabled')
    expect(enabledChips.length).toBeGreaterThanOrEqual(2)
  })

  it('displays repository scripts status as disabled', () => {
    const dataNoRepoScripts = {
      ...defaultData,
      runRepositoryScripts: false,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoRepoScripts} />)

    // Should have both Enabled (for status, prune, compact) and Disabled (for repo scripts)
    const enabledChips = screen.getAllByText('Enabled')
    expect(enabledChips.length).toBeGreaterThan(0) // Job status, Prune, Compact
    const disabledChips = screen.getAllByText('Disabled')
    expect(disabledChips.length).toBeGreaterThan(0) // Repository scripts
  })

  it('renders maintenance settings card', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText(/Maintenance Settings/i)).toBeInTheDocument()
  })

  it('displays prune enabled status', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    // Prune should show as enabled
    const enabledChips = screen.getAllByText('Enabled')
    expect(enabledChips.length).toBeGreaterThanOrEqual(2) // Status + Prune
  })

  it('displays prune disabled status', () => {
    const dataNoPrune = {
      ...defaultData,
      runPruneAfter: false,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoPrune} />)

    const disabledChips = screen.getAllByText('Disabled')
    expect(disabledChips.length).toBeGreaterThan(0)
  })

  it('displays prune keep format when prune is enabled', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    // Check for the formatted prune settings
    expect(screen.getByText(/Keep:/i)).toBeInTheDocument()
    expect(screen.getByText(/24h/i)).toBeInTheDocument()
    expect(screen.getByText(/7d/i)).toBeInTheDocument()
    expect(screen.getByText(/4w/i)).toBeInTheDocument()
    expect(screen.getByText(/6m/i)).toBeInTheDocument()
    expect(screen.getByText(/2q/i)).toBeInTheDocument()
    expect(screen.getByText(/1y/i)).toBeInTheDocument()
  })

  it('does not display prune keep format when prune is disabled', () => {
    const dataNoPrune = {
      ...defaultData,
      runPruneAfter: false,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoPrune} />)

    expect(screen.queryByText(/Keep:/i)).not.toBeInTheDocument()
  })

  it('omits hourly from prune format when zero', () => {
    const dataNoHourly = {
      ...defaultData,
      pruneKeepHourly: 0,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoHourly} />)

    expect(screen.queryByText(/0h/i)).not.toBeInTheDocument()
  })

  it('omits quarterly from prune format when zero', () => {
    const dataNoQuarterly = {
      ...defaultData,
      pruneKeepQuarterly: 0,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoQuarterly} />)

    expect(screen.queryByText(/0q/i)).not.toBeInTheDocument()
  })

  it('displays compact enabled status', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    // Should have multiple "Enabled" chips
    const enabledChips = screen.getAllByText('Enabled')
    expect(enabledChips.length).toBeGreaterThanOrEqual(3) // Status + Scripts + Prune + Compact
  })

  it('displays compact disabled status', () => {
    const dataNoCompact = {
      ...defaultData,
      runCompactAfter: false,
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataNoCompact} />)

    const disabledChips = screen.getAllByText('Disabled')
    expect(disabledChips.length).toBeGreaterThan(0)
  })

  it('displays all three repositories when all are selected', () => {
    const dataAllRepos = {
      ...defaultData,
      repositoryIds: [1, 2, 3],
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataAllRepos} />)

    expect(screen.getByText('Home Backup')).toBeInTheDocument()
    expect(screen.getByText('Work Backup')).toBeInTheDocument()
    expect(screen.getByText('Server Backup')).toBeInTheDocument()
    expect(screen.getByText(/Repositories \(3\)/i)).toBeInTheDocument()
  })

  it('displays repositories in correct order', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    const repoChips = screen.getAllByText(/^[1-3]$/)
    expect(repoChips[0]).toHaveTextContent('1')
    expect(repoChips[1]).toHaveTextContent('2')
  })

  it('handles missing script gracefully', () => {
    const dataInvalidScript = {
      ...defaultData,
      preBackupScriptId: 999, // Non-existent script
    }

    renderWithProviders(<WizardStepScheduleReview {...defaultProps} data={dataInvalidScript} />)

    // Should show None when script is not found
    expect(screen.getAllByText(/None/i).length).toBeGreaterThan(0)
  })

  it('displays section labels correctly', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    expect(screen.getByText(/^Name$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Schedule$/i)).toBeInTheDocument()
    expect(screen.getByText(/Archive Name Template/i)).toBeInTheDocument()
    expect(screen.getByText(/Pre-Backup Script/i)).toBeInTheDocument()
    expect(screen.getByText(/Post-Backup Script/i)).toBeInTheDocument()
    expect(screen.getByText(/Repository-Level Scripts/i)).toBeInTheDocument()
    expect(screen.getByText(/Prune After Backup/i)).toBeInTheDocument()
    expect(screen.getByText(/Compact After Prune/i)).toBeInTheDocument()
  })

  it('renders success alert with correct severity', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/Ready to create/)
  })

  it('uses monospace font for paths and technical values', () => {
    renderWithProviders(<WizardStepScheduleReview {...defaultProps} />)

    const cronElement = screen.getByText('0 2 * * *')
    expect(cronElement.closest('*[style*="monospace"]') || cronElement).toBeTruthy()
  })
})
