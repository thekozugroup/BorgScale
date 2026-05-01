import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy } from 'lucide-react'
import ResponsiveDialog from './ResponsiveDialog'
import StatusBadge from './StatusBadge'
import { TerminalLogViewer, TerminalLogViewerHandle } from './TerminalLogViewer'
import { activityAPI } from '../services/api'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface JobWithLogs {
  id: string | number
  status: string
  type?: string
}

interface LogViewerDialogProps<T extends JobWithLogs> {
  job: T | null
  open: boolean
  onClose: () => void
  jobTypeLabel?: string
}

export default function LogViewerDialog<T extends JobWithLogs>({
  job,
  open,
  onClose,
  jobTypeLabel,
}: LogViewerDialogProps<T>) {
  const { t } = useTranslation()
  const jobType = job?.type || 'backup'
  const jobId = job?.id
  const displayLabel =
    jobTypeLabel || (job?.type ? getTypeLabel(job.type, t) : t('logViewer.typeBackup'))

  const logViewerRef = useRef<TerminalLogViewerHandle>(null)
  const [currentStatus, setCurrentStatus] = useState(job?.status || 'unknown')

  useEffect(() => {
    setCurrentStatus(job?.status || 'unknown')
  }, [job?.id, job?.status])

  useEffect(() => {
    if (!open || !jobId || currentStatus !== 'running') return
    const poll = async () => {
      try {
        const response = await activityAPI.list({ job_type: jobType, limit: 100 })
        const items: Array<{ id: number; type: string; status: string }> = response.data
        const item = items.find((i) => String(i.id) === String(jobId) && i.type === jobType)
        if (item && item.status !== 'running') setCurrentStatus(item.status)
      } catch {
        // ignore
      }
    }
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [open, jobId, jobType, currentStatus])

  const handleFetchLogs = useCallback(
    async (offset: number) => {
      if (!jobId) return { lines: [], total_lines: 0, has_more: false }
      const response = await activityAPI.getLogs(jobType, jobId, offset)
      return response.data
    },
    [jobType, jobId]
  )

  // Keep ResponsiveDialog mounted even when job is null so Radix receives the
  // open→false transition and releases body pointer-events before unmounting.
  const realOpen = open && !!job

  const footer = (
    <div className="hidden md:flex justify-end px-5 py-3">
      <Button variant="outline" onClick={onClose}>
        {t('dialogs.logViewer.close')}
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog open={realOpen} onClose={onClose} maxWidth="lg" fullWidth footer={footer}>
      {realOpen && job && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <p className="text-base font-semibold">
              {t('logViewer.title', { label: displayLabel, jobId: job.id })}
            </p>
            <StatusBadge status={currentStatus} />
            <div className="flex-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => logViewerRef.current?.copyLogs()}
                >
                  <Copy size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('terminalLogViewer.copyLogs')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Body */}
          <div className="px-5 pb-4 border-t border-border pt-3">
            <TerminalLogViewer
              ref={logViewerRef}
              jobId={String(job.id)}
              status={currentStatus}
              jobType={jobType}
              showHeader={false}
              onFetchLogs={handleFetchLogs}
            />
          </div>
        </>
      )}
    </ResponsiveDialog>
  )
}

function getTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'backup': return t('logViewer.typeBackup')
    case 'restore': return t('logViewer.typeRestore')
    case 'check': return t('logViewer.typeCheck')
    case 'compact': return t('logViewer.typeCompact')
    case 'prune': return t('logViewer.typePrune')
    case 'package': return t('logViewer.typePackage')
    default: return type.charAt(0).toUpperCase() + type.slice(1)
  }
}
