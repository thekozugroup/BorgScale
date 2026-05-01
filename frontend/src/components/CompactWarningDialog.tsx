import { useTranslation } from 'react-i18next'
import { AlertTriangle, Lock, Loader2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ResponsiveDialog from './ResponsiveDialog'

interface CompactWarningDialogProps {
  open: boolean
  repositoryName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function CompactWarningDialog({
  open,
  repositoryName,
  onConfirm,
  onCancel,
  isLoading = false,
}: CompactWarningDialogProps) {
  const { t } = useTranslation()
  return (
    <ResponsiveDialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-muted-foreground flex-shrink-0" />
          <h3 className="text-lg font-semibold">{t('dialogs.compactWarning.title')}</h3>
        </div>
        <p className="text-sm mb-2">{t('dialogs.compact.description', { repositoryName })}</p>
        <p className="text-sm text-muted-foreground mt-2">{t('dialogs.compact.explanation')}</p>

        <div className="mt-3">
          <p className="text-sm font-semibold mb-2">{t('dialogs.compact.important')}</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <Lock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium">{t('dialogs.compact.repoWillBeLocked')}</span>
                <span className="block text-xs text-muted-foreground">{t('dialogs.compact.otherOperationsUnavailable')}</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Minimize2 size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium">{t('dialogs.compact.progressTracking')}</span>
                <span className="block text-xs text-muted-foreground">{t('dialogs.compact.progressTrackingDetail')}</span>
              </span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground mt-3">{t('dialogs.compact.tip')}</p>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            {t('dialogs.compactWarning.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Minimize2 size={16} className="mr-2" />}
            {isLoading ? t('status.running') : t('dialogs.compactWarning.confirm')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
