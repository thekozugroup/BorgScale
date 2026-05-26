import { useTranslation } from 'react-i18next'
import CompressionSettings from '../CompressionSettings'
import ExcludePatternInput from '../ExcludePatternInput'
import AdvancedRepositoryOptions from '../AdvancedRepositoryOptions'
import AdvancedDisclosure from './AdvancedDisclosure'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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

// Recommended compression tile values. Underlying form value stays a free-form
// Borg compression string — only the UI is simplified.
const COMPRESSION_TILE_VALUES = ['lz4', 'zstd,3', 'none']

export default function WizardStepBackupConfig({
  repositoryId,
  dataSource,
  repositoryMode,
  data,
  onChange,
  onBrowseExclude,
}: WizardStepBackupConfigProps) {
  const { t } = useTranslation()
  const isCustomCompression = !COMPRESSION_TILE_VALUES.includes(data.compression)

  return (
    <div className="flex flex-col gap-4">
      {/* Compression tiles — the simple picker */}
      <div className="flex flex-col gap-1.5">
        <Label>{t('wizard.review.compression')}</Label>
        <div
          role="radiogroup"
          aria-label={t('wizard.review.compression')}
          className="grid gap-3 md:grid-cols-3"
        >
          <CompressionTile
            value="balanced"
            selected={data.compression === 'lz4'}
            onSelect={() => onChange({ compression: 'lz4' })}
            titleKey="wizard.backup.compression.balanced.title"
            descKey="wizard.backup.compression.balanced.desc"
          />
          <CompressionTile
            value="smaller"
            selected={data.compression === 'zstd,3'}
            onSelect={() => onChange({ compression: 'zstd,3' })}
            titleKey="wizard.backup.compression.smaller.title"
            descKey="wizard.backup.compression.smaller.desc"
          />
          <CompressionTile
            value="none"
            selected={data.compression === 'none'}
            onSelect={() => onChange({ compression: 'none' })}
            titleKey="wizard.backup.compression.none.title"
            descKey="wizard.backup.compression.none.desc"
          />
        </div>
      </div>

      {/* Full compression algorithm picker — kept for power users */}
      <AdvancedDisclosure
        labelKey="wizard.backup.advanced.compression"
        forceOpen={isCustomCompression ? true : undefined}
        testId="compression-advanced"
      >
        <CompressionSettings
          value={data.compression}
          onChange={(value) => onChange({ compression: value })}
        />
      </AdvancedDisclosure>

      {/* Exclude Patterns — stays in primary view, users actually care about these */}
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

      {/* Power-user settings: custom flags, hook scripts, remote borg path */}
      <AdvancedDisclosure
        labelKey="wizard.backup.advanced.power"
        testId="power-advanced"
      >
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
      </AdvancedDisclosure>
    </div>
  )
}

function CompressionTile({
  selected,
  onSelect,
  titleKey,
  descKey,
  value,
}: {
  selected: boolean
  onSelect: () => void
  titleKey: string
  descKey: string
  value: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`compression-tile-${value}`}
      onClick={onSelect}
      className={cn(
        'text-left rounded-lg border p-3 transition',
        'hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected && 'border-primary ring-1 ring-primary'
      )}
    >
      <div className="text-sm font-medium">{t(titleKey)}</div>
      <div className="mt-1 text-xs text-muted-foreground">{t(descKey)}</div>
    </button>
  )
}
