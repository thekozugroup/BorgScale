import ResponsiveDialog from './ResponsiveDialog'
import { AlertCircle, Unlock, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { repositoriesAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LockErrorDialogProps {
  open: boolean
  onClose: () => void
  repositoryId: number
  repositoryName: string
  borgVersion?: 1 | 2
  onLockBroken?: () => void
  canBreakLock?: boolean
}

export default function LockErrorDialog({
  open,
  onClose,
  repositoryId,
  repositoryName,
  borgVersion: _borgVersion,
  onLockBroken,
  canBreakLock = false,
}: LockErrorDialogProps) {
  const { t } = useTranslation()
  const [breaking, setBreaking] = useState(false)

  const handleBreakLock = async () => {
    if (!window.confirm(t('dialogs.lockError.breakLockWarning'))) return
    setBreaking(true)
    try {
      await repositoriesAPI.breakLock(repositoryId)
      toast.success(t('dialogs.lockError.lockRemovedSuccess'))
      onLockBroken?.()
      onClose()
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any
    ) {
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('dialogs.lockError.failedToBreakLock')
      )
    } finally {
      setBreaking(false)
    }
  }

  const footer = (
    <div className="flex justify-end gap-2 px-5 py-3">
      <Button variant="outline" onClick={onClose} disabled={breaking}>
        {t('dialogs.lockError.cancel')}
      </Button>
      <Button
        variant="destructive"
        onClick={handleBreakLock}
        disabled={breaking || !canBreakLock}
        title={!canBreakLock ? 'Admin privileges required to break locks' : ''}
        className="gap-1.5"
      >
        {breaking ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
        {breaking ? t('status.running') : t('dialogs.lockError.breakLock')}
      </Button>
    </div>
  )

  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm" fullWidth footer={footer}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <AlertCircle size={24} className="flex-shrink-0 text-destructive" />
        <div>
          <p className="text-base font-semibold leading-tight">{t('dialogs.lockError.title')}</p>
          <p className="text-sm text-muted-foreground">
            {t('dialogs.lockError.lockedDescription', { repositoryName })}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-4 space-y-3">
        <Alert>
          <AlertDescription>{t('dialogs.lockError.staleLockInfo')}</AlertDescription>
        </Alert>

        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <strong>{t('dialogs.lockError.whatCausesThis')}</strong>
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
            <li>{t('dialogs.lockError.causeInterrupted')}</li>
            <li>{t('dialogs.lockError.causeNetworkDrop')}</li>
            <li>{t('dialogs.lockError.causeContainerRestart')}</li>
            <li>{t('dialogs.lockError.causeCacheLocks')}</li>
          </ul>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <strong>{t('dialogs.lockError.beforeBreaking')}</strong>
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
            <li>{t('dialogs.lockError.beforeBreakingCheck1')}</li>
            <li>{t('dialogs.lockError.beforeBreakingCheck2')}</li>
            <li>{t('dialogs.lockError.beforeBreakingCheck3')}</li>
          </ul>
        </div>

        {!canBreakLock && (
          <Alert>
            <AlertDescription>
              <strong>{t('dialogs.lockError.adminRequired')}</strong>{' '}
              {t('dialogs.lockError.adminRequiredDetail')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ResponsiveDialog>
  )
}
