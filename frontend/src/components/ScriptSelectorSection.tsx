import React from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ScriptParameterInputs, { ScriptParameter } from './ScriptParameterInputs'

interface Script {
  id: number
  name: string
  parameters?: ScriptParameter[] | null
}

interface ScriptSelectorSectionProps {
  preBackupScriptId: number | null
  postBackupScriptId: number | null
  runRepositoryScripts: boolean
  scripts: Script[]
  onPreChange: (id: number | null) => void
  onPostChange: (id: number | null) => void
  onRunRepoScriptsChange: (value: boolean) => void
  preBackupScriptParameters?: Record<string, string>
  postBackupScriptParameters?: Record<string, string>
  onPreParametersChange?: (params: Record<string, string>) => void
  onPostParametersChange?: (params: Record<string, string>) => void
  disabled?: boolean
  size?: 'small' | 'medium'
}

const ScriptSelectorSection: React.FC<ScriptSelectorSectionProps> = ({
  preBackupScriptId,
  postBackupScriptId,
  runRepositoryScripts,
  scripts,
  onPreChange,
  onPostChange,
  onRunRepoScriptsChange,
  preBackupScriptParameters = {},
  postBackupScriptParameters = {},
  onPreParametersChange,
  onPostParametersChange,
  disabled = false,
}) => {
  const { t } = useTranslation()
  const selectedPreScript = scripts.find((s) => s.id === preBackupScriptId)
  const selectedPostScript = scripts.find((s) => s.id === postBackupScriptId)

  return (
    <div className="p-4 border border-border rounded-md">
      <p className="text-sm font-semibold mb-1">{t('scriptSelector.title')}</p>
      <p className="text-xs text-muted-foreground mb-4">{t('scriptSelector.subtitle')}</p>

      <div className="flex flex-col gap-4">
        {/* Pre-backup script */}
        <div>
          <Label className="mb-1 block">{t('scriptSelector.preBackup')}</Label>
          <Select
            value={preBackupScriptId ? String(preBackupScriptId) : '__none__'}
            onValueChange={(v) => onPreChange(v === '__none__' ? null : Number(v))}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('scriptSelector.none')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('scriptSelector.none')}</SelectItem>
              {scripts.map((script) => (
                <SelectItem key={script.id} value={String(script.id)}>
                  {script.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPreScript?.parameters && selectedPreScript.parameters.length > 0 && onPreParametersChange && (
          <div className="pl-4 pt-1">
            <ScriptParameterInputs
              parameters={selectedPreScript.parameters}
              values={preBackupScriptParameters}
              onChange={onPreParametersChange}
              showDescriptions={true}
            />
          </div>
        )}

        {/* Post-backup script */}
        <div>
          <Label className="mb-1 block">{t('scriptSelector.postBackup')}</Label>
          <Select
            value={postBackupScriptId ? String(postBackupScriptId) : '__none__'}
            onValueChange={(v) => onPostChange(v === '__none__' ? null : Number(v))}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('scriptSelector.none')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('scriptSelector.none')}</SelectItem>
              {scripts.map((script) => (
                <SelectItem key={script.id} value={String(script.id)}>
                  {script.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPostScript?.parameters && selectedPostScript.parameters.length > 0 && onPostParametersChange && (
          <div className="pl-4 pt-1">
            <ScriptParameterInputs
              parameters={selectedPostScript.parameters}
              values={postBackupScriptParameters}
              onChange={onPostParametersChange}
              showDescriptions={true}
            />
          </div>
        )}

        {/* Run repo scripts checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={runRepositoryScripts}
            onChange={(e) => onRunRepoScriptsChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 rounded border-border"
          />
          <div>
            <p className="text-sm">{t('scriptSelector.runRepoScripts')}</p>
            <p className="text-xs text-muted-foreground">{t('scriptSelector.runRepoScriptsDesc')}</p>
          </div>
        </label>
      </div>
    </div>
  )
}

export default ScriptSelectorSection
