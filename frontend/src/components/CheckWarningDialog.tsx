import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Lock, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ResponsiveDialog from './ResponsiveDialog'

interface CheckWarningDialogProps {
  open: boolean
  repositoryName: string
  borgVersion?: number
  onConfirm: (maxDuration: number) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function CheckWarningDialog({
  open,
  repositoryName,
  borgVersion,
  onConfirm,
  onCancel,
  isLoading = false,
}: CheckWarningDialogProps) {
  const { t } = useTranslation()
  const [maxDuration, setMaxDuration] = useState<number>(3600)
  const isBorg2 = borgVersion === 2

  return (
    <ResponsiveDialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-muted-foreground flex-shrink-0" />
          <h3 className="text-lg font-semibold">{t('dialogs.checkWarning.title')}</h3>
        </div>

        <p className="text-sm mb-3">
          {t('dialogs.checkWarning.description', { repositoryName })}
        </p>

        <div className="mb-3">
          <p className="text-sm font-semibold mb-2">{t('dialogs.checkWarning.important')}</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <Lock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium">{t('dialogs.checkWarning.repoWillBeLocked')}</span>
                <span className="block text-xs text-muted-foreground">{t('dialogs.checkWarning.otherOperationsUnavailable')}</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <CheckCircle2 size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium">{t('dialogs.checkWarning.progressTracking')}</span>
                <span className="block text-xs text-muted-foreground">{t('dialogs.checkWarning.progressTrackingDetail')}</span>
              </span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t('dialogs.checkWarning.otherReposAccessible')}
        </p>

        <div className="mb-4 flex flex-col gap-1">
          <Label>{t('dialogs.checkWarning.maxDurationLabel')}</Label>
          <Input
            type="number"
            value={maxDuration}
            onChange={(e) => {
              const value = parseInt(e.target.value)
              setMaxDuration(isNaN(value) ? 3600 : value)
            }}
            min={0}
          />
          <p className="text-xs text-muted-foreground">{t('dialogs.checkWarning.maxDurationHelper')}</p>
        </div>

        {isBorg2 && (
          <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
            <p className="text-sm font-medium leading-snug">{t('dialogs.checkWarning.borg2InlineNotice')}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={t('dialogs.checkWarning.borg2TooltipTitle')} className="inline-flex items-center cursor-pointer">
                  <Info size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{t('dialogs.checkWarning.borg2TooltipTitle')}</p>
                <p className="mt-1 text-xs">{t('dialogs.checkWarning.borg2PartialCheckNotice')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            {t('dialogs.checkWarning.cancel')}
          </Button>
          <Button
            onClick={() => onConfirm(maxDuration)}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <CheckCircle2 size={16} className="mr-2" />
            )}
            {isLoading ? t('status.running') : t('dialogs.checkWarning.confirm')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
