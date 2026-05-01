import { Server, Cloud, FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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

export interface LocationStepData {
  name: string
  borgVersion?: 1 | 2
  repositoryMode: 'full' | 'observe'
  repositoryLocation: 'local' | 'ssh'
  path: string
  repoSshConnectionId: number | ''
  bypassLock: boolean
}

interface WizardStepLocationProps {
  mode: 'create' | 'edit' | 'import'
  data: LocationStepData
  sshConnections: SSHConnection[]
  dataSource?: 'local' | 'remote'
  sourceSshConnectionId?: number | ''
  onChange: (data: Partial<LocationStepData>) => void
  onBrowsePath: () => void
}

export default function WizardStepLocation({
  mode,
  data,
  sshConnections,
  dataSource,
  sourceSshConnectionId,
  onChange,
  onBrowsePath,
}: WizardStepLocationProps) {
  const { t } = useTranslation()

  const isRemoteLocationDisabled =
    mode === 'edit' && dataSource === 'remote' && !!sourceSshConnectionId

  const handleLocationChange = (location: 'local' | 'ssh') => {
    if (location === 'ssh' && isRemoteLocationDisabled) return
    onChange({ repositoryLocation: location, repoSshConnectionId: '' })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name Input */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repo-name">{t('wizard.location.repositoryNameLabel')} *</Label>
        <Input
          id="repo-name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          aria-label={t('wizard.location.repositoryNameLabel')}
        />
        <p className="text-xs text-muted-foreground">{t('wizard.location.repositoryNameHelper')}</p>
      </div>

      {/* Borg Version Selector — only shown on create/import, not edit */}
      {mode !== 'edit' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">{t('wizard.location.borgVersionLabel')}</span>
          <div className="flex p-0.5 bg-muted rounded-lg gap-0.5">
            {([1, 2] as const).map((v) => {
              const selected = (data.borgVersion ?? 1) === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ borgVersion: v })}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-mono transition-all',
                    selected
                      ? 'bg-background text-foreground shadow font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  v{v}
                </button>
              )
            })}
          </div>
          {(data.borgVersion ?? 1) === 2 && (
            <span
              className="text-xs font-semibold border border-border text-muted-foreground px-1.5 py-0.5 rounded"
              title={t('wizard.location.borgV2Warning')}
            >
              Beta
            </span>
          )}
        </div>
      )}

      {/* Repository Mode for Import */}
      {mode === 'import' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repo-mode">{t('wizard.location.repositoryModeLabel')}</Label>
          <Select
            value={data.repositoryMode}
            onValueChange={(v) => onChange({ repositoryMode: v as 'full' | 'observe' })}
          >
            <SelectTrigger id="repo-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">
                <div>
                  <div className="text-sm font-semibold">{t('wizard.location.fullRepository')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('wizard.location.fullRepositoryDesc')}
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="observe">
                <div>
                  <div className="text-sm font-semibold">
                    {t('wizard.location.observabilityOnly')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('wizard.location.observabilityOnlyDesc')}
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {mode === 'import' && data.repositoryMode === 'observe' && (
        <p className="text-sm text-muted-foreground">{t('wizard.location.observabilityInfo')}</p>
      )}

      {/* Read-only storage access option for observe mode */}
      {data.repositoryMode === 'observe' && (
        <div className="flex items-start gap-2">
          <Checkbox
            id="bypass-lock"
            checked={data.bypassLock}
            onCheckedChange={(checked) => onChange({ bypassLock: !!checked })}
          />
          <label htmlFor="bypass-lock" className="flex flex-col cursor-pointer">
            <span className="text-sm">{t('wizard.location.readOnlyStorageLabel')}</span>
            <span className="text-xs text-muted-foreground">
              {t('wizard.location.readOnlyStorageDesc')}
            </span>
          </label>
        </div>
      )}

      {/* Location Selection Cards */}
      <div>
        <p className="text-sm font-semibold mb-3">{t('wizard.location.whereToStore')}</p>
        <div className="flex gap-3 flex-col sm:flex-row">
          {/* Local card */}
          <button
            type="button"
            onClick={() => handleLocationChange('local')}
            className={cn(
              'flex-1 flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all',
              data.repositoryLocation === 'local'
                ? 'border-primary bg-primary/5 shadow-sm -translate-y-0.5'
                : 'border-border hover:border-foreground/30 hover:bg-muted/30 hover:-translate-y-0.5'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-all',
                data.repositoryLocation === 'local'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Server size={28} />
            </div>
            <div>
              <div className="text-sm font-semibold">{t('wizard.borgUiServer')}</div>
              <div className="text-xs text-muted-foreground">
                {t('wizard.location.borgUiServerDesc')}
              </div>
            </div>
          </button>

          {/* SSH card */}
          <button
            type="button"
            onClick={() => handleLocationChange('ssh')}
            disabled={isRemoteLocationDisabled}
            className={cn(
              'flex-1 flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all',
              data.repositoryLocation === 'ssh'
                ? 'border-primary bg-primary/5 shadow-sm -translate-y-0.5'
                : 'border-border hover:border-foreground/30 hover:bg-muted/30 hover:-translate-y-0.5',
              isRemoteLocationDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-all',
                data.repositoryLocation === 'ssh'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Cloud size={28} />
            </div>
            <div>
              <div className="text-sm font-semibold">{t('wizard.remoteClient')}</div>
              <div className="text-xs text-muted-foreground">
                {t('wizard.location.remoteClientDesc')}
              </div>
            </div>
          </button>
        </div>

        {isRemoteLocationDisabled && (
          <p className="text-sm text-muted-foreground mt-2">
            <strong>{t('wizard.dataSource.remoteToRemoteTitle')}</strong>{' '}
            {t('wizard.location.remoteDisabledInfo')}
          </p>
        )}
      </div>

      {/* SSH Connection Selection */}
      {data.repositoryLocation === 'ssh' && (
        <>
          {!Array.isArray(sshConnections) || sshConnections.length === 0 ? (
            <Alert>
              <AlertDescription>{t('wizard.noSshConnections')}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ssh-connection">{t('wizard.location.selectSshConnection')}</Label>
              <Select
                value={data.repoSshConnectionId === '' ? '' : String(data.repoSshConnectionId)}
                onValueChange={(v) => {
                  if (v) onChange({ repoSshConnectionId: Number(v) })
                }}
              >
                <SelectTrigger id="ssh-connection" className="w-full">
                  <SelectValue placeholder={t('wizard.location.selectSshConnection')} />
                </SelectTrigger>
                <SelectContent>
                  {sshConnections.map((conn) => (
                    <SelectItem key={conn.id} value={String(conn.id)}>
                      <div className="flex items-center gap-2 w-full">
                        <Cloud size={16} />
                        <div className="flex-1">
                          <div className="text-sm">
                            {conn.username}@{conn.host}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Port {conn.port}
                            {conn.mount_point && ` • ${conn.mount_point}`}
                          </div>
                        </div>
                        {conn.status === 'connected' && (
                          <span
                            className="w-2 h-2 rounded-full bg-primary shrink-0"
                            title={t('wizard.location.connected')}
                          />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Path Input */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repo-path">{t('wizard.location.repositoryPathLabel')} *</Label>
        <div className="flex gap-2">
          <Input
            id="repo-path"
            value={data.path}
            onChange={(e) => onChange({ path: e.target.value })}
            placeholder={
              data.repositoryLocation === 'local' ? '/backups/my-repo' : '/path/on/remote/server'
            }
            required
            className="flex-1"
            aria-label={t('wizard.location.repositoryPathLabel')}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBrowsePath}
            title={t('wizard.location.browseFilesystem')}
            disabled={data.repositoryLocation === 'ssh' && !data.repoSshConnectionId}
          >
            <FolderOpen size={16} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('wizard.location.repositoryPathHelper')}</p>
      </div>
    </div>
  )
}
