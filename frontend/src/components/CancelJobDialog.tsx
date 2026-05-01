import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import ResponsiveDialog from './ResponsiveDialog'

interface CancelJobDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  jobId?: string | number
}

export default function CancelJobDialog({ open, onClose, onConfirm }: CancelJobDialogProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <div className="p-6 pt-6">
        <h3 className="text-lg font-semibold mb-2">{t('dialogs.cancelJob.title')}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t('dialogs.cancelJob.message')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common.buttons.cancel')}</Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('dialogs.cancelJob.confirm')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
