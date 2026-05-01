import React from 'react'
import { generateBorgCreateCommand, generateBorgInitCommand } from '../utils/borgUtils'
import { useTranslation } from 'react-i18next'

interface SourceSshConnection {
  username: string
  host: string
  port: number
  defaultPath?: string
}

interface CommandPreviewProps {
  mode: 'create' | 'import'
  displayMode?: 'detailed' | 'backup-only'
  repositoryPath: string
  borgVersion?: 1 | 2
  archiveName?: string
  repositoryLocation?: 'local' | 'ssh'
  host?: string
  username?: string
  port?: number
  encryption?: string
  compression?: string
  excludePatterns?: string[]
  sourceDirs?: string[]
  customFlags?: string
  remotePath?: string
  repositoryMode?: 'full' | 'observe'
  dataSource?: 'local' | 'remote'
  sourceSshConnection?: SourceSshConnection | null
}

const CommandBox = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-neutral-900 text-neutral-100 p-3 rounded font-mono text-xs overflow-auto whitespace-pre-wrap break-all">
    {children}
  </div>
)

const StepLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-primary font-semibold mb-1 block">{children}</p>
)

export default function CommandPreview({
  mode,
  displayMode = 'detailed',
  repositoryPath,
  borgVersion = 1,
  archiveName,
  repositoryLocation = 'local',
  host,
  username,
  port = 22,
  encryption = 'repokey',
  compression = 'lz4',
  excludePatterns = [],
  sourceDirs = [],
  customFlags = '',
  remotePath = '',
  repositoryMode = 'full',
  dataSource = 'local',
  sourceSshConnection = null,
}: CommandPreviewProps) {
  const { t } = useTranslation()
  const isRemoteSource = dataSource === 'remote' && sourceSshConnection

  let fullRepoPath = repositoryPath || '/path/to/repository'
  if (repositoryLocation === 'ssh' && host && username) {
    fullRepoPath = `ssh://${username}@${host}:${port}${repositoryPath.startsWith('/') ? '' : '/'}${repositoryPath}`
  }

  const remotePathFlag = remotePath ? `--remote-path ${remotePath} ` : ''

  const initCommand = generateBorgInitCommand({
    repositoryPath: fullRepoPath,
    borgVersion,
    encryption,
    remotePathFlag,
  })

  const getPreservedRemotePath = (path: string) => {
    return path.startsWith('/') ? path.substring(1) : path
  }

  const resolveRemoteSourcePath = (path: string) => {
    const rawPath = (path || '').trim()
    const defaultPath = sourceSshConnection?.defaultPath?.trim() || '/'
    const normalizedDefaultPath = defaultPath.startsWith('/') ? defaultPath : `/${defaultPath}`

    let resolvedPath = normalizedDefaultPath
    if (!rawPath || rawPath === '.' || rawPath === './') {
      resolvedPath = normalizedDefaultPath
    } else if (rawPath.startsWith('/')) {
      resolvedPath = rawPath
    } else {
      resolvedPath = `${normalizedDefaultPath.replace(/\/$/, '')}/${rawPath}`
    }

    return resolvedPath.replace(/\/+/g, '/')
  }

  const resolvedRemoteSourceDirs = isRemoteSource
    ? sourceDirs.map(resolveRemoteSourcePath)
    : sourceDirs
  const effectiveSourceDirs = isRemoteSource
    ? resolvedRemoteSourceDirs.map(getPreservedRemotePath)
    : sourceDirs.length > 0
      ? sourceDirs
      : ['/path/to/source']

  const createCommand = generateBorgCreateCommand({
    repositoryPath: fullRepoPath,
    borgVersion,
    archiveName,
    compression,
    excludePatterns: excludePatterns,
    sourceDirs: effectiveSourceDirs,
    customFlags,
    remotePathFlag,
  })

  if (displayMode === 'backup-only') {
    return (
      <div className="border border-border rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold mb-3">{t('backup.commandPreview')}</p>
        <CommandBox>{createCommand}</CommandBox>
      </div>
    )
  }

  if (isRemoteSource && repositoryMode === 'full') {
    const getParentOrSelf = (path: string): string => {
      const hasExtension = path.includes('.') && !path.endsWith('/')
      if (hasExtension) {
        const lastSlash = path.lastIndexOf('/')
        return lastSlash > 0 ? path.substring(0, lastSlash) : '/'
      }
      return path
    }

    const mountPaths =
      resolvedRemoteSourceDirs.length > 0
        ? [...new Set(resolvedRemoteSourceDirs.map(getParentOrSelf))]
        : ['/path']

    const sshfsMountCommands = mountPaths.map(
      (dir) =>
        `sshfs ${sourceSshConnection.username}@${sourceSshConnection.host}:${dir} /tmp/sshfs_mount_123/${getPreservedRemotePath(dir)} -p ${sourceSshConnection.port}`
    )

    const mountDisplayText =
      mountPaths.length === 1
        ? t('commandPreview.mountDisplayText')
        : t('commandPreview.mountDisplayTextMultiple', { count: mountPaths.length })

    return (
      <div className="border border-border rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold mb-4">
          {mode === 'create' ? t('commandPreview.howBackupWillWork') : t('commandPreview.howBackupWorks')}
        </p>

        {mode === 'create' && (
          <div className="mb-4">
            <StepLabel>{t('commandPreview.step1InitRepo')}</StepLabel>
            <CommandBox>{initCommand}</CommandBox>
          </div>
        )}

        <div className="mb-4">
          <StepLabel>
            {mode === 'create'
              ? t('commandPreview.step2MountRemote', {
                  type: mountPaths.length > 1 ? t('commandPreview.mountDirectories') : t('commandPreview.mountDirectory'),
                })
              : t('commandPreview.step1MountRemote', {
                  type: mountPaths.length > 1 ? t('commandPreview.mountDirectories') : t('commandPreview.mountDirectory'),
                })}
          </StepLabel>
          <CommandBox>{sshfsMountCommands.join('\n')}</CommandBox>
          <p className="text-xs text-muted-foreground mt-1">{mountDisplayText}</p>
        </div>

        <div className="mb-4">
          <StepLabel>
            {mode === 'create' ? t('commandPreview.step3RunBackup') : t('commandPreview.step2RunBackup')}
          </StepLabel>
          <CommandBox>{createCommand}</CommandBox>
          <p className="text-xs text-muted-foreground mt-1">{t('commandPreview.archivesPreserve')}</p>
        </div>

        <div>
          <StepLabel>
            {mode === 'create' ? t('commandPreview.step4Cleanup') : t('commandPreview.step3Cleanup')}
          </StepLabel>
          <CommandBox>fusermount -u /tmp/sshfs_mount/</CommandBox>
          <p className="text-xs text-muted-foreground mt-1">{t('commandPreview.cleanupDesc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg p-4 mb-4">
      <p className="text-sm font-semibold mb-4">
        {mode === 'create' ? t('commandPreview.howBackupWillWork') : t('commandPreview.howBackupWorks')}
      </p>

      {mode === 'create' && (
        <div className="mb-4">
          <StepLabel>{t('commandPreview.step1InitRepo')}</StepLabel>
          <CommandBox>{initCommand}</CommandBox>
          <p className="text-xs text-muted-foreground mt-1">{t('commandPreview.initRepositoryDesc')}</p>
        </div>
      )}

      {repositoryMode === 'full' && (
        <div>
          <StepLabel>
            {mode === 'create' ? t('commandPreview.step2RunBackup') : t('commandPreview.stepRunBackup')}
          </StepLabel>
          <CommandBox>{createCommand}</CommandBox>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'create' ? t('commandPreview.backupSourceDirs') : t('commandPreview.futureBackups')}
          </p>
        </div>
      )}
    </div>
  )
}
