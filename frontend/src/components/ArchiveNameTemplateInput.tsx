import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface ArchiveNameTemplateInputProps {
  value: string
  onChange: (template: string) => void
  disabled?: boolean
  size?: 'small' | 'medium'
  jobName?: string
}

const ArchiveNameTemplateInput: React.FC<ArchiveNameTemplateInputProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'medium',
  jobName = 'example-job',
}) => {
  const { t } = useTranslation()
  const previewName = useMemo(() => {
    const now = new Date()
    const timestamp = Math.floor(now.getTime() / 1000)
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-')
    const isoString = now.toISOString().replace(/[:.]/g, '-').slice(0, -5)

    return value
      .replace(/{job_name}/g, jobName)
      .replace(/{now}/g, isoString)
      .replace(/{date}/g, date)
      .replace(/{time}/g, time)
      .replace(/{timestamp}/g, String(timestamp))
  }, [value, jobName])

  return (
    <div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="archive-name-template" className={size === 'medium' ? 'text-base' : 'text-sm'}>
          {t('archiveNameTemplate.label')}
        </Label>
        <Input
          id="archive-name-template"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={size === 'medium' ? 'font-mono text-lg' : 'font-mono text-sm'}
        />
        <p className="text-xs text-muted-foreground">{t('archiveNameTemplate.hint')}</p>
      </div>
      {value && (
        <Alert className="mt-4 font-mono text-sm">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('archiveNameTemplate.preview')}</strong> {previewName}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ArchiveNameTemplateInput
