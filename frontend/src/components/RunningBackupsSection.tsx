import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity, Archive, Clock, Database, Eye, FileText, HardDrive, RefreshCw, Square, Zap,
} from 'lucide-react'
import { BackupJob } from '../types'
import {
  formatBytes as formatBytesUtil,
  formatDurationSeconds,
  formatTimeRange,
} from '../utils/dateUtils'
import { Button } from '@/components/ui/button'

// ACCENT_BACKUP replaced with semantic token classes below

interface RunningBackupsSectionProps {
  runningBackupJobs: BackupJob[]
  onCancelBackup: (jobId: string | number) => void
  isCancelling: boolean
  onViewLogs?: (job: BackupJob) => void
}

const STAT_ICONS = [
  <FileText size={11} />,
  <HardDrive size={11} />,
  <Archive size={11} />,
  <Zap size={11} />,
  <Database size={11} />,
  <Activity size={11} />,
  <Clock size={11} />,
]

// STAT_COLORS removed — replaced with uniform muted-foreground styling below

const RunningBackupsSection: React.FC<RunningBackupsSectionProps> = ({
  runningBackupJobs,
  onCancelBackup,
  isCancelling,
  onViewLogs,
}) => {
  const { t } = useTranslation()

  const getVisibleStats = (job: BackupJob) =>
    [
      { key: 'filesProcessed', label: t('backup.runningJobs.progress.filesProcessed'), value: job.progress_details?.nfiles?.toLocaleString() || job.processed_files?.toLocaleString() || '0' },
      { key: 'originalSize', label: t('backup.runningJobs.progress.originalSize'), value: job.progress_details?.original_size ? formatBytesUtil(job.progress_details.original_size) : job.processed_size || 'Unknown' },
      { key: 'compressed', label: t('backup.runningJobs.progress.compressed'), value: job.progress_details?.compressed_size !== undefined ? formatBytesUtil(job.progress_details.compressed_size) : null },
      { key: 'deduplicated', label: t('backup.runningJobs.progress.deduplicated'), value: job.progress_details?.deduplicated_size !== undefined ? formatBytesUtil(job.progress_details.deduplicated_size) : null },
      { key: 'totalSourceSize', label: t('backup.runningJobs.progress.totalSourceSize'), value: job.progress_details?.total_expected_size && job.progress_details.total_expected_size > 0 ? formatBytesUtil(job.progress_details.total_expected_size) : 'Unknown' },
      { key: 'speed', label: t('backup.runningJobs.progress.speed'), value: job.status === 'running' && job.progress_details?.backup_speed ? `${job.progress_details.backup_speed.toFixed(2)} MB/s` : 'N/A' },
      { key: 'eta', label: t('backup.runningJobs.progress.eta'), value: (job.progress_details?.estimated_time_remaining || 0) > 0 ? formatDurationSeconds(job.progress_details?.estimated_time_remaining || 0) : 'N/A' },
    ].filter((stat) => stat.value !== null)

  if (runningBackupJobs.length === 0) return null

  return (
    <div
      className="mb-6 rounded-lg overflow-hidden border border-border shadow-sm"
    >
      <div className="px-4 sm:px-6 pt-4 pb-5 bg-background">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="text-primary flex">
            <RefreshCw size={16} className="animate-spin" />
          </div>
          <p className="text-base font-semibold">{t('backup.runningJobs.title')}</p>
          <div
            className="px-2 py-0.5 rounded-full text-[0.7rem] font-bold bg-primary/10 border border-primary/20 text-primary"
            style={{ lineHeight: 1.5 }}
          >
            {runningBackupJobs.length}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{t('backup.runningJobs.subtitle')}</p>

        <div className="flex flex-col gap-4">
          {runningBackupJobs.map((job: BackupJob) => {
            const visibleStats = getVisibleStats(job)
            const progress = job.progress || 0
            const stageLabel =
              progress === 0 ? t('backup.runningJobs.progress.initializing')
                : progress >= 100 ? t('backup.runningJobs.progress.finalizing')
                : t('backup.runningJobs.progress.processing')

            const processed = job.progress_details?.original_size ?? 0
            const total = job.progress_details?.total_expected_size ?? 0
            const showProgress = processed > 0 && total > 0
            const pct = showProgress ? Math.min(100, (processed / total) * 100) : 0

            return (
              <div
                key={job.id}
                className="relative rounded-lg overflow-hidden bg-primary/5 shadow-[inset_0_0_0_1px_theme(colors.border)]"
              >
                {/* Ambient glow blob */}
                <div
                  className="pointer-events-none absolute bg-primary/10"
                  style={{
                    top: -60, right: -40, width: 200, height: 140,
                    borderRadius: '50%',
                    filter: 'blur(55px)',
                    animation: 'blobPulseJob 3s ease-in-out infinite',
                  }}
                />

                <div className="px-4 sm:px-5 pt-4 pb-4">
                  {/* Header row */}
                  <div className="flex justify-between items-start gap-4 mb-4 flex-wrap sm:flex-nowrap">
                    {/* Left */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" style={{ animation: 'liveDot 2s ease-in-out infinite' }} />
                        <p className="font-bold text-base leading-tight">{t('backup.runningJobs.jobTitle', { id: job.id })}</p>
                        <div className="px-1.5 py-0.5 rounded text-[0.62rem] font-bold uppercase tracking-[0.05em] leading-none bg-primary/10 border border-primary/20 text-primary">
                          {stageLabel}
                        </div>
                        {job.maintenance_status && (
                          <div className="px-1.5 py-0.5 rounded text-[0.62rem] font-bold uppercase tracking-[0.05em] leading-none bg-muted text-muted-foreground border border-border">
                            {job.maintenance_status}
                          </div>
                        )}
                      </div>
                      <p className="text-[0.69rem] truncate text-foreground/30" style={{ fontFamily: '"JetBrains Mono","Fira Code",ui-monospace,monospace' }}>
                        {job.repository}
                      </p>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">{formatTimeRange(job.started_at, job.completed_at, job.status)}</span>
                      {onViewLogs && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 border-primary/30 text-primary"
                          onClick={() => onViewLogs(job)}
                        >
                          <Eye size={12} />
                          {t('backup.runningJobs.viewLogs')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => {
                          onCancelBackup(job.id)
                        }}
                        disabled={isCancelling}
                      >
                        <Square size={12} />
                        {t('backup.runningJobs.cancel')}
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {showProgress && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[0.68rem] font-semibold text-primary">{pct.toFixed(1)}%</span>
                        <span className="text-[0.65rem] text-muted-foreground">{t('backup.runningJobs.progress.totalSourceSize')}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  {visibleStats.length > 0 && (
                    <div
                      className="grid rounded-md overflow-hidden mb-3 border border-border"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(visibleStats.length, 4)}, 1fr)`,
                      }}
                    >
                      {visibleStats.map((stat, i) => (
                        <div
                          key={stat.key}
                          className="px-3 py-2 bg-background/60"
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-muted-foreground/70 flex items-center">{STAT_ICONS[i]}</span>
                            <span className="text-[0.58rem] font-bold uppercase tracking-[0.07em] leading-none text-muted-foreground/70">{stat.label}</span>
                          </div>
                          <p className="text-[0.85rem] font-semibold truncate tabular-nums">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Current file */}
                  {job.progress_details?.current_file && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded overflow-hidden bg-muted/50 border border-border"
                    >
                      <span className="text-primary/60 flex shrink-0"><FileText size={13} /></span>
                      <p className="text-[0.72rem] text-muted-foreground truncate flex-1 min-w-0" style={{ fontFamily: '"JetBrains Mono","Fira Code",ui-monospace,monospace' }}>
                        {job.progress_details.current_file}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RunningBackupsSection
