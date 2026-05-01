import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import ScheduleJobCard from './ScheduleJobCard'

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

interface Repository {
  id: number
  name: string
  path: string
}

interface ScheduledJobsTableProps {
  jobs: ScheduledJob[]
  repositories: Repository[]
  isLoading: boolean
  canManageJob: (job: ScheduledJob) => boolean
  onEdit: (job: ScheduledJob) => void
  onDelete: (job: ScheduledJob) => void
  onDuplicate: (job: ScheduledJob) => void
  onRunNow: (job: ScheduledJob) => void
  onToggle: (job: ScheduledJob) => void
  isRunNowPending?: boolean
  isDuplicatePending?: boolean
  onCreateNew?: () => void
}

const ScheduledJobsTable = ({
  jobs,
  repositories,
  isLoading,
  canManageJob,
  onEdit,
  onDelete,
  onDuplicate,
  onRunNow,
  onToggle,
  isRunNowPending,
  isDuplicatePending,
  onCreateNew,
}: ScheduledJobsTableProps) => {
  const { t } = useTranslation()

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg bg-card border border-border overflow-hidden shadow-sm"
              style={{ opacity: Math.max(0.4, 1 - i * 0.2) }}
            >
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4">
                {/* Title row + badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Skeleton className="h-6 rounded" style={{ width: [150, 190, 130][i] }} />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Skeleton className="w-8 h-5 rounded-full" />
                    <Skeleton className="h-3.5 rounded" style={{ width: 48 }} />
                  </div>
                </div>

                {/* Stats grid — 4 columns */}
                <div className="grid grid-cols-4 rounded-md overflow-hidden mb-3 border border-border">
                  {[0, 1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className={cn('px-3 py-2.5', j < 3 ? 'border-r border-border' : '')}
                    >
                      <Skeleton className="h-2.5 mb-1.5 rounded" style={{ width: 38 }} />
                      <Skeleton className="h-4 rounded" style={{ width: [58, 48, 54, 44][j] }} />
                    </div>
                  ))}
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-1 pt-3 border-t border-border">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="w-22 h-7 rounded ml-auto" style={{ width: 88 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (jobs.length === 0) {
      return (
        <div className="py-12 flex flex-col items-center text-muted-foreground">
          <Clock size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
          <p className="text-base mb-1">{t('scheduledJobsTableSection.noJobsFound')}</p>
          <p className="text-sm text-muted-foreground">{t('scheduledJobsTableSection.noJobsDesc')}</p>
          {onCreateNew && (
            <div className="mt-4">
              <Button size="sm" onClick={onCreateNew}>{t('schedule.createBackup')}</Button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {jobs.map((job) => (
          <ScheduleJobCard
            key={job.id}
            job={job}
            repositories={repositories}
            canManage={canManageJob(job)}
            onEdit={() => onEdit(job)}
            onDelete={() => onDelete(job)}
            onDuplicate={() => onDuplicate(job)}
            onRunNow={() => onRunNow(job)}
            onToggle={() => onToggle(job)}
            isRunNowPending={isRunNowPending}
            isDuplicatePending={isDuplicatePending}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className="text-base font-semibold mb-4">{t('scheduledJobsTableSection.title')}</p>
      {renderContent()}
    </div>
  )
}

export default ScheduledJobsTable
