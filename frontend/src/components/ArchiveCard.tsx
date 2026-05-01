import { FolderOpen, RotateCcw, HardDrive, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../utils/dateUtils'
import { Archive } from '../types'
import { getArchiveType } from '../utils/archiveGrouping'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ArchiveCardProps {
  archive: Archive
  onView: (archive: Archive) => void
  onRestore: (archive: Archive) => void
  onMount: (archive: Archive) => void
  onDelete: (archiveName: string) => void
  mountDisabled?: boolean
  canDelete?: boolean
}

export default function ArchiveCard({
  archive,
  onView,
  onRestore,
  onMount,
  onDelete,
  mountDisabled = false,
  canDelete = true,
}: ArchiveCardProps) {
  const { t } = useTranslation()
  const isManual = getArchiveType(archive) === 'manual'
  const archiveTime = archive.start || archive.time

  return (
    <TooltipProvider>
      <div
        className={cn(
          'grid items-center gap-2 px-4 py-[9px]',
          'border-b border-b-border',
          'transition-all duration-150 hover:bg-foreground/[0.02]',
          // Desktop: 4-col grid; Mobile: 2-col 2-row
          'md:grid-cols-[minmax(0,1fr)_76px_minmax(180px,220px)_132px]',
          'grid-cols-[1fr_auto] grid-rows-[auto_auto]'
        )}
      >
        {/* Archive name */}
        <div
          title={archive.name}
          className={cn(
            'font-mono text-xs font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap min-w-0',
            'col-start-1 row-start-1'
          )}
        >
          {archive.name}
        </div>

        {/* Type badge */}
        <div className="row-start-2 col-start-1 md:row-auto md:col-auto flex items-center gap-1.5 min-w-0">
          <Badge
            variant="outline"
            className={cn(
              'h-[18px] text-2xs font-bold tracking-wider px-1.5 shrink-0',
              isManual
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            {isManual
              ? t('archivesList.manualAbbr', 'Manual')
              : t('archivesList.scheduledAbbr', 'Scheduled')}
          </Badge>
          {/* Date shown inline with badge on mobile */}
          <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis md:hidden">
            {formatDate(archiveTime)}
          </span>
        </div>

        {/* Date shown in its own column on desktop */}
        <span className="hidden md:block text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          {formatDate(archiveTime)}
        </span>

        {/* Actions */}
        <div
          className={cn(
            'flex items-center gap-0.5 min-w-0 justify-end',
            'col-start-2 row-start-1 row-span-2 md:row-span-1 self-center'
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onView(archive)}
                aria-label={t('archiveCard.viewContents')}
                className="text-muted-foreground/60 hover:text-foreground hover:bg-accent size-7 rounded-[6px]"
              >
                <FolderOpen size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('archiveCard.viewContents')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onRestore(archive)}
                aria-label={t('archiveCard.restore')}
                className="text-muted-foreground/60 hover:text-foreground hover:bg-accent size-7 rounded-[6px]"
              >
                <RotateCcw size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('archiveCard.restore')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onMount(archive)}
                disabled={mountDisabled}
                aria-label={t('archiveCard.mount')}
                className="text-muted-foreground/60 hover:text-foreground hover:bg-accent size-7 rounded-[6px] disabled:opacity-30"
              >
                <HardDrive size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('archiveCard.mount')}</TooltipContent>
          </Tooltip>

          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onDelete(archive.name)}
                  aria-label={t('archiveCard.delete')}
                  className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 dark:text-destructive/40 dark:hover:text-destructive dark:hover:bg-destructive/12 size-7 rounded-[6px]"
                >
                  <Trash2 size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('archiveCard.delete')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
