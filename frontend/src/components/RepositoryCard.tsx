import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, isTomorrow, isToday, isThisYear } from 'date-fns'
import {
  Info,
  ShieldCheck,
  Package2,
  Scissors,
  FolderOpen,
  Play,
  Trash2,
  Pencil,
  Archive,
  HardDrive,
  Clock,
  ScanSearch,
  RefreshCw,
} from 'lucide-react'
import { useMaintenanceJobs } from '../hooks/useMaintenanceJobs'
import BorgVersionChip from './BorgVersionChip'
import { getRepoCapabilities } from '../utils/repoCapabilities'
import { formatDateShort, formatDateTimeFull, formatElapsedTime } from '../utils/dateUtils'
import { useQueryClient } from '@tanstack/react-query'
import { useAnalytics } from '../hooks/useAnalytics'
import { Repository } from '../types'
import type { RepoAction } from '../hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RepositoryCardProps {
  repository: Repository
  isInJobsSet: boolean
  onViewInfo: () => void
  onCheck: () => void
  onCompact: () => void
  onPrune: () => void
  onEdit: () => void
  onDelete: () => void
  onBackupNow: () => void
  onViewArchives: () => void
  getCompressionLabel: (compression: string) => string
  canManageRepository?: boolean
  canDo: (action: RepoAction) => boolean
  onJobCompleted?: (repositoryId: number) => void
}

const STAT_ICONS = [
  <Archive size={11} />,
  <HardDrive size={11} />,
  <Clock size={11} />,
  <ScanSearch size={11} />,
]

const STAT_COLOR_CLASSES = [
  'text-primary/70',
  'text-primary/60',
  'text-muted-foreground/80',
  'text-muted-foreground/70',
] as const

export default function RepositoryCard({
  repository,
  isInJobsSet,
  onViewInfo,
  onCheck,
  onCompact,
  onPrune,
  onEdit,
  onDelete,
  onBackupNow,
  onViewArchives,
  getCompressionLabel,
  canManageRepository = false,
  canDo,
  onJobCompleted,
}: RepositoryCardProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { trackRepository, trackBackup, trackArchive, EventAction } = useAnalytics()

  const capabilities = getRepoCapabilities(repository)
  const { hasRunningJobs, checkJob, compactJob, pruneJob } = useMaintenanceJobs(repository.id, true)
  const isMaintenanceRunning = hasRunningJobs

  const [elapsedTime, setElapsedTime] = useState('')

  useEffect(() => {
    if (!hasRunningJobs) {
      setElapsedTime('')
      return
    }
    const startTime = checkJob?.started_at || compactJob?.started_at || pruneJob?.started_at
    if (!startTime) return
    setElapsedTime(formatElapsedTime(startTime))
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(startTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [hasRunningJobs, checkJob?.started_at, compactJob?.started_at, pruneJob?.started_at])

  useEffect(() => {
    if (!hasRunningJobs && isInJobsSet) {
      onJobCompleted?.(repository.id)
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
    }
  }, [hasRunningJobs, isInJobsSet, repository.id, onJobCompleted, queryClient])

  const keyStats = [
    {
      label: t('repositoryCard.archives'),
      value: String(repository.archive_count ?? 0),
      tooltip: '',
    },
    {
      label: t('repositoryCard.totalSize'),
      value: repository.total_size || 'N/A',
      tooltip: '',
    },
    {
      label: t('repositoryCard.lastBackup'),
      value: repository.last_backup ? formatDateShort(repository.last_backup) : t('common.never'),
      tooltip: repository.last_backup ? formatDateTimeFull(repository.last_backup) : '',
    },
    {
      label: t('repositoryCard.lastCheck'),
      value: repository.last_check ? formatDateShort(repository.last_check) : t('common.never'),
      tooltip: repository.last_check ? formatDateTimeFull(repository.last_check) : '',
    },
  ]

  const metaItems = [
    { label: t('repositoryCard.encryption'), value: repository.encryption },
    {
      label: t('repositoryCard.compression'),
      value: getCompressionLabel(repository.compression ?? ''),
    },
    {
      label: t('repositoryCard.lastCompact'),
      value: repository.last_compact ? formatDateShort(repository.last_compact) : t('common.never'),
      tooltip: repository.last_compact ? formatDateTimeFull(repository.last_compact) : '',
    },
    ...(repository.source_directories?.length
      ? [
          {
            label: t('repositoryCard.sourcePaths'),
            value: `${repository.source_directories.length} ${
              repository.source_directories.length === 1
                ? t('repositoryCard.path')
                : t('repositoryCard.paths')
            }`,
            tooltip: '',
          },
        ]
      : []),
  ]

  const scheduleBadge = (() => {
    if (!repository.has_schedule) return null

    if (repository.schedule_enabled === false) {
      return {
        label: t('repositoryCard.schedulePaused'),
        title: repository.schedule_name
          ? t('repositoryCard.schedulePausedWithName', { name: repository.schedule_name })
          : t('repositoryCard.schedulePaused'),
        variant: 'warning' as const,
      }
    }

    if (!repository.next_run) return null

    const nextRunDate = new Date(repository.next_run)
    let whenLabel = format(
      nextRunDate,
      isThisYear(nextRunDate) ? 'MMM d · h:mm a' : 'MMM d, yyyy · h:mm a'
    )
    if (isToday(nextRunDate)) {
      whenLabel = format(nextRunDate, 'h:mm a')
    } else if (isTomorrow(nextRunDate)) {
      whenLabel = `${t('repositoryCard.tomorrow')} · ${format(nextRunDate, 'h:mm a')}`
    }

    return {
      label: t('repositoryCard.nextBackupBadge', { when: whenLabel }),
      title: repository.schedule_name
        ? t('repositoryCard.nextBackupWithName', {
            name: repository.schedule_name,
            when: formatDateTimeFull(repository.next_run),
          })
        : t('repositoryCard.nextBackupBadge', { when: formatDateTimeFull(repository.next_run) }),
      variant: 'success' as const,
    }
  })()

  const iconBtnBase =
    'inline-flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-card',
        isMaintenanceRunning
          ? 'shadow-[0_0_0_1px_theme(colors.border),0_4px_16px_theme(colors.black/20)] ring-1 ring-border'
          : 'shadow-[0_0_0_1px_theme(colors.border),0_2px_8px_theme(colors.black/7%)] dark:shadow-[0_0_0_1px_theme(colors.border),0_4px_16px_theme(colors.black/25%)]',
        'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5',
        isMaintenanceRunning
          ? 'hover:shadow-[0_0_0_1px_theme(colors.border),0_8px_24px_theme(colors.black/28)]'
          : 'hover:shadow-[0_0_0_1px_theme(colors.border),0_8px_24px_theme(colors.black/12)]'
      )}
    >
      {/* Ambient glow when maintenance running */}
      {isMaintenanceRunning && (
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-8 h-24 w-40 animate-pulse rounded-full bg-foreground/5 blur-3xl"
        />
      )}

      <div className="px-4 pb-3.5 pt-4 sm:px-5">
        {/* ── Header ── */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.9rem] font-bold leading-snug">{repository.name}</span>
                {repository.mode === 'observe' && (
                  <Badge variant="secondary" className="h-4.5 px-1.5 text-[0.65rem]">
                    {t('repositoryCard.observeOnly')}
                  </Badge>
                )}
                <BorgVersionChip borgVersion={repository.borg_version} />
              </div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 max-w-[46%] sm:max-w-[42%]">
              {scheduleBadge && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={scheduleBadge.variant === 'warning' ? 'outline' : 'outline'}
                      className={cn(
                        'h-5 max-w-[140px] shrink truncate px-2 text-[0.64rem] font-bold sm:max-w-[170px]',
                        scheduleBadge.variant === 'warning'
                          ? 'border-border bg-muted text-muted-foreground'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      {scheduleBadge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="left">{scheduleBadge.title}</TooltipContent>
                </Tooltip>
              )}

              {canManageRepository && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onEdit}
                      aria-label={t('repositoryCard.edit')}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded border-0 bg-transparent text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">{t('repositoryCard.edit')}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <p
            title={repository.path}
            className="truncate font-mono text-[0.7rem] text-muted-foreground/60"
          >
            {repository.path}
          </p>
        </div>

        {/* ── Key Stats Band ── */}
        <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-border/60 bg-muted/30 sm:grid-cols-4">
          {keyStats.map((stat, i) => {
            const isRightColXs = i % 2 === 1
            const isLastSm = i === keyStats.length - 1
            const isFirstRowXs = i < 2
            return (
              <Tooltip key={stat.label}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'cursor-default px-3 py-2.5',
                      !isLastSm && 'border-r border-border/60 sm:border-r',
                      isFirstRowXs && 'border-b border-border/60 sm:border-b-0',
                      isRightColXs && 'border-r-0 sm:border-r',
                      isLastSm && 'border-r-0',
                      stat.tooltip && 'cursor-help'
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1">
                      <span className={cn('flex items-center', STAT_COLOR_CLASSES[i])}>
                        {STAT_ICONS[i]}
                      </span>
                      <span
                        className={cn(
                          'text-[0.58rem] font-bold uppercase tracking-[0.07em] leading-none',
                          STAT_COLOR_CLASSES[i]
                        )}
                      >
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-[0.85rem] font-semibold tabular-nums leading-none">
                      {stat.value}
                    </span>
                  </div>
                </TooltipTrigger>
                {stat.tooltip && <TooltipContent>{stat.tooltip}</TooltipContent>}
              </Tooltip>
            )
          })}
        </div>

        {/* ── Secondary Metadata ── */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 px-0.5">
          {metaItems.map((m) => (
            <Tooltip key={m.label}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1',
                    m.tooltip ? 'cursor-help' : 'cursor-default'
                  )}
                >
                  <span className="text-[0.68rem] leading-none text-muted-foreground/70">
                    {m.label}:
                  </span>
                  <span className="text-[0.68rem] font-semibold leading-none text-muted-foreground">
                    {m.value}
                  </span>
                </div>
              </TooltipTrigger>
              {m.tooltip && <TooltipContent>{m.tooltip}</TooltipContent>}
            </Tooltip>
          ))}
        </div>

        {/* ── Action Bar ── */}
        <div className="flex items-center gap-1.5 border-t border-border/60 pt-3">
          {/* Left icon cluster */}
          <div className="flex flex-1 items-center gap-0.5">
            {canDo('view') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      type="button"
                      onClick={() => {
                        trackRepository(EventAction.VIEW, repository)
                        onViewInfo()
                      }}
                      aria-label={t('repositoryCard.buttons.info')}
                      disabled={isMaintenanceRunning}
                      className={cn(
                        iconBtnBase,
                        'text-primary/55 hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      <Info size={16} />
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('repositoryCard.buttons.info')}</TooltipContent>
              </Tooltip>
            )}

            {canDo('maintenance') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      type="button"
                      onClick={onCheck}
                      aria-label={t('repositoryCard.buttons.check')}
                      disabled={isMaintenanceRunning}
                      className={cn(
                        iconBtnBase,
                        checkJob
                          ? 'bg-primary/10 text-primary hover:bg-primary/18 hover:text-primary'
                          : 'text-muted-foreground/55 hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {checkJob ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('repositoryCard.buttons.check')}</TooltipContent>
              </Tooltip>
            )}

            {canDo('maintenance') && capabilities.canCompact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      type="button"
                      onClick={onCompact}
                      aria-label={t('repositoryCard.buttons.compact')}
                      disabled={isMaintenanceRunning}
                      className={cn(
                        iconBtnBase,
                        compactJob
                          ? 'bg-primary/10 text-primary hover:bg-primary/18 hover:text-primary'
                          : 'text-neutral-500/55 hover:bg-neutral-500/10 hover:text-neutral-600 dark:hover:text-neutral-400'
                      )}
                    >
                      {compactJob ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Package2 size={16} />
                      )}
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('repositoryCard.buttons.compact')}</TooltipContent>
              </Tooltip>
            )}

            {canDo('maintenance') && capabilities.canPrune && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      type="button"
                      onClick={onPrune}
                      aria-label={t('repositoryCard.buttons.prune')}
                      disabled={isMaintenanceRunning}
                      className={cn(
                        iconBtnBase,
                        pruneJob
                          ? 'bg-primary/10 text-primary hover:bg-primary/18 hover:text-primary'
                          : 'text-muted-foreground/55 hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {pruneJob ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Scissors size={16} />
                      )}
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('repositoryCard.buttons.prune')}</TooltipContent>
              </Tooltip>
            )}

            {canDo('view') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      type="button"
                      onClick={() => {
                        trackArchive(EventAction.VIEW, repository)
                        onViewArchives()
                      }}
                      aria-label={t('repositoryCard.buttons.viewArchives')}
                      disabled={isMaintenanceRunning}
                      className={cn(
                        iconBtnBase,
                        'text-muted-foreground/55 hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <FolderOpen size={16} />
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('repositoryCard.buttons.viewArchives')}</TooltipContent>
              </Tooltip>
            )}

            {/* Delete — separated with a vertical rule */}
            {canManageRepository && capabilities.canDeleteRepository && (
              <>
                <div className="mx-0.5 h-4.5 w-px shrink-0 bg-border/70" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onDelete}
                      aria-label={t('repositoryCard.buttons.delete')}
                      className={cn(
                        iconBtnBase,
                        'text-destructive/60 hover:bg-destructive/10 hover:text-destructive'
                      )}
                    >
                      <Trash2 size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('repositoryCard.buttons.delete')}</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Primary action — Backup Now */}
          {canDo('backup') && repository.mode === 'full' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    onClick={() => {
                      trackBackup(EventAction.START, undefined, repository)
                      onBackupNow()
                    }}
                    disabled={isMaintenanceRunning}
                    className="h-7.5 shrink-0 px-2 text-[0.78rem] disabled:bg-muted disabled:text-muted-foreground sm:px-3"
                  >
                    <Play size={13} />
                    <span className="hidden sm:inline">{t('repositoryCard.buttons.backupNow')}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              {!isMaintenanceRunning && (
                <TooltipContent>{t('repositoryCard.buttons.backupNow')}</TooltipContent>
              )}
            </Tooltip>
          )}
        </div>

        {/* ── Running State Message ── */}
        {(checkJob?.progress_message || compactJob?.progress_message || elapsedTime) && (
          <div className="mt-3 rounded-md border border-border bg-muted/50 px-3 py-2">
            {(checkJob?.progress_message || compactJob?.progress_message) && (
              <p className="block font-mono text-[0.72rem] text-foreground">
                {checkJob?.progress_message || compactJob?.progress_message}
              </p>
            )}
            {elapsedTime && (
              <p className="mt-0.5 block text-xs text-muted-foreground">{elapsedTime}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
