import React from 'react'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatRelativeTime } from '../utils/dateUtils'
import { Repository } from '../types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface UpcomingJob {
  id: number
  name: string
  repository?: string
  repository_id?: number
  repository_ids?: number[]
  next_run: string
  cron_expression: string
}

interface UpcomingJobsTableProps {
  upcomingJobs: UpcomingJob[]
  repositories: Repository[]
  isLoading: boolean
  onRunNow?: (jobId: number) => void
  getRepositoryName: (path: string) => string
}

const UpcomingJobsTable: React.FC<UpcomingJobsTableProps> = ({
  upcomingJobs,
  repositories,
  getRepositoryName,
}) => {
  const { t } = useTranslation()

  if (upcomingJobs.length === 0) return null

  const getRepoLabel = (job: UpcomingJob): string => {
    if (job.repository_ids && job.repository_ids.length > 0) {
      return t('upcomingJobs.repositories', { count: job.repository_ids.length })
    }
    if (job.repository_id) {
      return repositories.find((r) => r.id === job.repository_id)?.name || 'Unknown'
    }
    return getRepositoryName(job.repository || '')
  }

  return (
    <div className="mb-6">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {t('upcomingJobs.title')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {upcomingJobs.slice(0, 5).map((job) => (
          <Tooltip key={job.id}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-muted/30 transition-all duration-150 cursor-default hover:bg-muted/50">
                {/* Left accent bar */}
                <div className="w-0.5 h-8 rounded-full flex-shrink-0 bg-primary" />

                {/* Name + repo */}
                <div className="flex-1 min-w-0 flex items-center gap-3 overflow-hidden">
                  <p className="text-sm font-semibold truncate flex-shrink-0">{job.name}</p>
                  <p className="text-[0.8rem] text-muted-foreground truncate min-w-0">{getRepoLabel(job)}</p>
                </div>

                {/* Countdown */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md flex-shrink-0 bg-muted">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-[0.75rem] font-bold leading-none text-foreground">
                    {formatRelativeTime(job.next_run)}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>{formatDate(job.next_run)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

export default UpcomingJobsTable
