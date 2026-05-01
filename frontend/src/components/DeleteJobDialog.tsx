import ResponsiveDialog from './ResponsiveDialog'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DeleteJobDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  jobId?: string | number
  jobType?: string
}

export default function DeleteJobDialog({
  open,
  onClose,
  onConfirm,
  jobId,
  jobType = 'job',
}: DeleteJobDialogProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-destructive flex-shrink-0" />
          <h3 className="text-lg font-semibold">
            {jobType === 'backup'
              ? t('dialogs.deleteJob.titleBackup')
              : t('dialogs.deleteJob.titleJob')}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to permanently delete this {jobType} job entry
          {jobId && ` ${t('dialogs.deleteJob.jobId', { id: jobId })}`}?
        </p>

        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">{t('dialogs.deleteJob.warnings.undone')}</p>
            <p>
              • {t('dialogs.deleteJob.warnings.historyRemoved')}
              <br />• {t('dialogs.deleteJob.warnings.logsDeleted')}
              <br />• {t('dialogs.deleteJob.warnings.cannotRecover')}
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common.buttons.cancel')}</Button>
          <Button variant="destructive" onClick={onConfirm}>
            <AlertTriangle size={16} className="mr-2" />
            {t('dialogs.deleteJob.confirm')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
