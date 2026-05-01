import { FolderOpen, FileCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ArchiveFile {
  path: string
  mode: string
  user: string
  group: string
  size: number
  mtime: string
  healthy: boolean
}

export interface RestorePathStepData {
  restoreStrategy: 'original' | 'custom'
  customPath: string
}

interface SSHConnection {
  id: number
  host: string
  username: string
  port: number
}

interface WizardStepRestorePathProps {
  data: RestorePathStepData
  selectedFiles: ArchiveFile[]
  destinationType: 'local' | 'ssh'
  destinationConnectionId: number | ''
  sshConnections?: SSHConnection[]
  onChange: (data: Partial<RestorePathStepData>) => void
  onBrowsePath: () => void
}

export default function WizardStepRestorePath({
  data,
  selectedFiles,
  destinationType,
  destinationConnectionId,
  sshConnections = [],
  onChange,
  onBrowsePath,
}: WizardStepRestorePathProps) {
  const { t } = useTranslation()

  const examplePaths = selectedFiles.slice(0, 3).map((f) => f.path)
  const hasMoreFiles = selectedFiles.length > 3

  const sshConnection =
    destinationType === 'ssh' && destinationConnectionId
      ? sshConnections.find((c) => c.id === destinationConnectionId)
      : null

  const sshPrefix = sshConnection
    ? `ssh://${sshConnection.username}@${sshConnection.host}:${sshConnection.port}`
    : ''

  const getCustomDestinationPath = (originalPath: string) => {
    let path: string
    if (data.restoreStrategy === 'custom' && data.customPath) {
      const filename = originalPath.split('/').pop() || ''
      path = `${data.customPath.replace(/\/$/, '')}/${filename}`
    } else {
      path = originalPath
    }
    if (path && !path.startsWith('/')) path = '/' + path
    return sshPrefix ? `${sshPrefix}${path}` : path
  }


  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-base font-semibold mb-1">{t('wizard.restorePath.title')}</p>
        <p className="text-sm text-muted-foreground">{t('wizard.restorePath.subtitle')}</p>
      </div>

      {/* Strategy Selection */}
      <div className="flex flex-col gap-3">
        {/* Original */}
        <button
          type="button"
          onClick={() => onChange({ restoreStrategy: 'original' })}
          className={cn(
            'w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200',
            data.restoreStrategy === 'original'
              ? 'border-2 border-primary bg-primary/5 shadow-sm'
              : 'border border-border hover:border-foreground/30'
          )}
        >
          <input type="radio" name="restoreStrategy" checked={data.restoreStrategy === 'original'} onChange={() => onChange({ restoreStrategy: 'original' })}  className="mt-0.5 flex-shrink-0" />
          <div className="flex items-start gap-2">
            <FileCheck size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{t('wizard.restorePath.restoreToOriginal')}</p>
              <p className="text-sm text-muted-foreground">{t('wizard.restorePath.restoreToOriginalDesc')}</p>
            </div>
          </div>
        </button>

        {/* Custom */}
        <button
          type="button"
          onClick={() => onChange({ restoreStrategy: 'custom' })}
          className={cn(
            'w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200',
            data.restoreStrategy === 'custom'
              ? 'border-2 border-primary bg-primary/5 shadow-sm'
              : 'border border-border hover:border-foreground/30'
          )}
        >
          <input type="radio" name="restoreStrategy" checked={data.restoreStrategy === 'custom'} onChange={() => onChange({ restoreStrategy: 'custom' })}  className="mt-0.5 flex-shrink-0" />
          <div className="flex items-start gap-2">
            <FolderOpen size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{t('wizard.restorePath.restoreToCustom')}</p>
              <p className="text-sm text-muted-foreground">{t('wizard.restorePath.restoreToCustomDesc')}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Custom Path Input */}
      {data.restoreStrategy === 'custom' && (
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">{t('wizard.restorePath.customPathLabel')}</Label>
          <div className="relative">
            <Input
              value={data.customPath}
              onChange={(e) => onChange({ customPath: e.target.value })}
              placeholder="/Users/yourusername/restored"
              required
              className="h-9 text-sm pr-9"
            />
            <button
              type="button"
              onClick={onBrowsePath}
              title={t('wizard.restorePath.browseFilesystem')}
              disabled={destinationType === 'ssh' && !destinationConnectionId}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <FolderOpen size={16} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('wizard.restorePath.customPathHelper')}</p>
        </div>
      )}

      {/* Preview */}
      {selectedFiles.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">{t('wizard.restorePath.preview')}</p>
          <div className="p-3 rounded-xl border border-border bg-background overflow-auto max-h-48">
            <div className="flex flex-col gap-3">
              {examplePaths.map((path, index) => (
                <div key={index} className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground font-mono">
                    {t('wizard.restorePath.original')} {path}
                  </p>
                  <p className="text-sm font-semibold font-mono text-primary">
                    → {getCustomDestinationPath(path)}
                  </p>
                </div>
              ))}
              {hasMoreFiles && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('wizard.restorePath.andMoreFiles', { count: selectedFiles.length - 3 })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {destinationType === 'ssh' && !destinationConnectionId && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-destructive/25 bg-destructive/10 text-destructive">
          {t('wizard.restorePath.noSshConnection')}
        </div>
      )}
    </div>
  )
}
