import React from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CronBuilderDialog from './CronBuilderDialog'

interface CronExpressionInputProps {
  value: string
  onChange: (cron: string) => void
  label?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
}

const CronExpressionInput: React.FC<CronExpressionInputProps> = ({
  value,
  onChange,
  label,
  helperText,
  required = false,
  disabled = false,
  size = 'medium',
}) => {
  const { t } = useTranslation()
  const effectiveLabel = label ?? t('cronExpressionInput.label')
  const fontSize = size === 'medium' ? '1.1rem' : '0.875rem'
  const inputId = 'cron-expression-input'

  return (
    <div className="w-full flex flex-col gap-1">
      {effectiveLabel && (
        <Label htmlFor={inputId} className={required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : ''}>
          {effectiveLabel}
        </Label>
      )}
      <div className="relative">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder="0 2 * * *"
          className="pr-10"
          style={{ fontFamily: 'monospace', fontSize, letterSpacing: '0.1em' }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <CronBuilderDialog
            value={value}
            onChange={onChange}
            dialogTitle={t('cronBuilderDialog.configureSchedule')}
          />
        </div>
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}

export default CronExpressionInput
