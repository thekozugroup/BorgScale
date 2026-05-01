import type { ReactNode } from 'react'
import { Server, Cloud, HardDrive, Laptop, ArrowRight, MoveRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SSHConnection {
  id: number
  host: string
  username: string
  port: number
}

interface BackupFlowPreviewProps {
  repositoryLocation: 'local' | 'ssh'
  dataSource: 'local' | 'remote'
  repositoryPath: string
  sourceDirs: string[]
  repoSshConnection?: SSHConnection | null
  sourceSshConnection?: SSHConnection | null
}

// Compact horizontal node card
function FlowNode({
  icon,
  label,
  subtitle,
  path,
  colorClass,
  bgClass,
}: {
  icon: ReactNode
  label: string
  subtitle?: string
  path?: string
  colorClass: string
  bgClass: string
}) {
  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 overflow-hidden rounded-lg px-3 py-2 ${bgClass}`}>
      {/* Icon badge */}
      <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>

      {/* Text */}
      <div className="min-w-0 overflow-hidden">
        <p
          className="text-sm font-semibold leading-tight text-foreground truncate"
          title={label}
        >
          {label}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground leading-tight truncate">{subtitle}</p>
        )}
        {path && (
          <p
            className="text-xs font-mono truncate leading-tight text-muted-foreground opacity-85 cursor-default mt-0.5"
            title={path}
          >
            {path}
          </p>
        )}
      </div>
    </div>
  )
}

// Dashed connector
function Connector({ double = false }: { double?: boolean }) {
  return (
    <div className="flex items-center shrink-0 gap-0.5 px-1">
      <div className="w-4 border-t-2 border-dashed border-border" />
      {double ? (
        <div className="flex text-muted-foreground">
          <ArrowRight size={13} />
          <ArrowRight size={13} className="-ml-1.5" />
        </div>
      ) : (
        <MoveRight size={14} className="text-muted-foreground" />
      )}
      <div className="w-4 border-t-2 border-dashed border-border" />
    </div>
  )
}

export default function BackupFlowPreview({
  repositoryLocation,
  dataSource,
  repositoryPath,
  sourceDirs,
  repoSshConnection,
  sourceSshConnection,
}: BackupFlowPreviewProps) {
  const { t } = useTranslation()

  const getSummaryText = () => {
    if (dataSource === 'local' && repositoryLocation === 'local')
      return t('wizard.backupFlowPreview.localToLocal')
    if (dataSource === 'local' && repositoryLocation === 'ssh')
      return t('wizard.backupFlowPreview.localToRemote')
    if (dataSource === 'remote' && repositoryLocation === 'local')
      return t('wizard.backupFlowPreview.remoteToLocal')
    return t('wizard.backupFlowPreview.default')
  }

  const getSourceLabel = () => {
    if (dataSource === 'local') return t('wizard.borgUiServer')
    if (sourceSshConnection) return `${sourceSshConnection.username}@${sourceSshConnection.host}`
    return t('wizard.remoteClient')
  }

  const getRepoLabel = () => {
    if (repositoryLocation === 'local') return t('wizard.borgUiServer')
    if (repoSshConnection) return `${repoSshConnection.username}@${repoSshConnection.host}`
    return t('wizard.backupFlowPreview.remoteStorage')
  }

  const getSourceIcon = () =>
    dataSource === 'local' ? <HardDrive size={16} /> : <Laptop size={16} />

  const getRepoIcon = () =>
    repositoryLocation === 'local' ? <Server size={16} /> : <Cloud size={16} />

  const showSshfsIntermediate = dataSource === 'remote' && repositoryLocation === 'local'

  const sourceSubtitle =
    sourceDirs.length > 0
      ? t('wizard.backupFlowPreview.dirs', { count: sourceDirs.length })
      : undefined

  return (
    <div className="rounded-lg bg-muted/30 border border-border p-3 flex flex-col gap-3 overflow-hidden">
      {/* Summary header */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[0.6rem] text-muted-foreground font-bold uppercase tracking-widest shrink-0">
          Backup Flow
        </span>
        <span className="text-xs font-medium text-foreground">
          {getSummaryText()}
        </span>
      </div>

      {/* Pipeline row */}
      <div className="flex items-center gap-1 min-w-0">
        {/* Source */}
        <FlowNode
          icon={getSourceIcon()}
          label={getSourceLabel()}
          subtitle={sourceSubtitle}
          colorClass="bg-muted text-muted-foreground"
          bgClass="bg-muted/40"
        />

        <Connector double={showSshfsIntermediate} />

        {/* Intermediate SSHFS node */}
        {showSshfsIntermediate && (
          <>
            <FlowNode
              icon={<Server size={16} />}
              label={t('wizard.backupFlowPreview.viaSSHFS')}
              colorClass="bg-muted text-muted-foreground"
              bgClass="bg-muted/40"
            />
            <Connector />
          </>
        )}

        {/* Repository */}
        <FlowNode
          icon={getRepoIcon()}
          label={getRepoLabel()}
          path={repositoryPath || undefined}
          colorClass="bg-muted text-muted-foreground"
          bgClass="bg-muted/40"
        />
      </div>
    </div>
  )
}
