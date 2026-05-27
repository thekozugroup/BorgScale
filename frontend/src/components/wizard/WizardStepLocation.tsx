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
import AdvancedDisclosure from './AdvancedDisclosure'

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
                    'px-3 py-1 rounded-md text-xs font-mono transition-colors',
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

      {/* Repository Mode for Import — two radio cards */}
      {mode === 'import' && (
        <div className="flex flex-col gap-1.5">
          <Label>{t('wizard.location.repositoryModeLabel')}</Label>
          <div
            role="radiogroup"
            aria-label={t('wizard.location.repositoryModeLabel')}
            className="grid gap-3 md:grid-cols-2"
          >
            <ModeRadioCard
              value="full"
              selected={data.repositoryMode === 'full'}
              onSelect={() => onChange({ repositoryMode: 'full' })}
              titleKey="wizard.location.mode.full.title"
              descKey="wizard.location.mode.full.desc"
            />
            <ModeRadioCard
              value="observe"
              selected={data.repositoryMode === 'observe'}
              onSelect={() => onChange({ repositoryMode: 'observe', bypassLock: true })}
              titleKey="wizard.location.mode.observe.title"
              descKey="wizard.location.mode.observe.desc"
            />
          </div>
        </div>
      )}

      {mode === 'import' && data.repositoryMode === 'observe' && (
        <p className="text-sm text-muted-foreground">{t('wizard.location.observabilityInfo')}</p>
      )}

      {/* Read-only storage access option for observe mode — moved under Advanced */}
      {data.repositoryMode === 'observe' && (
        <AdvancedDisclosure
          labelKey="wizard.location.advanced"
          forceOpen={data.bypassLock !== true && data.repositoryMode === 'observe' ? true : undefined}
          testId="location-advanced"
        >
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
        </AdvancedDisclosure>
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
              'flex-1 flex items-center gap-3 p-4 rounded-lg border text-left',
              data.repositoryLocation === 'local'
                ? 'border-primary ring-1 ring-primary bg-primary/5'
                : 'border-border'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-colors',
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
              'flex-1 flex items-center gap-3 p-4 rounded-lg border text-left',
              data.repositoryLocation === 'ssh'
                ? 'border-primary ring-1 ring-primary bg-primary/5'
                : 'border-border',
              isRemoteLocationDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-colors',
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

function ModeRadioCard({
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
      data-testid={`mode-card-${value}`}
      onClick={onSelect}
      className={cn(
        'text-left rounded-lg border p-4 transition',
        'hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected && 'border-primary ring-1 ring-primary'
      )}
    >
      <div className="font-medium text-sm">{t(titleKey)}</div>
      <div className="mt-1 text-xs text-muted-foreground">{t(descKey)}</div>
    </button>
  )
}
