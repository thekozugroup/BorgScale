import { HardDrive, Laptop, Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import SourceDirectoriesInput from '../SourceDirectoriesInput'

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

export interface DataSourceStepData {
  dataSource: 'local' | 'remote'
  sourceSshConnectionId: number | ''
  sourceDirs: string[]
}

interface WizardStepDataSourceProps {
  repositoryLocation: 'local' | 'ssh'
  repoSshConnectionId: number | ''
  repositoryMode: 'full' | 'observe'
  data: DataSourceStepData
  sshConnections: SSHConnection[]
  onChange: (data: Partial<DataSourceStepData>) => void
  onBrowseSource: () => void
  onBrowseRemoteSource: () => void
}

export default function WizardStepDataSource({
  repositoryLocation,
  repoSshConnectionId,
  repositoryMode,
  data,
  sshConnections,
  onChange,
  onBrowseSource,
  onBrowseRemoteSource,
}: WizardStepDataSourceProps) {
  const { t } = useTranslation()

  const isRemoteToRemoteDisabled = repositoryLocation === 'ssh'
  const hasLocalDirs = data.sourceDirs.length > 0 && !data.sourceSshConnectionId
  const hasRemoteDirs = !!data.sourceSshConnectionId && data.sourceDirs.length > 0

  const handleDataSourceChange = (source: 'local' | 'remote') => {
    if (source === 'remote' && isRemoteToRemoteDisabled) return
    const updates: Partial<DataSourceStepData> = { dataSource: source }
    if (source === 'remote' && repositoryLocation === 'ssh' && repoSshConnectionId) {
      updates.sourceSshConnectionId = repoSshConnectionId
    } else if (source === 'local') {
      updates.sourceSshConnectionId = ''
    }
    onChange(updates)
  }

  const availableConnections = sshConnections.filter((conn) => {
    if (repositoryLocation === 'ssh' && repoSshConnectionId) {
      return conn.id === repoSshConnectionId
    }
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">{t('wizard.dataSource.title')}</p>

      <div className="flex gap-3 flex-col sm:flex-row items-stretch">
        {/* Local Data Source Card */}
        <button
          type="button"
          onClick={() => handleDataSourceChange('local')}
          disabled={hasRemoteDirs}
          className={cn(
            'flex-1 flex flex-col text-left p-4 rounded-lg border-2 transition-all',
            data.dataSource === 'local'
              ? 'border-primary bg-primary/5 shadow-sm -translate-y-0.5'
              : 'border-border hover:border-foreground/30 hover:bg-muted/30 hover:-translate-y-0.5',
            hasRemoteDirs && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-all',
                data.dataSource === 'local'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <HardDrive size={28} />
            </div>
            <div className="text-sm font-semibold">{t('wizard.borgUiServer')}</div>
          </div>
          <p className="text-xs text-muted-foreground">{t('wizard.dataSource.localDescription')}</p>
          {hasRemoteDirs && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('wizard.dataSource.removeRemoteDirsFirst')}
            </p>
          )}
        </button>

        {/* Remote Data Source Card */}
        <div
          title={isRemoteToRemoteDisabled ? t('wizard.dataSource.remoteToRemoteDisabledTooltip') : ''}
          className="flex-1"
        >
          <button
            type="button"
            onClick={() => handleDataSourceChange('remote')}
            disabled={hasLocalDirs || isRemoteToRemoteDisabled}
            className={cn(
              'w-full flex flex-col text-left p-4 rounded-lg border-2 transition-all h-full',
              data.dataSource === 'remote'
                ? 'border-primary bg-primary/5 shadow-sm -translate-y-0.5'
                : 'border-border hover:border-foreground/30 hover:bg-muted/30 hover:-translate-y-0.5',
              (hasLocalDirs || isRemoteToRemoteDisabled) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-all',
                  data.dataSource === 'remote' && !isRemoteToRemoteDisabled
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isRemoteToRemoteDisabled ? <Ban size={28} /> : <Laptop size={28} />}
              </div>
              <div className="text-sm font-semibold">{t('wizard.remoteClient')}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRemoteToRemoteDisabled
                ? t('wizard.dataSource.notAvailableRemoteRepo')
                : t('wizard.dataSource.remoteDescription')}
            </p>
            {hasLocalDirs && !isRemoteToRemoteDisabled && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('wizard.dataSource.removeLocalDirsFirst')}
              </p>
            )}
          </button>
        </div>
      </div>

      {/* Remote-to-remote explanation */}
      {isRemoteToRemoteDisabled && (
        <Alert>
          <AlertDescription>
            <strong>{t('wizard.dataSource.remoteToRemoteTitle')}</strong>{' '}
            {t('wizard.dataSource.remoteToRemoteBody')}
          </AlertDescription>
        </Alert>
      )}

      {/* Local Data Source Configuration */}
      {data.dataSource === 'local' && (
        <SourceDirectoriesInput
          directories={data.sourceDirs}
          onChange={(newDirs) => {
            onChange({
              sourceDirs: newDirs,
              sourceSshConnectionId: newDirs.length === 0 ? '' : data.sourceSshConnectionId,
            })
          }}
          onBrowseClick={onBrowseSource}
          required={repositoryMode !== 'observe'}
        />
      )}

      {/* Remote Data Source Configuration */}
      {data.dataSource === 'remote' && !isRemoteToRemoteDisabled && (
        <>
          {!Array.isArray(sshConnections) || sshConnections.length === 0 ? (
            <Alert>
              <AlertDescription>{t('wizard.noSshConnections')}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source-ssh-connection">
                  {t('wizard.dataSource.selectRemoteClient')}
                </Label>
                <Select
                  value={
                    data.sourceSshConnectionId === '' ? '' : String(data.sourceSshConnectionId)
                  }
                  onValueChange={(v) => {
                    if (v) onChange({ sourceSshConnectionId: Number(v) })
                  }}
                >
                  <SelectTrigger id="source-ssh-connection" className="w-full">
                    <SelectValue placeholder={t('wizard.dataSource.selectRemoteClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConnections.map((conn) => (
                      <SelectItem key={conn.id} value={String(conn.id)}>
                        <div className="flex items-center gap-2 w-full">
                          <Laptop size={16} />
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
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {data.sourceSshConnectionId && (
                <div>
                  <SourceDirectoriesInput
                    directories={data.sourceDirs}
                    onChange={(newDirs) => {
                      onChange({
                        sourceDirs: newDirs,
                        sourceSshConnectionId:
                          newDirs.length === 0 ? '' : data.sourceSshConnectionId,
                      })
                    }}
                    onBrowseClick={onBrowseRemoteSource}
                    required={repositoryMode !== 'observe'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('wizard.dataSource.browseRemoteNote')}
                  </p>
                </div>
              )}
            </>
          )}

          <Alert>
            <AlertDescription>
              <strong>Note:</strong> {t('wizard.dataSource.remoteSshNote')}
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}
