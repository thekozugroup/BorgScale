import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import ScriptEditorDialog from './ScriptEditorDialog'
import RepositoryScriptsSection from './RepositoryScriptsSection'

type OnFailureMode = 'fail' | 'continue' | 'skip'

interface AdvancedRepositoryOptionsProps {
  repositoryId?: number | null
  mode: 'full' | 'observe'
  remotePath: string
  preBackupScript: string
  postBackupScript: string
  preHookTimeout: number
  postHookTimeout: number
  hookFailureMode: OnFailureMode
  customFlags: string
  onRemotePathChange: (value: string) => void
  onPreBackupScriptChange: (value: string) => void
  onPostBackupScriptChange: (value: string) => void
  onPreHookTimeoutChange: (value: number) => void
  onPostHookTimeoutChange: (value: number) => void
  onHookFailureModeChange: (value: OnFailureMode) => void
  onCustomFlagsChange: (value: string) => void
}

export default function AdvancedRepositoryOptions({
  repositoryId,
  mode,
  remotePath,
  preBackupScript,
  postBackupScript,
  preHookTimeout,
  postHookTimeout,
  hookFailureMode,
  customFlags,
  onRemotePathChange,
  onPreBackupScriptChange,
  onPostBackupScriptChange,
  onPreHookTimeoutChange,
  onPostHookTimeoutChange,
  onHookFailureModeChange,
  onCustomFlagsChange,
}: AdvancedRepositoryOptionsProps) {
  const { t } = useTranslation()
  const [preScriptDialogOpen, setPreScriptDialogOpen] = useState(false)
  const [postScriptDialogOpen, setPostScriptDialogOpen] = useState(false)
  const [hasPreLibraryScripts, setHasPreLibraryScripts] = useState(false)
  const [hasPostLibraryScripts, setHasPostLibraryScripts] = useState(false)

  return (
    <>
      <Separator className="mt-4" />
      <p className="mt-4 text-sm font-semibold">{t('advancedRepositoryOptions.title')}</p>
      <p className="text-xs text-muted-foreground block mb-3">
        {t('advancedRepositoryOptions.subtitle')}
      </p>

      {/* Remote Path */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="adv-remote-path">{t('advancedRepositoryOptions.remoteBorgPath')}</Label>
        <Input
          id="adv-remote-path"
          value={remotePath}
          onChange={(e) => onRemotePathChange(e.target.value)}
          placeholder="/usr/local/bin/borg"
        />
        <p className="text-xs text-muted-foreground">{t('advancedRepositoryOptions.remoteBorgPathHint')}</p>
      </div>

      {/* Custom Flags - Only show for full repositories */}
      {mode === 'full' && (
        <div className="flex flex-col gap-1 mt-3">
          <Label htmlFor="adv-custom-flags">{t('advancedRepositoryOptions.customFlags')}</Label>
          <Input
            id="adv-custom-flags"
            value={customFlags}
            onChange={(e) => onCustomFlagsChange(e.target.value)}
            placeholder="--stats --list --filter AME"
          />
          <p className="text-xs text-muted-foreground">{t('advancedRepositoryOptions.customFlagsHint')}</p>
        </div>
      )}

      {/* Scripts Section */}
      {mode === 'full' && (
        <>
          <Separator className="mt-6 mb-3" />
          <p className="text-sm font-semibold mb-1">{t('advancedRepositoryOptions.scripts')}</p>
          <p className="text-xs text-muted-foreground block mb-2">
            {t('advancedRepositoryOptions.scriptsHint')}
          </p>

          <RepositoryScriptsSection
            repositoryId={repositoryId}
            preBackupScript={preBackupScript}
            postBackupScript={postBackupScript}
            onPreBackupScriptChange={onPreBackupScriptChange}
            onPostBackupScriptChange={onPostBackupScriptChange}
            onOpenPreScriptDialog={() => setPreScriptDialogOpen(true)}
            onOpenPostScriptDialog={() => setPostScriptDialogOpen(true)}
            hasPreLibraryScripts={hasPreLibraryScripts}
            hasPostLibraryScripts={hasPostLibraryScripts}
            onPreLibraryScriptsChange={setHasPreLibraryScripts}
            onPostLibraryScriptsChange={setHasPostLibraryScripts}
          />
        </>
      )}

      {/* Script Editor Dialogs */}
      <ScriptEditorDialog
        open={preScriptDialogOpen}
        onClose={() => setPreScriptDialogOpen(false)}
        title={t('advancedRepositoryOptions.preBackupScript')}
        value={preBackupScript}
        onChange={onPreBackupScriptChange}
        placeholder="#!/bin/bash&#10;echo 'Pre-backup hook started'&#10;wakeonlan AA:BB:CC:DD:EE:FF&#10;sleep 60"
        timeout={preHookTimeout}
        onTimeoutChange={onPreHookTimeoutChange}
        onFailureMode={hookFailureMode}
        onFailureModeChange={onHookFailureModeChange}
        showContinueOnFailure={true}
        repositoryId={repositoryId}
      />

      <ScriptEditorDialog
        open={postScriptDialogOpen}
        onClose={() => setPostScriptDialogOpen(false)}
        title={t('advancedRepositoryOptions.postBackupScript')}
        value={postBackupScript}
        onChange={onPostBackupScriptChange}
        placeholder="#!/bin/bash&#10;echo 'Post-backup hook completed'&#10;ssh nas@192.168.1.100 'sudo poweroff'"
        timeout={postHookTimeout}
        onTimeoutChange={onPostHookTimeoutChange}
        showContinueOnFailure={false}
        repositoryId={repositoryId}
      />
    </>
  )
}
