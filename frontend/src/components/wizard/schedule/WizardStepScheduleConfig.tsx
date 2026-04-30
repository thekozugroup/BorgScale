import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import CronExpressionInput from '../../CronExpressionInput'
import ArchiveNameTemplateInput from '../../ArchiveNameTemplateInput'
import CronExpressionParser from 'cron-parser'

interface WizardStepScheduleConfigData {
  cronExpression: string
  archiveNameTemplate: string
}

interface WizardStepScheduleConfigProps {
  data: WizardStepScheduleConfigData
  jobName: string
  onChange: (updates: Partial<WizardStepScheduleConfigData>) => void
}

const WizardStepScheduleConfig: React.FC<WizardStepScheduleConfigProps> = ({
  data,
  jobName,
  onChange,
}) => {
  const { t } = useTranslation()

  const nextRunTimes = useMemo(() => {
    try {
      const interval = CronExpressionParser.parse(data.cronExpression)
      const times: string[] = []
      for (let i = 0; i < 3; i++) {
        times.push(interval.next().toDate().toLocaleString())
      }
      return times
    } catch {
      return null
    }
  }, [data.cronExpression])

  return (
    <div className="flex flex-col gap-4">
      <CronExpressionInput
        value={data.cronExpression}
        onChange={(cron) => onChange({ cronExpression: cron })}
        label={t('wizard.scheduleWizard.config.scheduleLabel')}
        helperText={t('wizard.scheduleWizard.config.scheduleHelper')}
        required
        size="medium"
      />

      {nextRunTimes && (
        <div className="flex items-center gap-2 pl-0.5">
          <div className="relative group">
            <button
              type="button"
              tabIndex={0}
              aria-label={t('wizard.scheduleWizard.config.nextRunTimes')}
              className="inline-flex cursor-help text-muted-foreground hover:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <Info size={14} />
            </button>
            {/* Tooltip popup */}
            <div className="absolute left-6 top-0 z-10 hidden group-hover:block group-focus-within:block w-max max-w-xs bg-popover text-popover-foreground text-xs rounded-lg border px-2.5 py-2 shadow-md">
              {nextRunTimes.map((time, index) => (
                <p key={index} className="font-mono opacity-90">
                  {time}
                </p>
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {t('wizard.scheduleWizard.config.nextRunTimes')} {nextRunTimes[0]}
          </span>
        </div>
      )}

      <ArchiveNameTemplateInput
        value={data.archiveNameTemplate}
        onChange={(template) => onChange({ archiveNameTemplate: template })}
        jobName={jobName || 'example-job'}
        size="medium"
      />
    </div>
  )
}

export default WizardStepScheduleConfig
