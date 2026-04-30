import { useTranslation } from 'react-i18next'
import CompressionSettings from '../CompressionSettings'
import ExcludePatternInput from '../ExcludePatternInput'
import AdvancedRepositoryOptions from '../AdvancedRepositoryOptions'

type OnFailureMode = 'fail' | 'continue' | 'skip'

export interface BackupConfigStepData {
  compression: string
  excludePatterns: string[]
  customFlags: string
  remotePath: string
  preBackupScript: string
  postBackupScript: string
  preHookTimeout: number
  postHookTimeout: number
  hookFailureMode: OnFailureMode
}

interface WizardStepBackupConfigProps {
  repositoryId?: number | null
  dataSource: 'local' | 'remote'
  repositoryMode: 'full' | 'observe'
  data: BackupConfigStepData
  onChange: (data: Partial<BackupConfigStepData>) => void
  onBrowseExclude: () => void
}

export default function WizardStepBackupConfig({
  repositoryId,
  dataSource,
  repositoryMode,
  data,
  onChange,
  onBrowseExclude,
}: WizardStepBackupConfigProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      {/* Compression Settings */}
      <CompressionSettings
        value={data.compression}
        onChange={(value) => onChange({ compression: value })}
      />

      {/* Exclude Patterns */}
      <ExcludePatternInput
        patterns={data.excludePatterns}
        onChange={(patterns) => onChange({ excludePatterns: patterns })}
        onBrowseClick={onBrowseExclude}
      />

      {/* Info for remote data source */}
      {dataSource === 'remote' && (
        <p className="text-sm text-muted-foreground">
          {t('wizard.backupConfig.remoteSshfsNote')}
        </p>
      )}

      {/* Advanced Options */}
      <AdvancedRepositoryOptions
        repositoryId={repositoryId}
        mode={repositoryMode}
        remotePath={data.remotePath}
        preBackupScript={data.preBackupScript}
        postBackupScript={data.postBackupScript}
        preHookTimeout={data.preHookTimeout}
        postHookTimeout={data.postHookTimeout}
        hookFailureMode={data.hookFailureMode}
        customFlags={data.customFlags}
        onRemotePathChange={(value) => onChange({ remotePath: value })}
        onPreBackupScriptChange={(value) => onChange({ preBackupScript: value })}
        onPostBackupScriptChange={(value) => onChange({ postBackupScript: value })}
        onPreHookTimeoutChange={(value) => onChange({ preHookTimeout: value })}
        onPostHookTimeoutChange={(value) => onChange({ postHookTimeout: value })}
        onHookFailureModeChange={(value) => onChange({ hookFailureMode: value })}
        onCustomFlagsChange={(value) => onChange({ customFlags: value })}
      />
    </div>
  )
}
