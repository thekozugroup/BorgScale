import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import CronBuilder from './CronBuilder'
import AdvancedDisclosure from './wizard/AdvancedDisclosure'
import { describeCronHuman } from '../utils/dateUtils'
import api from '../services/api'
import { cronMatchesPreset } from './cronPresets'

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
  const { t, i18n } = useTranslation()
  const effectiveLabel = label ?? t('cronExpressionInput.label')
  const fontSizeCls = size === 'medium' ? 'text-lg' : 'text-sm'
  const inputId = 'cron-expression-input'

  // Live human-readable description via cronstrue
  const description = useMemo(
    () => describeCronHuman(value, i18n.resolvedLanguage),
    [value, i18n.resolvedLanguage],
  )

  // Live "Next N runs" preview from the backend. Debounced 300 ms so we
  // don't hammer the server while the user types in the advanced raw input.
  const [nextRuns, setNextRuns] = useState<string[] | null>(null)
  const [previewError, setPreviewError] = useState<boolean>(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value || !value.trim()) {
      setNextRuns(null)
      setPreviewError(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      api
        .get<{ expression: string; next_runs: string[] }>(
          '/schedule/preview',
          {
            params: { expr: value, count: 3 },
          },
        )
        .then((resp) => {
          setNextRuns(resp.data.next_runs)
          setPreviewError(false)
        })
        .catch(() => {
          setNextRuns(null)
          setPreviewError(true)
        })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  const forceAdvancedOpen = !cronMatchesPreset(value)

  return (
    <div className="w-full flex flex-col gap-2">
      {effectiveLabel && (
        <Label
          htmlFor={inputId}
          className={
            required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : ''
          }
        >
          {effectiveLabel}
        </Label>
      )}

      {/* Visual preset tabs are the primary UI */}
      <div data-testid="cron-preset-tabs">
        <CronBuilder value={value || '0 2 * * *'} onChange={onChange} />
      </div>

      {/* Plain-English description (cronstrue) */}
      {description && (
        <p
          className="text-sm text-foreground/80"
          data-testid="cron-description"
        >
          {description}
        </p>
      )}

      {/* Next 3 runs preview */}
      {nextRuns && nextRuns.length > 0 && (
        <div className="text-xs text-muted-foreground" data-testid="cron-next-runs">
          <span className="font-medium">{t('cronExpressionInput.nextRuns')}:</span>
          <ul className="mt-1 ml-4 list-disc">
            {nextRuns.map((iso) => (
              <li key={iso} className="font-mono">
                {new Date(iso).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
      {previewError && (
        <p className="text-xs text-destructive" data-testid="cron-preview-error">
          {t('errors.invalidCronExpression', {
            defaultValue: 'Schedule is not valid.',
          })}
        </p>
      )}

      {/* Raw cron syntax under Advanced disclosure */}
      <AdvancedDisclosure
        labelKey="cronExpressionInput.advancedLabel"
        forceOpen={forceAdvancedOpen ? true : undefined}
        testId="cron-advanced-disclosure"
      >
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder="0 2 * * *"
          className={cn('font-mono tracking-[0.1em]', fontSizeCls)}
          aria-label={effectiveLabel}
        />
        {helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </AdvancedDisclosure>
    </div>
  )
}

export default CronExpressionInput
