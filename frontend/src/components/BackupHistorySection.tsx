import React from 'react'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BackupJobsTable from './BackupJobsTable'
import RepoSelect from './RepoSelect'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ScheduledJob {
  id: number
  name: string
  cron_expression: string
  repository: string | null
  repository_id: number | null
  repository_ids: number[] | null
  enabled: boolean
  last_run: string | null
  next_run: string | null
  created_at: string
  updated_at: string | null
  description: string | null
  archive_name_template: string | null
  run_repository_scripts: boolean
  pre_backup_script_id: number | null
  post_backup_script_id: number | null
  run_prune_after: boolean
  run_compact_after: boolean
  prune_keep_hourly: number
  prune_keep_daily: number
  prune_keep_weekly: number
  prune_keep_monthly: number
  prune_keep_quarterly: number
  prune_keep_yearly: number
  last_prune: string | null
  last_compact: string | null
}

import { Repository } from '../types'

interface BackupJob {
  id: string
  repository: string
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'completed_with_warnings'
  started_at: string
  completed_at?: string
  error_message?: string
  has_logs?: boolean
  maintenance_status?: string | null
  scheduled_job_id?: number | null
  archive_name?: string | null
  progress_details?: {
    original_size: number
    compressed_size: number
    deduplicated_size: number
    nfiles: number
    current_file: string
    progress_percent: number
    backup_speed: number
    total_expected_size: number
    estimated_time_remaining: number
  }
}

interface BackupHistorySectionProps {
  backupJobs: BackupJob[]
  scheduledJobs: ScheduledJob[]
  repositories: Repository[]
  isLoading: boolean
  canBreakLocks?: boolean
  canDeleteJobs?: boolean
  filterSchedule: number | 'all'
  filterRepository: string | 'all'
  filterStatus: string | 'all'
  onFilterScheduleChange: (value: number | 'all') => void
  onFilterRepositoryChange: (value: string | 'all') => void
  onFilterStatusChange: (value: string | 'all') => void
}

const BackupHistorySection: React.FC<BackupHistorySectionProps> = ({
  backupJobs,
  scheduledJobs,
  repositories,
  isLoading,
  canBreakLocks = false,
  canDeleteJobs = false,
  filterSchedule,
  filterRepository,
  filterStatus,
  onFilterScheduleChange,
  onFilterRepositoryChange,
  onFilterStatusChange,
}) => {
  const { trackNavigation, EventAction } = useAnalytics()
  const { t } = useTranslation()

  const filteredBackupJobs = backupJobs.filter((job: BackupJob) => {
    if (filterSchedule !== 'all' && job.scheduled_job_id !== filterSchedule) return false
    if (filterRepository !== 'all' && job.repository !== filterRepository) return false
    if (filterStatus !== 'all') {
      if (filterStatus === 'completed' && job.status !== 'completed') return false
      if (filterStatus === 'failed' && job.status !== 'failed') return false
      if (filterStatus === 'warning' && job.status !== 'completed_with_warnings') return false
    }
    return true
  })

  const hasFilters = filterSchedule !== 'all' || filterRepository !== 'all' || filterStatus !== 'all'

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <p className="text-base font-semibold">{t('backupHistory.title')}</p>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? t('backupHistory.showingFiltered', { filtered: filteredBackupJobs.length, total: backupJobs.length })
              : t('backupHistory.showing', { filtered: filteredBackupJobs.length, total: backupJobs.length })}
          </p>
        </div>
        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="font-bold flex-shrink-0"
            onClick={() => {
              onFilterScheduleChange('all')
              onFilterRepositoryChange('all')
              onFilterStatusChange('all')
              trackNavigation(EventAction.FILTER, { section: 'backup_history', filter_kind: 'reset' })
            }}
          >
            {t('common.clearFilters', { defaultValue: 'Clear filters' })}
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="mb-5 flex flex-wrap gap-3 items-center">
        <Select
          value={String(filterSchedule)}
          onValueChange={(v) => {
            const value = v === 'all' ? 'all' : Number(v)
            onFilterScheduleChange(value as number | 'all')
            trackNavigation(EventAction.FILTER, { section: 'backup_history', filter_kind: 'schedule', filter_value: value })
          }}
        >
          <SelectTrigger className="flex-1 min-w-[150px] sm:min-w-[150px] text-sm font-semibold h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('backupHistory.allSchedules')}</SelectItem>
            {scheduledJobs.map((job) => (
              <SelectItem key={job.id} value={String(job.id)}>{job.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-[2] min-w-[200px]">
          <RepoSelect
            repositories={repositories}
            value={filterRepository}
            onChange={(v) => {
              onFilterRepositoryChange(v as string)
              trackNavigation(EventAction.FILTER, { section: 'backup_history', filter_kind: 'repository', filter_value: v as string })
            }}
            valueKey="path"
            size="small"
            hidePath
            label=""
            placeholderLabel={t('backupHistory.allRepositories')}
            fallbackDisplayValue={t('backupHistory.allRepositories')}
            prefixItems={<SelectItem value="all">{t('backupHistory.allRepositories')}</SelectItem>}
          />
        </div>

        <Select
          value={filterStatus}
          onValueChange={(v) => {
            onFilterStatusChange(v)
            trackNavigation(EventAction.FILTER, { section: 'backup_history', filter_kind: 'status', filter_value: v })
          }}
        >
          <SelectTrigger className="flex-1 min-w-[140px] text-sm font-semibold h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('backupHistory.allStatus')}</SelectItem>
            <SelectItem value="completed">{t('backupHistory.completed')}</SelectItem>
            <SelectItem value="failed">{t('backupHistory.failed')}</SelectItem>
            <SelectItem value="warning">{t('backupHistory.warning')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BackupJobsTable
        jobs={filteredBackupJobs}
        repositories={repositories || []}
        loading={isLoading}
        actions={{ viewLogs: true, cancel: true, downloadLogs: true, errorInfo: true, delete: true }}
        canBreakLocks={canBreakLocks}
        canDeleteJobs={canDeleteJobs}
        getRowKey={(job) => String(job.id)}
        enableHover={true}
        tableId="schedule"
        emptyState={{ icon: <Clock size={48} />, title: t('backupHistory.noJobsFound') }}
      />
    </div>
  )
}

export default BackupHistorySection
