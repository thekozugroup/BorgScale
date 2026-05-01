import { useState, useImperativeHandle, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Info } from 'lucide-react'
import ResponsiveDialog from './ResponsiveDialog'
import { repositoriesAPI } from '../services/api'
import { BorgApiClient } from '../services/borgApi'
import RepoSelect from './RepoSelect'
import { toast } from 'react-hot-toast'
import { translateBackendKey } from '../utils/translateBackendKey'
import { convertCronToUTC, convertCronToLocal } from '../utils/dateUtils'
import CronBuilderDialog from './CronBuilderDialog'
import ScheduleCheckCard from './ScheduleCheckCard'
import BackupJobsTable from './BackupJobsTable'
import { usePermissions } from '../hooks/usePermissions'
import type { Repository } from '../types'
import type { Job } from '../types/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ScheduledCheck {
  repository_id: number
  repository_name: string
  repository_path: string
  check_cron_expression: string | null
  last_scheduled_check: string | null
  next_scheduled_check: string | null
  check_max_duration: number
  notify_on_check_success: boolean
  notify_on_check_failure: boolean
  enabled: boolean
}

interface CheckHistoryJob extends Job {
  type: 'check'
  scheduled_check: boolean
}

export interface ScheduledChecksSectionRef {
  openAddDialog: () => void
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const ScheduledChecksSection = forwardRef<ScheduledChecksSectionRef, {}>((_, ref) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { canDo } = usePermissions()
  const [showDialog, setShowDialog] = useState(false)
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ cron_expression: '0 2 * * 0', max_duration: 3600 })
  const [historyRepositoryFilter, setHistoryRepositoryFilter] = useState<number | 'all'>('all')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string | 'all'>('all')
  const [pendingDeleteCheck, setPendingDeleteCheck] = useState<ScheduledCheck | null>(null)

  const { data: repositoriesData, isLoading: loadingRepositories } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getRepositories,
  })

  const repositories = repositoriesData?.data?.repositories || []
  const manageableRepositories = repositories.filter((repo: { id: number }) => canDo(repo.id, 'maintenance'))
  const selectedRepository = manageableRepositories.find((repo: Repository) => repo.id === selectedRepositoryId) as Repository | undefined
  const isSelectedRepoBorg2 = selectedRepository?.borg_version === 2

  const { data: scheduledChecks, isLoading } = useQuery({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryKey: ['scheduled-checks', repositories.map((r: any) => r.id)],
    queryFn: async () => {
      const checks: ScheduledCheck[] = []
      for (const repo of repositories) {
        try {
          const response = await repositoriesAPI.getCheckSchedule(repo.id)
          if (response.data.enabled) checks.push(response.data)
        } catch { /* skip */ }
      }
      return checks
    },
    enabled: repositories.length > 0 && !loadingRepositories,
  })

  const { data: checkHistoryData, isLoading: loadingCheckHistory } = useQuery({
    queryKey: ['scheduled-check-history', manageableRepositories.map((repo: Repository) => repo.id)],
    queryFn: async () => {
      const jobs: CheckHistoryJob[] = []
      for (const repo of manageableRepositories) {
        try {
          const response = await repositoriesAPI.getRepositoryCheckJobs(repo.id, 10, true)
          const repoJobs = response.data.jobs || []
          jobs.push(...repoJobs.map((job: Job & { scheduled_check?: boolean }) => ({
            ...job,
            repository_id: repo.id,
            repository: repo.path,
            repository_path: repo.path,
            type: 'check' as const,
            scheduled_check: Boolean(job.scheduled_check),
          })))
        } catch { /* skip */ }
      }
      return jobs.sort((a, b) => {
        const aTime = new Date(a.started_at || a.completed_at || 0).getTime()
        const bTime = new Date(b.started_at || b.completed_at || 0).getTime()
        return bTime - aTime
      })
    },
    enabled: manageableRepositories.length > 0 && !loadingRepositories,
    refetchInterval: 5000,
  })

  const checkHistory = checkHistoryData || []
  const filteredCheckHistory = checkHistory.filter((job) => {
    if (historyRepositoryFilter !== 'all' && job.repository_id !== historyRepositoryFilter) return false
    if (historyStatusFilter !== 'all' && job.status !== historyStatusFilter) return false
    return true
  })
  const historyHasFilters = historyRepositoryFilter !== 'all' || historyStatusFilter !== 'all'

  const updateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({ repoId, data }: { repoId: number; data: any }) => {
      return await repositoriesAPI.updateCheckSchedule(repoId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-checks'] })
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      toast.success(t('scheduledChecks.toasts.scheduleUpdated'))
      setShowDialog(false)
      setSelectedRepositoryId(null)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('scheduledChecks.toasts.updateFailed'))
    },
  })

  const runCheckMutation = useMutation({
    mutationFn: async (repoId: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const repo = repositories.find((r: any) => r.id === repoId)
      if (!repo) throw new Error('Repository not found')
      return new BorgApiClient(repo).checkRepository()
    },
    onSuccess: () => { toast.success(t('scheduledChecks.toasts.checkStarted')) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('scheduledChecks.toasts.checkFailed'))
    },
  })

  const openAddDialog = () => {
    setSelectedRepositoryId(null)
    setFormData({ cron_expression: '0 2 * * 0', max_duration: 3600 })
    setShowDialog(true)
  }

  const openEditDialog = (check: ScheduledCheck) => {
    setSelectedRepositoryId(check.repository_id)
    const localCron = check.check_cron_expression ? convertCronToLocal(check.check_cron_expression) : '0 2 * * 0'
    setFormData({ cron_expression: localCron, max_duration: check.check_max_duration })
    setShowDialog(true)
  }

  useImperativeHandle(ref, () => ({ openAddDialog }))

  const handleSubmit = () => {
    if (!selectedRepositoryId) {
      toast.error(t('scheduledChecks.validation.selectRepository'))
      return
    }
    const utcCron = convertCronToUTC(formData.cron_expression)
    updateMutation.mutate({ repoId: selectedRepositoryId, data: { ...formData, cron_expression: utcCron } })
  }

  const handleDelete = (check: ScheduledCheck) => {
    setPendingDeleteCheck(check)
  }

  const confirmDelete = () => {
    if (pendingDeleteCheck) {
      updateMutation.mutate({ repoId: pendingDeleteCheck.repository_id, data: { cron_expression: '' } })
      setPendingDeleteCheck(null)
    }
  }

  const dialogFooter = (
    <div className="flex justify-end gap-2 px-5 py-3">
      <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.buttons.cancel')}</Button>
      <Button
        onClick={handleSubmit}
        disabled={!selectedRepositoryId || updateMutation.isPending}
      >
        {selectedRepositoryId ? t('scheduledChecks.update') : t('scheduledChecks.create')}
      </Button>
    </div>
  )

  return (
    <div>
      {!loadingRepositories && manageableRepositories.length === 0 && (
        <Alert className="mb-6">
          <AlertDescription>{t('scheduledChecks.needRepository')}</AlertDescription>
        </Alert>
      )}

      {/* Scheduled Checks */}
      {isLoading || loadingRepositories ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg bg-card border border-border overflow-hidden shadow-sm"
              style={{ opacity: Math.max(0.4, 1 - i * 0.2) }}
            >
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Skeleton className="h-6 rounded" style={{ width: [150, 190, 130][i] }} />
                  <Skeleton className="h-5 w-18 rounded" />
                </div>
                <div className="grid grid-cols-4 rounded-md overflow-hidden mb-3 border border-border">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className={cn('px-3 py-2.5', j < 3 ? 'border-r border-border' : '')}>
                      <Skeleton className="h-2.5 mb-1.5 rounded" style={{ width: 38 }} />
                      <Skeleton className="h-4 rounded" style={{ width: [58, 48, 54, 44][j] }} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 pt-3 border-t border-border">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="w-22 h-7 rounded ml-auto" style={{ width: 88 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !scheduledChecks || scheduledChecks.length === 0 ? (
        <div className="py-12 flex flex-col items-center text-muted-foreground">
          <Shield size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
          <p className="text-base mb-1">{t('scheduledChecks.noScheduledChecks')}</p>
          <p className="text-sm text-muted-foreground">{t('scheduledChecks.noScheduledChecksDesc')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {scheduledChecks.map((check) => (
            <ScheduleCheckCard
              key={check.repository_id}
              check={check}
              canManage={canDo(check.repository_id, 'maintenance')}
              onEdit={() => openEditDialog(check)}
              onDelete={() => handleDelete(check)}
              onRunNow={() => runCheckMutation.mutate(check.repository_id)}
            />
          ))}
        </div>
      )}

      {!loadingRepositories && manageableRepositories.length > 0 && (
        <div className="mt-6">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div>
              <p className="text-base font-semibold">{t('scheduledChecks.historyTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {historyHasFilters
                  ? t('scheduledChecks.historyShowingFiltered', { filtered: filteredCheckHistory.length, total: checkHistory.length })
                  : t('scheduledChecks.historyShowing', { filtered: filteredCheckHistory.length, total: checkHistory.length })}
              </p>
            </div>
            {historyHasFilters && (
              <Button size="sm" variant="ghost" className="font-bold flex-shrink-0" onClick={() => { setHistoryRepositoryFilter('all'); setHistoryStatusFilter('all') }}>
                {t('common.clearFilters', { defaultValue: 'Clear filters' })}
              </Button>
            )}
          </div>

          <div className="mb-5 flex flex-wrap gap-3">
            <Select value={String(historyRepositoryFilter)} onValueChange={(v) => setHistoryRepositoryFilter(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="flex-[2] min-w-[220px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('scheduledChecks.allRepositories')}</SelectItem>
                {manageableRepositories.map((repo: Repository) => (
                  <SelectItem key={repo.id} value={String(repo.id)}>{repo.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
              <SelectTrigger className="flex-1 min-w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('scheduledChecks.allStatus')}</SelectItem>
                <SelectItem value="completed">{t('backupHistory.completed')}</SelectItem>
                <SelectItem value="failed">{t('backupHistory.failed')}</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BackupJobsTable
            jobs={filteredCheckHistory}
            repositories={manageableRepositories}
            loading={loadingCheckHistory}
            actions={{ viewLogs: true, viewArchive: false, downloadLogs: true, cancel: true, errorInfo: true, breakLock: false, runNow: false, delete: true }}
            canDeleteJobs
            emptyState={{ title: t('scheduledChecks.noHistoryTitle'), description: t('scheduledChecks.noHistoryDescription') }}
            tableId="scheduled-check-history"
          />
        </div>
      )}

      {/* Add/Edit Dialog */}
      <ResponsiveDialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth footer={dialogFooter}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-base font-semibold">
            {selectedRepositoryId ? t('scheduledChecks.editCheckSchedule') : t('scheduledChecks.addCheckSchedule')}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={t('scheduledChecks.notificationHint')} className="text-muted-foreground hover:text-foreground">
                <Info size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{t('scheduledChecks.notificationHint')}</TooltipContent>
          </Tooltip>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 flex flex-col gap-4">
          <RepoSelect
            repositories={manageableRepositories}
            value={selectedRepositoryId || ''}
            onChange={(v) => setSelectedRepositoryId(v ? Number(v) : null)}
            loading={loadingRepositories}
            valueKey="id"
            label={t('scheduledChecks.repository')}
            disabled={manageableRepositories.length === 0}
          />

          <div>
            <Label className="mb-1 block">{t('scheduledChecks.checkScheduleLabel')}</Label>
            <div className="relative">
              <Input
                value={formData.cron_expression}
                onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                required
                placeholder="0 2 * * 0"
                className="pr-10 font-mono text-lg tracking-widest"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <CronBuilderDialog
                  value={formData.cron_expression}
                  onChange={(localCron) => setFormData({ ...formData, cron_expression: localCron })}
                  label={t('scheduledChecks.checkScheduleLabel')}
                  helperText={t('scheduledChecks.checkScheduleHelperText')}
                  dialogTitle={t('scheduledChecks.checkScheduleBuilderTitle')}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1 block">{t('scheduledChecks.maxDuration')}</Label>
            <Input
              type="number"
              value={formData.max_duration}
              onChange={(e) => setFormData({ ...formData, max_duration: Number(e.target.value) })}
              min={60}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isSelectedRepoBorg2 ? t('scheduledChecks.maxDurationHintBorg2') : t('scheduledChecks.maxDurationHint')}
            </p>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Disable-check confirmation */}
      <AlertDialog open={!!pendingDeleteCheck} onOpenChange={(open) => { if (!open) setPendingDeleteCheck(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('scheduledChecks.confirmDisableTitle', { defaultValue: 'Disable scheduled check?' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCheck
                ? t('scheduledChecks.confirmDisable', { repositoryName: pendingDeleteCheck.repository_name })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>{t('common.buttons.disable', { defaultValue: 'Disable' })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

ScheduledChecksSection.displayName = 'ScheduledChecksSection'

export default ScheduledChecksSection
