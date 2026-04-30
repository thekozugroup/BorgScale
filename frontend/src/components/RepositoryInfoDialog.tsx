import { useEffect, useState } from 'react'
import { HardDrive, Lock, Calendar, Download, Info, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { formatDateShort } from '../utils/dateUtils'
import { repositoriesAPI } from '../services/api'
import RepositoryStatsV1 from './RepositoryStatsV1'
import RepositoryStatsV2, { type ArchiveEntry } from './RepositoryStatsV2'
import type { CacheStats } from './RepositoryStatsV1'
import { Repository } from '../types'
import { isV2Repo } from '../utils/repoCapabilities'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RepositoryInfo {
  encryption?: {
    mode?: string
  }
  repository?: {
    last_modified?: string
    location?: string
  }
  cache?: {
    stats?: CacheStats
  }
  // Borg 2: per-archive stats (from `borg2 info --json`)
  archives?: ArchiveEntry[]
}

interface RepositoryInfoDialogProps {
  open: boolean
  repository: Repository | null
  repositoryInfo: RepositoryInfo | null
  isLoading: boolean
  onClose: () => void
}

export default function RepositoryInfoDialog({
  open,
  repository,
  repositoryInfo,
  isLoading,
  onClose,
}: RepositoryInfoDialogProps) {
  const { t } = useTranslation()
  const [displayRepository, setDisplayRepository] = useState<Repository | null>(repository)
  const [displayRepositoryInfo, setDisplayRepositoryInfo] = useState<RepositoryInfo | null>(
    repositoryInfo
  )

  useEffect(() => {
    if (repository) {
      setDisplayRepository(repository)
    }
  }, [repository])

  useEffect(() => {
    if (repositoryInfo) {
      setDisplayRepositoryInfo(repositoryInfo)
    }
  }, [repositoryInfo])

  useEffect(() => {
    if (!open && !repository) {
      const timeout = window.setTimeout(() => {
        setDisplayRepository(null)
        setDisplayRepositoryInfo(null)
      }, 225)

      return () => window.clearTimeout(timeout)
    }
  }, [open, repository])

  const handleDownloadKeyfile = async () => {
    if (!displayRepository) return
    try {
      const response = await repositoriesAPI.downloadKeyfile(displayRepository.id)
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `borg_keyfile_${displayRepository.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (err: unknown) {
      let message = t('repositoryInfoDialog.failedToDownloadKeyfile')
      const errData = (err as { response?: { data?: unknown } })?.response?.data
      if (errData instanceof Blob) {
        try {
          const text = await errData.text()
          const json = JSON.parse(text)
          message = json.detail || message
        } catch {
          // ignore parse errors
        }
      } else if (errData && typeof errData === 'object') {
        message = (errData as { detail?: string }).detail || message
      }
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Dialog Header */}
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <HardDrive size={18} className="text-primary" />
            {displayRepository?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Dialog Body */}
        <div className="overflow-y-auto p-6">
          {displayRepository && (
            <>
              {isLoading ? (
                <div className="flex flex-col items-center py-16">
                  <p className="text-sm text-muted-foreground">
                    {t('dialogs.repositoryInfo.loadingInfo')}
                  </p>
                </div>
              ) : displayRepositoryInfo ? (
                <div className="flex flex-col gap-5">
                  {/* Repository Details Cards */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {/* Encryption */}
                    <div className="rounded-lg border bg-purple-50/60 p-3.5 dark:bg-purple-950/20">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Lock size={20} className="text-purple-700 dark:text-purple-400" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {t('dialogs.repositoryInfo.encryption')}
                          </span>
                        </div>
                        {displayRepository?.has_keyfile && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleDownloadKeyfile}
                                aria-label={t('dialogs.repositoryInfo.exportKeyfileTooltip')}
                                className={cn(
                                  'inline-flex size-7.5 items-center justify-center rounded-md',
                                  'bg-purple-700 text-white transition-transform',
                                  'hover:scale-110 hover:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-800'
                                )}
                              >
                                <Download size={14} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('dialogs.repositoryInfo.exportKeyfileTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="ml-8 text-base font-bold text-purple-700 dark:text-purple-400">
                        {displayRepositoryInfo.encryption?.mode || 'N/A'}
                      </p>
                    </div>

                    {/* Last Modified */}
                    <div className="rounded-lg border bg-sky-50/60 p-3.5 dark:bg-sky-950/20">
                      <div className="mb-2 flex items-center gap-2.5">
                        <Calendar size={20} className="text-sky-700 dark:text-sky-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t('dialogs.repositoryInfo.lastModified')}
                        </span>
                      </div>
                      <p className="ml-8 text-sm font-semibold text-sky-700 dark:text-sky-400">
                        {displayRepositoryInfo.repository?.last_modified
                          ? formatDateShort(displayRepositoryInfo.repository.last_modified)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="rounded-lg border bg-card p-3.5">
                    <p className="mb-1 text-xs text-muted-foreground">
                      {t('dialogs.repositoryInfo.repositoryLocation')}
                    </p>
                    <p className="break-all font-mono text-sm">
                      {displayRepositoryInfo.repository?.location || 'N/A'}
                    </p>
                  </div>

                  {/* Storage Statistics */}
                  {isV2Repo(displayRepository) ? (
                    <RepositoryStatsV2 archives={displayRepositoryInfo.archives || []} />
                  ) : displayRepositoryInfo.cache?.stats &&
                    (displayRepositoryInfo.cache.stats.total_size ?? 0) > 0 ? (
                    <RepositoryStatsV1 stats={displayRepositoryInfo.cache.stats} />
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-50/50 p-4 dark:bg-blue-950/20">
                      <Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t('dialogs.repositoryInfo.noBackupsYet')}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {t('repositoryInfoDialog.noArchivesDescription')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-destructive"
                  />
                  <p className="text-sm text-destructive">
                    {t('repositoryInfoDialog.failedToLoad')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="hidden md:flex">
          <Button onClick={onClose}>{t('dialogs.repositoryInfo.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
