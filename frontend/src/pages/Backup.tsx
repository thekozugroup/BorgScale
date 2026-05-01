import React, { useEffect, useMemo, useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Loader2, Clock, Info, Play, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible'
import { backupAPI, repositoriesAPI } from '../services/api'
import { BorgApiClient } from '../services/borgApi'
import { toast } from 'react-hot-toast'
import { translateBackendKey } from '../utils/translateBackendKey'
import { BackupJob, Repository } from '../types'
import BackupJobsTable from '../components/BackupJobsTable'
import RepoSelect from '../components/RepoSelect'
import LogViewerDialog from '../components/LogViewerDialog'
import CommandPreview from '../components/CommandPreview'
import RunningBackupsSection from '../components/RunningBackupsSection'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { getRepoCapabilities } from '../utils/repoCapabilities'
import { useTrackedJobOutcomes } from '../hooks/useTrackedJobOutcomes'
import { getJobDurationSeconds } from '../utils/analyticsProperties'

// Emerald green — matches the "Backup Now" button in RepositoryCard for visual continuity
const Backup: React.FC = () => {
  const [selectedRepository, setSelectedRepository] = useState<string>('')
  const [logJob, setLogJob] = useState<BackupJob | null>(null)
  const [showCommandPreview, setShowCommandPreview] = useState(false)
  const queryClient = useQueryClient()
  const location = useLocation()
  const { trackBackup, EventAction } = useAnalytics()
  const { hasGlobalPermission } = useAuth()
  const canManageRepositoryOperations = hasGlobalPermission('repositories.manage_all')
  const permissions = usePermissions()
  const { t } = useTranslation()
  usePageTitle(t('backup.title'))

  // Handle incoming navigation state (from "Backup Now" button)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (location.state && (location.state as any).repositoryPath) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSelectedRepository((location.state as any).repositoryPath)
      // Reset scroll position to top
      window.scrollTo(0, 0)
    }
  }, [location.state])

  // Get backup status and history (manual backups only) for the selected repository
  const { data: backupStatusResponse, isLoading: loadingStatus } = useQuery({
    queryKey: ['backup-status-manual', selectedRepository],
    queryFn: () => backupAPI.getManualJobs(selectedRepository),
    enabled: Boolean(selectedRepository),
    refetchInterval: 1000, // Poll every 1 second for real-time updates
  })
  const backupStatus = backupStatusResponse?.data?.jobs

  // Get repositories
  const { data: repositoriesData, isLoading: loadingRepositories } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getRepositories,
  })

  // Get selected repository details
  const selectedRepoData = useMemo(() => {
    if (!selectedRepository || !repositoriesData?.data?.repositories) return null
    return repositoriesData.data.repositories.find(
      (repo: Repository) => repo.path === selectedRepository
    )
  }, [selectedRepository, repositoriesData])

  const canStartBackup = selectedRepoData ? permissions.canDo(selectedRepoData.id, 'backup') : false

  // Start backup mutation
  const startBackupMutation = useMutation({
    mutationFn: () => {
      if (!selectedRepoData) {
        throw new Error('Repository not selected')
      }
      return new BorgApiClient(selectedRepoData).runBackup()
    },
    onSuccess: () => {
      toast.success(t('backup.toasts.started'))
      queryClient.invalidateQueries({ queryKey: ['backup-status-manual'] })
      trackBackup(EventAction.START, undefined, selectedRepoData || undefined)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('backup.toasts.startFailed')
      )
    },
  })

  // Cancel backup mutation
  const cancelBackupMutation = useMutation({
    mutationFn: (jobId: string) => backupAPI.cancelJob(jobId),
    onSuccess: () => {
      toast.success(t('backup.toasts.cancelled'))
      queryClient.invalidateQueries({ queryKey: ['backup-status-manual'] })
      trackBackup(EventAction.STOP, 'manual')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('backup.toasts.cancelFailed')
      )
    },
  })

  // Log viewer handlers
  const handleViewLogs = (job: BackupJob) => {
    setLogJob(job)
  }

  const handleCloseLogs = () => {
    setLogJob(null)
  }

  // Handle repository selection
  const handleRepositoryChange = (repoPath: string) => {
    setSelectedRepository(repoPath)
    const repo = repositoriesData?.data?.repositories?.find((r: Repository) => r.path === repoPath)
    if (repo) {
      trackBackup(EventAction.FILTER, undefined, repo)
    }
  }

  // Handle start backup
  const handleStartBackup = () => {
    if (!selectedRepository) {
      toast.error(t('backup.toasts.selectRepository'))
      return
    }
    startBackupMutation.mutate()
  }

  const runningJobs = backupStatus?.filter((job: BackupJob) => job.status === 'running') || []
  const recentJobs = selectedRepository ? backupStatus || [] : []

  useTrackedJobOutcomes<BackupJob>({
    jobs: recentJobs,
    onTerminal: (job) => {
      const repository = repositoriesData?.data?.repositories?.find(
        (repo: Repository) => repo.path === job.repository
      )
      const action =
        job.status === 'completed' || job.status === 'completed_with_warnings'
          ? EventAction.COMPLETE
          : EventAction.FAIL

      trackBackup(action, 'manual', repository ?? job.repository, {
        trigger: 'manual',
        job_id: job.id,
        status: job.status,
        has_logs: !!job.has_logs,
        maintenance_status: job.maintenance_status ?? null,
        duration_seconds: getJobDurationSeconds(job.started_at, job.completed_at),
        warning_count: job.status === 'completed_with_warnings' ? 1 : 0,
        error_present: !!job.error_message,
      })
    },
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{t('backup.title')}</h1>
            {repositoriesData?.data?.repositories?.some(
              (repo: Repository) => !getRepoCapabilities(repo).canBackup
            ) && !loadingRepositories && (
              <button
                type="button"
                title={t('backup.manualBackup.observeOnlyHidden')}
                className="text-muted-foreground hover:text-foreground transition-colors p-0"
              >
                <Info size={16} />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t('backup.subtitle')}</p>
        </div>
      </div>

      {/* Manual Backup Control */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <RepoSelect
            repositories={(repositoriesData?.data?.repositories ?? []).filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (repo: any) =>
                getRepoCapabilities(repo).canBackup && permissions.canDo(repo.id, 'backup')
            )}
            value={selectedRepository}
            onChange={(v) => handleRepositoryChange(v as string)}
            loading={loadingRepositories}
            valueKey="path"
            label={t('backup.manualBackup.repository')}
            loadingLabel={t('backup.manualBackup.loadingRepositories')}
            placeholderLabel={t('backup.manualBackup.selectRepository')}
            maintenanceLabel={t('backup.manualBackup.maintenanceRunning')}
          />

          <Button
            onClick={handleStartBackup}
            disabled={startBackupMutation.isPending || !selectedRepository || !canStartBackup}
            size="lg"
            className="w-full sm:w-auto flex-shrink-0 gap-1.5 font-semibold"
          >
            {startBackupMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={18} />
            )}
            {startBackupMutation.isPending
              ? t('backup.manualBackup.starting')
              : t('backup.manualBackup.startBackup')}
          </Button>
        </div>

        {repositoriesData?.data?.repositories?.length === 0 && !loadingRepositories && (
          <div className="flex flex-col items-start gap-3 p-3 rounded-xl text-sm mt-3 border border-border bg-muted/40 text-muted-foreground">
            <div>
              <p className="font-semibold">{t('backup.manualBackup.noRepositories.title')}</p>
              <p className="mt-0.5">{t('backup.manualBackup.noRepositories.subtitle')}</p>
            </div>
            <Button asChild size="lg">
              <Link to="/repositories?action=create">{t('repositories.createRepository')}</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Command Preview Card — collapsed by default */}
      {selectedRepoData && (
        <Collapsible open={showCommandPreview} onOpenChange={setShowCommandPreview}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground px-0">
              {showCommandPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {t('backup.showCommand', 'Show command')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CommandPreview
              mode="import"
              displayMode="backup-only"
              borgVersion={selectedRepoData.borg_version}
              repositoryPath={selectedRepoData.path}
              archiveName="manual-backup-{now}"
              compression={selectedRepoData.compression}
              excludePatterns={selectedRepoData.exclude_patterns}
              sourceDirs={selectedRepoData.source_directories}
              customFlags={selectedRepoData.custom_flags ?? ''}
              remotePath={selectedRepoData.remote_path ?? ''}
              repositoryMode="full"
              dataSource="local"
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Running Jobs */}
      <RunningBackupsSection
        runningBackupJobs={runningJobs}
        onCancelBackup={(jobId) => cancelBackupMutation.mutate(String(jobId))}
        isCancelling={cancelBackupMutation.isPending}
        onViewLogs={handleViewLogs}
      />

      {/* Recent Jobs */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1 text-muted-foreground">
          <Clock size={20} />
          <p className="text-base font-semibold text-foreground">{t('backup.recentJobs.title')}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('backup.recentJobs.subtitle')}</p>

        <BackupJobsTable
          jobs={recentJobs}
          repositories={repositoriesData?.data?.repositories || []}
          loading={loadingStatus}
          actions={{
            viewLogs: true,
            cancel: true,
            breakLock: true,
            downloadLogs: true,
            errorInfo: true,
            delete: true,
          }}
          canBreakLocks={canManageRepositoryOperations}
          canDeleteJobs={canManageRepositoryOperations}
          getRowKey={(job) => String(job.id)}
          headerBgColor="background.default"
          enableHover={true}
          tableId="backup"
          emptyState={{
            icon: <Clock size={48} />,
            title: t('backup.recentJobs.empty'),
            action: <Button size="sm" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t('backup.manualBackup.startBackup')}</Button>,
          }}
        />
      </div>

      {/* Log Viewer Dialog */}
      <LogViewerDialog job={logJob} open={Boolean(logJob)} onClose={handleCloseLogs} />
    </div>
  )
}

export default Backup
