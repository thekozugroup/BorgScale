import { RefreshCw, CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatTimeRange, formatDurationSeconds, formatRelativeTime } from '../utils/dateUtils'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RestoreJob {
  id: number
  repository: string
  archive: string
  destination: string
  status: string
  started_at?: string
  completed_at?: string
  progress?: number
  error_message?: string
  progress_details?: {
    nfiles: number
    current_file: string
    progress_percent: number
    restore_speed: number
    estimated_time_remaining: number
  }
}

interface RestoreJobCardProps {
  job: RestoreJob
  showJobId?: boolean
}

const ICON_SIZE = 14

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return <RefreshCw size={ICON_SIZE} className="animate-spin" />
    case 'completed':
      return <CheckCircle size={ICON_SIZE} />
    case 'completed_with_warnings':
      return <AlertTriangle size={ICON_SIZE} />
    case 'failed':
      return <AlertCircle size={ICON_SIZE} />
    default:
      return <Clock size={ICON_SIZE} />
  }
}

type StatusKey = 'running' | 'completed' | 'completed_with_warnings' | 'failed'

const STATUS_COLORS: Record<StatusKey, string> = {
  running: 'bg-secondary text-secondary-foreground border-border',
  completed: 'bg-primary/10 text-primary border-primary/20',
  completed_with_warnings: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
}

const getStatusColorCls = (status: string): string => {
  return STATUS_COLORS[status as StatusKey] ?? 'bg-muted text-muted-foreground border-border'
}

const getStatusLabel = (status: string, t: (key: string) => string): string => {
  switch (status) {
    case 'completed':
      return t('restoreJobCard.completed')
    case 'completed_with_warnings':
      return t('restoreJobCard.completedWithWarnings')
    case 'failed':
      return t('status.failed')
    case 'running':
      return t('restoreJobCard.restoringFiles')
    default:
      return t('status.pending')
  }
}

export default function RestoreJobCard({ job, showJobId = true }: RestoreJobCardProps) {
  const { t } = useTranslation()

  const getArchiveName = (archiveName: string) => {
    const timestampPattern = /-\d{4}-\d{2}-\d{2}T[\d:.]+$/
    return archiveName.replace(timestampPattern, '')
  }

  const getDurationText = () => {
    if (!job.started_at || !job.completed_at) return null
    const duration = formatTimeRange(job.started_at, job.completed_at, job.status)
    if (duration === '0 sec' || duration === '0 min') return null
    return duration
  }

  return (
    <div>
      {showJobId && (
        <p className="text-sm font-medium mb-2">
          {t('restoreJobCard.title')} #{job.id}
        </p>
      )}

      {/* Single-line layout */}
      <div className="flex items-center gap-3 flex-wrap" style={{ rowGap: '6px' }}>
        {/* Archive → Destination */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm font-semibold truncate font-mono text-xs">
            {getArchiveName(job.archive)}
          </span>
          <span className="text-muted-foreground text-xs shrink-0">→</span>
          <span className="text-sm text-muted-foreground truncate font-mono text-xs min-w-0">
            {job.destination}
          </span>
        </div>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn(
            'h-[22px] text-2xs font-semibold tracking-[0.02em] gap-1 px-1.5 border',
            getStatusColorCls(job.status)
          )}
        >
          <span className="flex items-center">{getStatusIcon(job.status)}</span>
          {getStatusLabel(job.status, t)}
        </Badge>

        {/* Time + duration */}
        {job.completed_at && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm text-muted-foreground text-xs">
              {formatRelativeTime(job.completed_at)}
            </span>
            {getDurationText() && (
              <>
                <span className="inline-block size-[3px] rounded-full bg-border shrink-0" />
                <span className="text-sm text-muted-foreground text-xs">
                  {getDurationText()}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Running: elapsed time */}
      {job.status === 'running' && job.started_at && !job.completed_at && (
        <p className="text-sm text-muted-foreground text-xs mt-1">
          {formatTimeRange(job.started_at, job.completed_at, job.status)}
        </p>
      )}

      {/* Error alert */}
      {job.status === 'failed' && job.error_message && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-sm text-destructive whitespace-pre-wrap">
            {job.error_message
              .split('\n')
              .map((line) => translateBackendKey(line))
              .join('\n')}
          </p>
        </div>
      )}

      {/* Running: current file */}
      {job.status === 'running' && job.progress_details?.current_file && (
        <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium text-foreground">
            {t('restoreJobCard.currentFile')}
          </p>
          <p className="text-xs mt-1 font-mono break-all text-muted-foreground">
            {job.progress_details.current_file}
          </p>
        </div>
      )}

      {/* Running: progress stats */}
      {job.status === 'running' && job.progress_details && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mt-3">
          <div>
            <p className="text-sm text-muted-foreground">{t('restoreJobCard.filesRestored')}</p>
            <p className="text-sm font-medium">{job.progress_details.nfiles?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('restoreJobCard.progress')}</p>
            <p className="text-sm font-medium text-primary">
              {job.progress_details.progress_percent?.toFixed(1) || '0'}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('restoreJobCard.speed')}</p>
            <p className="text-sm font-medium text-primary">
              {job.progress_details.restore_speed
                ? `${job.progress_details.restore_speed.toFixed(2)} MB/s`
                : 'N/A'}
            </p>
          </div>
          {(job.progress_details.estimated_time_remaining || 0) > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">{t('restoreJobCard.eta')}</p>
              <p className="text-sm font-medium text-foreground">
                {formatDurationSeconds(job.progress_details.estimated_time_remaining || 0)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
