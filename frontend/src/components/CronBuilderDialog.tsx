import React, { useState } from 'react'
import { Clock } from 'lucide-react'
import ResponsiveDialog from './ResponsiveDialog'
import CronBuilder from './CronBuilder'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CronBuilderDialogProps {
  value: string
  onChange: (cronExpression: string) => void
  label?: string
  helperText?: string
  buttonLabel?: string
  dialogTitle?: string
}

export const CronBuilderDialog: React.FC<CronBuilderDialogProps> = ({
  value,
  onChange,
  label,
  helperText,
  buttonLabel,
  dialogTitle,
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  const handleOpen = () => {
    setTempValue(value)
    setOpen(true)
  }

  const handleApply = () => {
    onChange(tempValue)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setOpen(false)
  }

  const footer = (
    <div className="flex justify-end gap-2 px-5 py-3">
      <Button variant="outline" onClick={handleCancel}>{t('common.buttons.cancel')}</Button>
      <Button
        onClick={handleApply}
        style={{ boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
      >
        {buttonLabel || t('cronBuilder.applySchedule')}
      </Button>
    </div>
  )

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleOpen}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t('cronBuilderDialog.openScheduleBuilder')}
          >
            <Clock size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{t('cronBuilderDialog.openScheduleBuilder')}</TooltipContent>
      </Tooltip>

      <ResponsiveDialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth footer={footer}>
        <div className="px-5 pt-5 pb-2">
          <p className="text-base font-semibold mb-4">{dialogTitle || t('cronBuilder.configureSchedule')}</p>
          <CronBuilder
            value={tempValue}
            onChange={setTempValue}
            label={label}
            helperText={helperText}
          />
        </div>
      </ResponsiveDialog>
    </>
  )
}

export default CronBuilderDialog
