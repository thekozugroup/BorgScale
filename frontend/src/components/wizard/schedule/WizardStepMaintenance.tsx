import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PruneSettingsInput, { PruneSettings } from '../../PruneSettingsInput'

interface WizardStepMaintenanceData {
  runPruneAfter: boolean
  runCompactAfter: boolean
  pruneKeepHourly: number
  pruneKeepDaily: number
  pruneKeepWeekly: number
  pruneKeepMonthly: number
  pruneKeepQuarterly: number
  pruneKeepYearly: number
}

interface WizardStepMaintenanceProps {
  data: WizardStepMaintenanceData
  onChange: (updates: Partial<WizardStepMaintenanceData>) => void
}

const WizardStepMaintenance: React.FC<WizardStepMaintenanceProps> = ({ data, onChange }) => {
  const { t } = useTranslation()
  const [pruneOpen, setPruneOpen] = useState(data.runPruneAfter)

  // Keep pruneOpen in sync when parent flips runPruneAfter
  const handlePruneToggle = (checked: boolean) => {
    onChange({ runPruneAfter: checked })
    setPruneOpen(checked)
  }

  const handlePruneSettingsChange = (values: PruneSettings) => {
    onChange({
      pruneKeepHourly: values.keepHourly,
      pruneKeepDaily: values.keepDaily,
      pruneKeepWeekly: values.keepWeekly,
      pruneKeepMonthly: values.keepMonthly,
      pruneKeepQuarterly: values.keepQuarterly,
      pruneKeepYearly: values.keepYearly,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold">
            {t('wizard.scheduleWizard.maintenance.title')}
          </h3>
          <div className="relative group">
            <button
              type="button"
              tabIndex={0}
              aria-label={t('wizard.scheduleWizard.maintenance.info')}
              className="inline-flex cursor-help text-muted-foreground hover:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <Info size={15} />
            </button>
            <div aria-hidden="true" className="absolute left-6 top-0 z-10 hidden group-hover:block group-focus-within:block w-max max-w-xs bg-popover text-popover-foreground text-xs rounded-lg border px-2.5 py-2 shadow-md">
              {t('wizard.scheduleWizard.maintenance.info')}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('wizard.scheduleWizard.maintenance.subtitle')}
        </p>
      </div>

      {/* Prune after backup */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Switch
            id="run-prune-after"
            checked={data.runPruneAfter}
            onCheckedChange={handlePruneToggle}
          />
          <label htmlFor="run-prune-after" className="flex flex-col cursor-pointer">
            <span className="text-sm font-semibold">
              {t('wizard.scheduleWizard.maintenance.pruneAfterBackup')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('wizard.scheduleWizard.maintenance.pruneAfterBackupDesc')}
            </span>
          </label>
        </div>

        {pruneOpen && (
          <div className="pl-10 pt-2 flex flex-col gap-3">
            <PruneSettingsInput
              values={{
                keepHourly: data.pruneKeepHourly,
                keepDaily: data.pruneKeepDaily,
                keepWeekly: data.pruneKeepWeekly,
                keepMonthly: data.pruneKeepMonthly,
                keepQuarterly: data.pruneKeepQuarterly,
                keepYearly: data.pruneKeepYearly,
              }}
              onChange={handlePruneSettingsChange}
            />
            <Alert>
              <AlertDescription>
                <strong>Caution:</strong>{' '}
                {t('wizard.scheduleWizard.maintenance.pruneCaution')}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* Compact after prune */}
      <div>
        <div className="flex items-center gap-3">
          <Switch
            id="run-compact-after"
            checked={data.runCompactAfter}
            onCheckedChange={(checked) => onChange({ runCompactAfter: checked })}
          />
          <label htmlFor="run-compact-after" className="flex flex-col cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {t('wizard.scheduleWizard.maintenance.compactAfterPrune')}
              </span>
              <div className="relative group">
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={t('wizard.scheduleWizard.maintenance.compactInfo')}
                  className="inline-flex cursor-help text-muted-foreground hover:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <Info size={14} />
                </button>
                <div aria-hidden="true" className="absolute left-6 top-0 z-10 hidden group-hover:block group-focus-within:block w-max max-w-xs bg-popover text-popover-foreground text-xs rounded-lg border px-2.5 py-2 shadow-md">
                  {t('wizard.scheduleWizard.maintenance.compactInfo')}
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {t('wizard.scheduleWizard.maintenance.compactAfterPruneDesc')}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default WizardStepMaintenance
