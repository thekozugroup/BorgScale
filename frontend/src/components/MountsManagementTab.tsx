import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HardDrive, XCircle, Trash2, FolderOpen, Copy, Info } from 'lucide-react'
import { mountsAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import { getApiErrorDetail } from '../utils/apiErrors'
import { translateBackendKey } from '../utils/translateBackendKey'
import { formatDate } from '../utils/dateUtils'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'

interface Mount {
  mount_id: string
  mount_point: string
  mount_type: string
  source: string
  created_at: string
  job_id: number | null
  repository_id: number | null
  connection_id: number | null
}

const desktopGridTemplate = 'minmax(0, 1.2fr) minmax(0, 1fr) 180px 100px'

function MountCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="hidden md:grid items-center gap-2 px-4 py-[0.9rem] border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: desktopGridTemplate }}
    >
      <div>
        <Skeleton className="h-3.5 rounded mb-1.5" style={{ width: [160, 200, 140, 180, 152][index % 5] }} />
        <Skeleton className="h-3 rounded" style={{ width: [80, 100, 70, 90, 85][index % 5] }} />
      </div>
      <Skeleton className="h-3.5 rounded w-28" />
      <Skeleton className="h-3.5 rounded w-20" />
      <div className="flex gap-1 justify-end">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
    </div>
  )
}

function MountCard({
  mount,
  onCopy,
  onUnmount,
  onForceUnmount,
}: {
  mount: Mount
  onCopy: (mount: Mount) => void
  onUnmount: (mount: Mount) => void
  onForceUnmount: (mount: Mount) => void
}) {
  const { t } = useTranslation()

  const parts = mount.source.split('::')
  const archiveName = parts.length > 1 ? parts[1] : parts[0]
  const repoName = parts.length > 1 ? parts[0] : ''

  const iconBtn = (variant: 'info' | 'warning' | 'destructive') => {
    const colorClass =
      variant === 'info'
        ? 'text-primary hover:bg-primary/10'
        : variant === 'warning'
          ? 'text-foreground hover:bg-muted'
          : 'text-destructive hover:bg-destructive/10'
    return `flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150 flex-shrink-0 ${colorClass}`
  }

  return (
    <div
      className="border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-muted/30"
      style={{
        display: 'grid',
        gridTemplateColumns: desktopGridTemplate,
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.5625rem 1rem',
      }}
    >
      {/* Archive name + repo */}
      <div className="min-w-0">
        <div
          title={mount.source}
          className="text-xs font-semibold overflow-hidden text-ellipsis whitespace-nowrap font-mono"
        >
          {archiveName}
        </div>
        {repoName && (
          <span
            className="text-2xs text-muted-foreground opacity-70 block mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {repoName}
          </span>
        )}
      </div>

      {/* Mount point */}
      <span
        title={mount.mount_point}
        className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap min-w-0 font-mono"
      >
        {mount.mount_point}
      </span>

      {/* Mounted date */}
      <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
        {formatDate(mount.created_at)}
      </span>

      {/* Actions */}
      <TooltipProvider>
        <div className="flex items-center gap-0.5 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onCopy(mount)}
                aria-label={t('mounts.actions.copyAccessCommand')}
                className={iconBtn('info')}
              >
                <Copy size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('mounts.actions.copyAccessCommand')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onUnmount(mount)}
                aria-label={t('mounts.actions.unmountArchive')}
                className={iconBtn('warning')}
              >
                <Trash2 size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('mounts.actions.unmountArchive')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onForceUnmount(mount)}
                aria-label={t('mounts.actions.forceUnmountTooltip')}
                className={iconBtn('destructive')}
              >
                <XCircle size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('mounts.actions.forceUnmountTooltip')}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}

export default function MountsManagementTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { track, EventCategory, EventAction } = useAnalytics()
  const { hasGlobalPermission } = useAuth()
  const canManageMounts = hasGlobalPermission('settings.mounts.manage')

  const { data: mountsData, isLoading } = useQuery({
    queryKey: ['mounts'],
    queryFn: async () => {
      const response = await mountsAPI.listMounts()
      return response.data
    },
    enabled: canManageMounts,
    refetchInterval: 10000,
  })

  const unmountMutation = useMutation({
    mutationFn: ({ mountId, force }: { mountId: string; force: boolean }) =>
      mountsAPI.unmountBorgArchive(mountId, force),
    onSuccess: () => {
      toast.success(t('mountsManagement.unmountedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['mounts'] })
    },
    onError: (error: unknown) => {
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('mountsManagement.failedToUnmount')
      )
    },
  })

  const mounts: Mount[] = mountsData || []

  const handleUnmount = (mountId: string, force: boolean = false) => {
    track(EventCategory.MOUNT, force ? EventAction.DELETE : EventAction.UNMOUNT, {
      operation: force ? 'force_unmount' : 'unmount',
    })
    unmountMutation.mutate({ mountId, force })
  }

  const copyToClipboard = (mount: Mount) => {
    const containerName = 'borg-web-ui'
    const command = `docker exec -it ${containerName} bash -c "cd ${mount.mount_point} && bash"`
    navigator.clipboard.writeText(command)
    toast.success(t('mounts.copiedToClipboard', { label: t('mounts.actions.accessCommand') }))
    track(EventCategory.MOUNT, EventAction.VIEW, { operation: 'copy_access_command' })
  }

  if (!canManageMounts) {
    return null
  }

  const tableHeader = (
    <div
      className="hidden md:grid items-center gap-2 px-4 py-2 text-2xs font-semibold uppercase tracking-widest text-muted-foreground bg-foreground/[0.02] border-b border-foreground/[0.08]"
      style={{ gridTemplateColumns: desktopGridTemplate }}
    >
      <span>{t('mounts.columns.archive')}</span>
      <span>{t('mounts.columns.mountLocation')}</span>
      <span>{t('mounts.columns.mounted')}</span>
      <span className="text-right">{t('archivesList.columnActions', 'Actions')}</span>
    </div>
  )

  const panelHeader = (countBadge: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-2 px-4 py-3 mb-6 rounded-xl bg-primary/[0.07] border border-primary/20">
      <div className="flex items-center gap-3 flex-shrink-0">
        <HardDrive size={16} style={{ opacity: 0.7 }} />
        <p className="text-sm font-bold">{t('mountsManagement.title')}</p>
        {countBadge}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center text-muted-foreground opacity-60 hover:opacity-100 transition-opacity duration-150 cursor-help"
            >
              <Info size={15} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('mounts.infoAlert')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  if (isLoading) {
    return (
      <div>
        {panelHeader(
          <Skeleton className="h-5 w-5 rounded" />
        )}
        <div className="rounded-2xl overflow-hidden border border-foreground/[0.07]">
          {tableHeader}
          {[0, 1, 2, 3, 4].map((i) => (
            <MountCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    )
  }

  const countBadge = (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded text-muted-foreground bg-foreground/[0.07]"
      style={{ lineHeight: 1.6 }}
    >
      {mounts.length}
    </span>
  )

  return (
    <div>
      {panelHeader(countBadge)}

      {mounts.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 text-muted-foreground">
          <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p className="text-sm font-medium">{t('mountsManagement.empty')}</p>
          <p className="text-sm opacity-70 mt-1.5 max-w-sm">
            {t('mounts.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-foreground/[0.07]">
          {tableHeader}
          {mounts.map((mount) => (
            <MountCard
              key={mount.mount_id}
              mount={mount}
              onCopy={copyToClipboard}
              onUnmount={(m) => handleUnmount(m.mount_id, false)}
              onForceUnmount={(m) => handleUnmount(m.mount_id, true)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
