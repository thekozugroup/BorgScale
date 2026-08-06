import { fireEvent, screen, renderWithProviders } from '../../test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RunningBackupsSection from '../RunningBackupsSection'
import { BackupJob } from '../../types'

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const map: Record<string, string> = {
          'backup.runningJobs.title': 'Running Jobs',
          'backup.runningJobs.subtitle': 'Currently active backup operations',
          'backup.runningJobs.viewLogs': 'View Logs',
          'backup.runningJobs.cancel': 'Cancel',
          'backup.runningJobs.progress.filesProcessed': 'Files Processed',
          'backup.runningJobs.progress.originalSize': 'Original Size',
          'backup.runningJobs.progress.compressed': 'Compressed',
          'backup.runningJobs.progress.deduplicated': 'Deduplicated',
          'backup.runningJobs.progress.totalSourceSize': 'Total Source Size',
          'backup.runningJobs.progress.speed': 'Speed',
          'backup.runningJobs.progress.eta': 'ETA',
          'backup.runningJobs.progress.initializing': 'Initializing',
          'backup.runningJobs.progress.processing': 'Processing',
          'backup.runningJobs.progress.finalizing': 'Finalizing',
        }
        if (key === 'backup.runningJobs.jobTitle') return `Backup Job ${opts?.id}`
        if (key === 'backup.runningJobs.progress.finishedAnnouncement')
          return `Backup job ${opts?.id} finished`
        return map[key] ?? key
      },
      i18n: { language: 'en' },
    }),
  }
})

vi.mock('../../utils/dateUtils', () => ({
  formatBytes: vi.fn((bytes: number) => `${bytes} bytes`),
  formatDurationSeconds: vi.fn((seconds: number) => `${seconds}s`),
  formatTimeRange: vi.fn(() => 'Running for 2 hours'),
}))

describe('RunningBackupsSection', () => {
  const mockOnCancelBackup = vi.fn()

  const mockRunningJob: BackupJob = {
    id: 1,
    repository: '/path/to/repo',
    status: 'running',
    started_at: '2024-01-01T12:00:00Z',
    progress: 50,
    progress_details: {
      nfiles: 1000,
      original_size: 5000000,
      compressed_size: 3000000,
      deduplicated_size: 2000000,
      current_file: '/home/user/document.pdf',
      backup_speed: 10.5,
      total_expected_size: 10000000,
      estimated_time_remaining: 300,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when runningBackupJobs is empty', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.queryByText('Running Jobs')).not.toBeInTheDocument()
  })

  it('renders section header with job count', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('Running Jobs')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('displays job ID', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('Backup Job 1')).toBeInTheDocument()
  })

  it('displays repository path', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('/path/to/repo')).toBeInTheDocument()
  })

  it('displays current file being processed', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('/home/user/document.pdf')).toBeInTheDocument()
  })

  it('displays stats labels and values', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('Files Processed')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('Original Size')).toBeInTheDocument()
    expect(screen.getByText('Compressed')).toBeInTheDocument()
    expect(screen.getByText('Deduplicated')).toBeInTheDocument()
    expect(screen.getByText('Speed')).toBeInTheDocument()
    expect(screen.getByText('10.50 MB/s')).toBeInTheDocument()
  })

  it('hides optional size fields when absent from progress_details', () => {
    const borg2Job: BackupJob = {
      ...mockRunningJob,
      progress_details: {
        nfiles: 1000,
        original_size: 5000000,
        current_file: '/home/user/document.pdf',
        backup_speed: 10.5,
        total_expected_size: 10000000,
        estimated_time_remaining: 300,
      },
    }
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[borg2Job]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.queryByText('Compressed')).not.toBeInTheDocument()
    expect(screen.queryByText('Deduplicated')).not.toBeInTheDocument()
    expect(screen.getByText('Original Size')).toBeInTheDocument()
  })

  it('displays ETA when estimated_time_remaining is present', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('ETA')).toBeInTheDocument()
    expect(screen.getByText('300s')).toBeInTheDocument()
  })

  it('shows N/A for ETA when estimated_time_remaining is 0', () => {
    const jobNoETA: BackupJob = {
      ...mockRunningJob,
      progress_details: { ...mockRunningJob.progress_details!, estimated_time_remaining: 0 },
    }
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[jobNoETA]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('displays maintenance status badge when present', () => {
    const jobWithMaintenance: BackupJob = {
      ...mockRunningJob,
      maintenance_status: 'prune_running',
    }
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[jobWithMaintenance]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('prune_running')).toBeInTheDocument()
  })

  it('renders cancel button enabled', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()
    expect(cancelButton).not.toBeDisabled()
  })

  it('calls onCancelBackup when cancel button is clicked', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnCancelBackup).toHaveBeenCalledWith(1)
  })

  it('disables cancel button when isCancelling is true', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={true}
      />
    )
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('renders multiple running jobs', () => {
    const jobs: BackupJob[] = [
      { ...mockRunningJob, id: 1 },
      { ...mockRunningJob, id: 2 },
    ]
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={jobs}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Backup Job 1')).toBeInTheDocument()
    expect(screen.getByText('Backup Job 2')).toBeInTheDocument()
  })

  it('hides current file box when current_file is empty', () => {
    const jobWithoutFile: BackupJob = {
      ...mockRunningJob,
      progress_details: { ...mockRunningJob.progress_details!, current_file: '' },
    }
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[jobWithoutFile]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.queryByText('/home/user/document.pdf')).not.toBeInTheDocument()
  })

  it('hides View Logs button when onViewLogs is not provided', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(screen.queryByRole('button', { name: /view logs/i })).not.toBeInTheDocument()
  })

  it('exposes the progress bar with progressbar role and value attributes', () => {
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    // 5,000,000 of 10,000,000 bytes processed
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(progressbar).toHaveAttribute('aria-valuenow', '50')
    expect(progressbar).toHaveAttribute('aria-valuetext', '50.0%')
    expect(progressbar).toHaveAccessibleName('Backup Job 1')
  })

  it('announces progress politely in quarter steps, not per percent', () => {
    const { rerender } = renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    const jobStatus = screen
      .getAllByRole('status')
      .find((el) => el.textContent?.includes('Backup Job 1'))
    expect(jobStatus).toHaveTextContent('Backup Job 1: Processing, 50%')

    // 62% still reads as the 50% bucket — no announcement churn
    rerender(
      <RunningBackupsSection
        runningBackupJobs={[
          {
            ...mockRunningJob,
            progress_details: { ...mockRunningJob.progress_details!, original_size: 6200000 },
          },
        ]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(jobStatus).toHaveTextContent('Backup Job 1: Processing, 50%')

    rerender(
      <RunningBackupsSection
        runningBackupJobs={[
          {
            ...mockRunningJob,
            progress_details: { ...mockRunningJob.progress_details!, original_size: 7600000 },
          },
        ]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )
    expect(jobStatus).toHaveTextContent('Backup Job 1: Processing, 75%')
  })

  it('announces a job politely once it leaves the running list', () => {
    const { rerender } = renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )

    rerender(
      <RunningBackupsSection
        runningBackupJobs={[]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Backup job 1 finished')
    expect(screen.queryByText('Running Jobs')).not.toBeInTheDocument()
  })

  it('shows View Logs button and calls onViewLogs when provided', () => {
    const onViewLogs = vi.fn()
    renderWithProviders(
      <RunningBackupsSection
        runningBackupJobs={[mockRunningJob]}
        onCancelBackup={mockOnCancelBackup}
        isCancelling={false}
        onViewLogs={onViewLogs}
      />
    )
    const viewLogsButton = screen.getByRole('button', { name: /view logs/i })
    expect(viewLogsButton).toBeInTheDocument()
    fireEvent.click(viewLogsButton)
    expect(onViewLogs).toHaveBeenCalledWith(mockRunningJob)
  })
})
