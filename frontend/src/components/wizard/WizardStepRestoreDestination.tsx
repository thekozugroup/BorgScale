import { Server, Cloud, FileCheck, FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SSHConnection {
  id: number
  host: string
  username: string
  port: number
  ssh_key_id: number
  default_path?: string
  mount_point?: string
  status: string
}

export interface RestoreDestinationStepData {
  destinationType: 'local' | 'ssh'
  destinationConnectionId: number | ''
  restoreStrategy: 'original' | 'custom'
  customPath: string
}

interface WizardStepRestoreDestinationProps {
  data: RestoreDestinationStepData
  sshConnections: SSHConnection[]
  repositoryType: string
  onChange: (data: Partial<RestoreDestinationStepData>) => void
  onBrowsePath: () => void
}

export default function WizardStepRestoreDestination({
  data,
  sshConnections,
  repositoryType,
  onChange,
  onBrowsePath,
}: WizardStepRestoreDestinationProps) {
  const { t } = useTranslation()
  const isSSHRepository = repositoryType === 'ssh'

  const handleLocationChange = (location: 'local' | 'ssh') => {
    if (isSSHRepository && location === 'ssh') return
    onChange({ destinationType: location, destinationConnectionId: '' })
  }

  const selectedSshConnection =
    data.destinationType === 'ssh' && data.destinationConnectionId
      ? sshConnections.find((c) => c.id === data.destinationConnectionId)
      : null

  const getSshUrlPreview = () => {
    if (!selectedSshConnection || !data.customPath) return ''
    const path = data.customPath.startsWith('/') ? data.customPath : `/${data.customPath}`
    return `ssh://${selectedSshConnection.username}@${selectedSshConnection.host}:${selectedSshConnection.port}${path}`
  }

  const isLocalSelected = data.destinationType === 'local'
  const isSSHSelected = data.destinationType === 'ssh'

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-base font-semibold mb-1">{t('wizard.restoreDestination.title')}</p>
        <p className="text-sm text-muted-foreground">{t('wizard.restoreDestination.subtitle')}</p>
      </div>

      {/* Destination Type Cards */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleLocationChange('local')}
          className={cn(
            'flex-1 min-w-[200px] flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer',
            isLocalSelected
              ? 'border-2 border-primary bg-primary/8 shadow-md -translate-y-0.5'
              : 'border border-border hover:-translate-y-0.5 hover:shadow-sm'
          )}
        >
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all', isLocalSelected ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground')}>
            <Server size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold">{t('wizard.borgUiServer')}</p>
            <p className="text-xs text-muted-foreground">{t('wizard.restoreDestination.borgUiServerDesc')}</p>
          </div>
        </button>

        {!isSSHRepository && (
          <button
            type="button"
            onClick={() => handleLocationChange('ssh')}
            className={cn(
              'flex-1 min-w-[200px] flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer',
              isSSHSelected
                ? 'border-2 border-primary bg-primary/8 shadow-md -translate-y-0.5'
                : 'border border-border hover:-translate-y-0.5 hover:shadow-sm'
            )}
          >
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all', isSSHSelected ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground')}>
              <Cloud size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('wizard.restoreDestination.remoteMachine')}</p>
              <p className="text-xs text-muted-foreground">{t('wizard.restoreDestination.remoteMachineDesc')}</p>
            </div>
          </button>
        )}
      </div>

      {/* SSH Repository info */}
      {isSSHRepository && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
          {t('wizard.restoreDestination.sshToSshNotSupported')}
        </div>
      )}

      {/* SSH Connection Selection */}
      {data.destinationType === 'ssh' && (
        <>
          {!Array.isArray(sshConnections) || sshConnections.length === 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
              {t('wizard.noSshConnections')}
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('wizard.restoreDestination.selectSshConnection')}</Label>
              <select
                value={data.destinationConnectionId === '' ? '' : String(data.destinationConnectionId)}
                onChange={(e) => { if (e.target.value) onChange({ destinationConnectionId: Number(e.target.value) }) }}
                className="w-full rounded-md border border-input bg-background h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— {t('wizard.restoreDestination.selectSshConnection')} —</option>
                {sshConnections.map((conn) => (
                  <option key={conn.id} value={String(conn.id)}>
                    {conn.username}@{conn.host} — Port {conn.port}{conn.mount_point ? ` • ${conn.mount_point}` : ''}{conn.status === 'connected' ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* Restore Strategy */}
      {(data.destinationType === 'local' || (data.destinationType === 'ssh' && data.destinationConnectionId)) && (
        <div className="flex flex-col gap-3">
          {(['original', 'custom'] as const).map((value) => {
            const isSelected = data.restoreStrategy === value
            const icon = value === 'original' ? <FileCheck size={18} /> : <FolderOpen size={18} />
            const title = value === 'original' ? t('wizard.restoreDestination.restoreToOriginal') : t('wizard.restoreDestination.restoreToCustom')
            const description = value === 'original'
              ? (data.destinationType === 'ssh' ? t('wizard.restoreDestination.restoreToOriginalDescRemote') : t('wizard.restoreDestination.restoreToOriginalDescLocal'))
              : t('wizard.restoreDestination.restoreToCustomDesc')
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ restoreStrategy: value })}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200',
                  isSelected ? 'border-2 border-primary bg-primary/8 shadow-sm' : 'border border-border hover:border-foreground/30'
                )}
              >
                <input type="radio" name="restoreStrategy" checked={isSelected} onChange={() => onChange({ restoreStrategy: value })} className="mt-0.5 flex-shrink-0" />
                <div className="flex items-start gap-2 min-w-0">
                  <span className="flex-shrink-0 mt-0.5">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Custom Path Input */}
      {data.restoreStrategy === 'custom' && (
        <div className="flex flex-col gap-3">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">{t('wizard.restoreDestination.customPathLabel')}</Label>
            <div className="relative">
              <Input
                value={data.customPath}
                onChange={(e) => onChange({ customPath: e.target.value })}
                placeholder={data.destinationType === 'ssh' ? '/mnt/backup/restored' : '/Users/yourusername/restored'}
                required
                className="h-9 text-sm pr-9"
              />
              <button
                type="button"
                onClick={onBrowsePath}
                title={data.destinationType === 'ssh' ? t('wizard.restoreDestination.browseRemoteFilesystem') : t('wizard.restoreDestination.browseFilesystem')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.destinationType === 'ssh'
                ? t('wizard.restoreDestination.customPathHelperRemote')
                : t('wizard.restoreDestination.customPathHelperLocal')}
            </p>
          </div>

          {data.customPath && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
              <span className="flex-shrink-0 mt-0.5">
                {data.destinationType === 'ssh' ? <Cloud size={16} /> : <Server size={16} />}
              </span>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('wizard.restoreDestination.filesWillBeRestoredTo')}</p>
                <p className="text-sm font-semibold font-mono text-primary">
                  {data.destinationType === 'ssh' ? getSshUrlPreview() : data.customPath}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
