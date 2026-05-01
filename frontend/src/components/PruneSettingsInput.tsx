import React from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface PruneSettings {
  keepHourly: number
  keepDaily: number
  keepWeekly: number
  keepMonthly: number
  keepQuarterly: number
  keepYearly: number
}

interface PruneSettingsInputProps {
  values: PruneSettings
  onChange: (values: PruneSettings) => void
  disabled?: boolean
}

const PruneSettingsInput: React.FC<PruneSettingsInputProps> = ({
  values,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation()
  const handleChange = (field: keyof PruneSettings, value: string) => {
    const parsedValue = parseInt(value, 10)
    const finalValue = isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
    onChange({ ...values, [field]: finalValue })
  }

  const fields: { key: keyof PruneSettings; label: string; hint: string }[] = [
    { key: 'keepHourly', label: t('pruneSettings.keepHourly'), hint: t('pruneSettings.keepHourlyHint') },
    { key: 'keepDaily', label: t('pruneSettings.keepDaily'), hint: t('pruneSettings.keepDailyHint') },
    { key: 'keepWeekly', label: t('pruneSettings.keepWeekly'), hint: t('pruneSettings.keepWeeklyHint') },
    { key: 'keepMonthly', label: t('pruneSettings.keepMonthly'), hint: t('pruneSettings.keepMonthlyHint') },
    { key: 'keepQuarterly', label: t('pruneSettings.keepQuarterly'), hint: t('pruneSettings.keepQuarterlyHint') },
    { key: 'keepYearly', label: t('pruneSettings.keepYearly'), hint: t('pruneSettings.keepYearlyHint') },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(({ key, label, hint }) => (
        <div key={key} className="flex flex-col gap-1">
          <Label htmlFor={`prune-${key}`}>{label}</Label>
          <Input
            id={`prune-${key}`}
            type="number"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            min={0}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      ))}
    </div>
  )
}

export default PruneSettingsInput
