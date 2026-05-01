import { useTranslation } from 'react-i18next'
import { FileCode } from 'lucide-react'
import RepositoryScriptsTab from './RepositoryScriptsTab'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RepositoryScriptsSectionProps {
  repositoryId?: number | null
  preBackupScript: string
  postBackupScript: string
  onPreBackupScriptChange: (value: string) => void
  onPostBackupScriptChange: (value: string) => void
  onOpenPreScriptDialog: () => void
  onOpenPostScriptDialog: () => void
  hasPreLibraryScripts?: boolean
  hasPostLibraryScripts?: boolean
  onPreLibraryScriptsChange?: (hasScripts: boolean) => void
  onPostLibraryScriptsChange?: (hasScripts: boolean) => void
}

interface ScriptSectionProps {
  label: string
  hookType: 'pre-backup' | 'post-backup'
  hasLibraryScripts: boolean
  inlineScript: string
  onOpenDialog: () => void
  onClearInline: () => void
  onLibraryScriptsChange?: (hasScripts: boolean) => void
  repositoryId?: number | null
  addLabel: string
  createFirstLabel: string
  addFromLibraryLabel: string
  inlineScriptLabel: string
  configuredLabel: string
}

function ScriptSection({
  label,
  hookType,
  hasLibraryScripts,
  inlineScript,
  onOpenDialog,
  onClearInline,
  onLibraryScriptsChange,
  repositoryId,
  addLabel,
  createFirstLabel,
  addFromLibraryLabel,
  inlineScriptLabel,
  configuredLabel,
}: ScriptSectionProps) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
        <p className="text-sm font-semibold">{label}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (repositoryId) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const openFn = (window as any)[`openScriptDialog_${repositoryId}_${hookType}`]
                    if (openFn) openFn()
                  }
                }}
                disabled={!repositoryId}
                className="w-full sm:w-auto gap-1.5 text-xs h-7 px-2"
              >
                <FileCode size={13} />
                {addLabel}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {!repositoryId ? createFirstLabel : addFromLibraryLabel}
          </TooltipContent>
        </Tooltip>
      </div>

      {!hasLibraryScripts && (
        <div className={cn('mb-2', repositoryId ? '' : '')}>
          <button
            type="button"
            onClick={onOpenDialog}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-left hover:bg-muted/40 transition-colors duration-150"
          >
            <FileCode size={16} className="flex-shrink-0 text-muted-foreground" />
            <span>{inlineScriptLabel}</span>
            {inlineScript && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {configuredLabel}
              </span>
            )}
          </button>
        </div>
      )}

      {repositoryId && (
        <RepositoryScriptsTab
          repositoryId={repositoryId}
          hookType={hookType}
          onScriptsChange={onLibraryScriptsChange}
          hasInlineScript={!!inlineScript}
          onClearInlineScript={onClearInline}
        />
      )}
    </div>
  )
}

export default function RepositoryScriptsSection({
  repositoryId,
  preBackupScript,
  postBackupScript,
  onPreBackupScriptChange,
  onPostBackupScriptChange,
  onOpenPreScriptDialog,
  onOpenPostScriptDialog,
  hasPreLibraryScripts = false,
  hasPostLibraryScripts = false,
  onPreLibraryScriptsChange,
  onPostLibraryScriptsChange,
}: RepositoryScriptsSectionProps) {
  const { t } = useTranslation()

  const commonLabels = {
    addLabel: t('repositoryScriptsSection.add'),
    createFirstLabel: t('repositoryScriptsSection.createFirst'),
    addFromLibraryLabel: t('repositoryScriptsSection.addFromLibrary'),
    inlineScriptLabel: t('repositoryScriptsSection.inlineScript'),
    configuredLabel: t('repositoryScriptsSection.configured'),
    repositoryId,
  }

  return (
    <>
      <ScriptSection
        label={t('repositoryScriptsSection.preBackup')}
        hookType="pre-backup"
        hasLibraryScripts={hasPreLibraryScripts}
        inlineScript={preBackupScript}
        onOpenDialog={onOpenPreScriptDialog}
        onClearInline={() => onPreBackupScriptChange('')}
        onLibraryScriptsChange={onPreLibraryScriptsChange}
        {...commonLabels}
      />
      <ScriptSection
        label={t('repositoryScriptsSection.postBackup')}
        hookType="post-backup"
        hasLibraryScripts={hasPostLibraryScripts}
        inlineScript={postBackupScript}
        onOpenDialog={onOpenPostScriptDialog}
        onClearInline={() => onPostBackupScriptChange('')}
        onLibraryScriptsChange={onPostLibraryScriptsChange}
        {...commonLabels}
      />
    </>
  )
}
