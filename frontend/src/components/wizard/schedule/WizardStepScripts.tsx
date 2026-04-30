import React from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ScriptSelectorSection from '../../ScriptSelectorSection'
import { Script } from '../../ScheduleWizard'

interface WizardStepScriptsData {
  preBackupScriptId: number | null
  postBackupScriptId: number | null
  preBackupScriptParameters: Record<string, string>
  postBackupScriptParameters: Record<string, string>
  runRepositoryScripts: boolean
}

interface WizardStepScriptsProps {
  data: WizardStepScriptsData
  scripts: Script[]
  repositoryCount: number
  onChange: (updates: Partial<WizardStepScriptsData>) => void
}

const WizardStepScripts: React.FC<WizardStepScriptsProps> = ({
  data,
  scripts,
  repositoryCount,
  onChange,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="relative group">
          <button
            type="button"
            tabIndex={0}
            aria-label={t('wizard.scheduleWizard.scripts.scheduleLevelNote')}
            className="inline-flex cursor-help text-muted-foreground hover:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <Info size={15} />
          </button>
          {/* Tooltip popup */}
          <div className="absolute right-6 top-0 z-10 hidden group-hover:block group-focus-within:block w-max max-w-xs bg-popover text-popover-foreground text-xs rounded-lg border px-2.5 py-2 shadow-md">
            {t('wizard.scheduleWizard.scripts.scheduleLevelNote')}
          </div>
        </div>
      </div>

      {repositoryCount > 0 ? (
        <ScriptSelectorSection
          preBackupScriptId={data.preBackupScriptId}
          postBackupScriptId={data.postBackupScriptId}
          preBackupScriptParameters={data.preBackupScriptParameters}
          postBackupScriptParameters={data.postBackupScriptParameters}
          runRepositoryScripts={data.runRepositoryScripts}
          scripts={scripts}
          onPreChange={(id) => onChange({ preBackupScriptId: id })}
          onPostChange={(id) => onChange({ postBackupScriptId: id })}
          onPreParametersChange={(params) => onChange({ preBackupScriptParameters: params })}
          onPostParametersChange={(params) => onChange({ postBackupScriptParameters: params })}
          onRunRepoScriptsChange={(value) => onChange({ runRepositoryScripts: value })}
          size="medium"
        />
      ) : (
        <Alert>
          <AlertDescription>
            {t('wizard.scheduleWizard.scripts.selectRepoFirst')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default WizardStepScripts
