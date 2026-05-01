import { useTranslation } from 'react-i18next'
import { translateBackendKey } from '../utils/translateBackendKey'
import ResponsiveDialog from './ResponsiveDialog'
import StatusBadge from './StatusBadge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface JobWithError {
  id: string | number
  status: string
  error_message?: string | null
}

interface ErrorDetailsDialogProps<T extends JobWithError> {
  job: T | null
  open: boolean
  onClose: () => void
  onViewLogs?: (job: T) => void
}

export default function ErrorDetailsDialog<T extends JobWithError>({
  job,
  open,
  onClose,
  onViewLogs,
}: ErrorDetailsDialogProps<T>) {
  const { t } = useTranslation()

  const footer = (
    <div className="flex justify-end gap-2 px-5 py-3">
      <Button variant="outline" className="hidden md:inline-flex" onClick={onClose}>
        {t('dialogs.errorDetails.close')}
      </Button>
      {job && onViewLogs && (
        <Button
          onClick={() => {
            onClose()
            onViewLogs(job)
          }}
        >
          {t('dialogs.errorDetails.viewFullLogs')}
        </Button>
      )}
    </div>
  )

  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="md" fullWidth footer={footer}>
      {/* Header */}
      {job && (
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <p className="text-base font-semibold">
            {t('dialogs.errorDetails.title')} - Job #{job.id}
          </p>
          <StatusBadge status={job.status} />
        </div>
      )}

      {/* Body */}
      <div className="px-5 pb-4">
        {job && job.error_message && (
          <Alert variant="destructive">
            <AlertDescription>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {job.error_message
                  .split('\n')
                  .map((line) => translateBackendKey(line))
                  .join('\n')}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ResponsiveDialog>
  )
}
