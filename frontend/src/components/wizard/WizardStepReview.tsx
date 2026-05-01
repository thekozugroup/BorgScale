import React, { useState } from 'react'
import {
  FolderOpen,
  Shield,
  Settings,
  Server,
  Cloud,
  HardDrive,
  Laptop,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Rocket,
  Info,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CommandPreview from '../CommandPreview'
import BackupFlowPreview from './BackupFlowPreview'
import { cn } from '@/lib/utils'

interface SSHConnection {
  id: number
  host: string
  username: string
  port: number
  ssh_key_id: number
  default_path?: string
  ssh_path_prefix?: string
}

export interface WizardReviewData {
  name: string
  borgVersion?: 1 | 2
  repositoryMode: 'full' | 'observe'
  repositoryLocation: 'local' | 'ssh'
  path: string
  repoSshConnectionId: number | ''
  dataSource: 'local' | 'remote'
  sourceSshConnectionId: number | ''
  sourceDirs: string[]
  encryption: string
  passphrase: string
  compression: string
  excludePatterns: string[]
  customFlags: string
  remotePath: string
}

interface WizardStepReviewProps {
  mode: 'create' | 'edit' | 'import'
  data: WizardReviewData
  sshConnections: SSHConnection[]
}

function getEncryptionLabelKey(encryption: string) {
  if (encryption === 'none') return 'wizard.review.encryptionNone'
  if (encryption.startsWith('repokey')) return 'wizard.review.encryptionRepokey'
  if (encryption.startsWith('keyfile')) return 'wizard.review.encryptionKeyfile'
  return 'wizard.review.encryptionNone'
}

// Colored icon badge
function IconBadge({ icon, className }: { icon: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
        className
      )}
    >
      {icon}
    </div>
  )
}

// Monospace code pill
function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <span
      title={typeof children === 'string' ? children : undefined}
      className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground max-w-full overflow-hidden text-ellipsis whitespace-nowrap inline-block align-middle cursor-default leading-relaxed"
    >
      {children}
    </span>
  )
}

// Attribute row
function AttrRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 flex items-center gap-1 flex-wrap justify-end">{children}</div>
    </div>
  )
}

// Section card
function SectionCard({
  icon,
  label,
  iconClass,
  cardClass,
  children,
}: {
  icon: React.ReactNode
  label: string
  iconClass?: string
  cardClass?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-lg p-3 flex flex-col gap-2 min-w-0 overflow-hidden', cardClass)}>
      <div className="flex items-center gap-2">
        <IconBadge icon={icon} className={iconClass} />
        <span className="text-2xs text-muted-foreground font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

export default function WizardStepReview({ mode, data, sshConnections }: WizardStepReviewProps) {
  const { t } = useTranslation()
  const [showPassphrase, setShowPassphrase] = useState(false)

  const getSourceSshConnection = () => {
    if (data.dataSource !== 'remote' || !data.sourceSshConnectionId) return null
    const conn = sshConnections.find((c) => c.id === data.sourceSshConnectionId)
    if (!conn) return null
    return { username: conn.username, host: conn.host, port: conn.port, defaultPath: conn.default_path }
  }

  const getRepoSshConnection = () => {
    if (data.repositoryLocation !== 'ssh' || !data.repoSshConnectionId) return null
    return sshConnections.find((c) => c.id === data.repoSshConnectionId) || null
  }

  const getSourceSshConnectionForFlow = () => {
    if (data.dataSource !== 'remote' || !data.sourceSshConnectionId) return null
    return sshConnections.find((c) => c.id === data.sourceSshConnectionId) || null
  }

  const getRepoConnectionDetails = () => {
    if (data.repositoryLocation === 'ssh' && data.repoSshConnectionId) {
      const conn = sshConnections.find((c) => c.id === data.repoSshConnectionId)
      if (conn) return { host: conn.host, username: conn.username, port: conn.port }
    }
    return { host: '', username: '', port: 22 }
  }

  const repoDetails = getRepoConnectionDetails()
  const isEncrypted = data.encryption !== 'none'

  return (
    <div className="flex flex-col gap-3">
      {/* Backup Flow Preview */}
      {data.repositoryMode === 'full' && (
        <BackupFlowPreview
          repositoryLocation={data.repositoryLocation}
          dataSource={data.dataSource}
          repositoryPath={data.path}
          sourceDirs={data.sourceDirs}
          repoSshConnection={getRepoSshConnection()}
          sourceSshConnection={getSourceSshConnectionForFlow()}
        />
      )}

      {/* Command Preview */}
      {(data.dataSource === 'local' || data.dataSource === 'remote') &&
        data.repositoryMode === 'full' && (
          <CommandPreview
            mode={mode === 'create' ? 'create' : 'import'}
            borgVersion={data.borgVersion}
            repositoryPath={data.path}
            repositoryLocation={data.repositoryLocation}
            host={repoDetails.host}
            username={repoDetails.username}
            port={repoDetails.port}
            encryption={data.encryption}
            compression={data.compression}
            excludePatterns={data.excludePatterns}
            sourceDirs={data.sourceDirs}
            customFlags={data.customFlags}
            remotePath={data.remotePath}
            repositoryMode={data.repositoryMode}
            dataSource={data.dataSource}
            sourceSshConnection={getSourceSshConnection()}
          />
        )}

      {/* Manifest header + status chip */}
      <div className="flex items-center justify-between">
        <span className="text-2xs text-muted-foreground font-bold uppercase tracking-widest">
          {t('wizard.review.configurationSummary')}
        </span>

        {mode === 'create' && data.repositoryMode === 'full' && (
          <span
            title={t('wizard.review.repositoryInitialized')}
            className="flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full border bg-muted text-foreground border-border cursor-help"
          >
            <Rocket size={10} />
            {t('wizard.review.readyToInitialize')}
          </span>
        )}
      </div>

      {mode === 'create' && data.repositoryMode === 'full' && (
        <div className="flex items-center gap-2">
          <Info size={14} className="opacity-45 shrink-0" />
          <span className="text-sm text-muted-foreground">
            {t('wizard.review.repositoryInitialized')}
          </span>
        </div>
      )}

      {/* 2×2 section card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 overflow-hidden">
        {/* REPOSITORY */}
        <SectionCard
          icon={<FolderOpen size={14} />}
          label={t('wizard.review.repository')}
          iconClass="bg-muted text-muted-foreground"
          cardClass="bg-muted/20"
        >
          <AttrRow label={t('wizard.review.name')}>
            <span className="text-sm font-bold">{data.name}</span>
          </AttrRow>

          <AttrRow label={t('wizard.review.mode')}>
            <span
              className={cn(
                'text-2xs font-semibold px-1.5 py-0.5 rounded-full',
                data.repositoryMode === 'full'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {data.repositoryMode === 'full'
                ? t('wizard.review.full')
                : t('wizard.review.observeOnly')}
            </span>
          </AttrRow>

          <AttrRow label={t('wizard.review.location')}>
            <div className="flex items-center gap-1">
              {data.repositoryLocation === 'local' ? (
                <Server size={12} className="opacity-60" />
              ) : (
                <Cloud size={12} className="opacity-60" />
              )}
              <span className="text-sm">
                {data.repositoryLocation === 'local'
                  ? t('wizard.review.borgUiServer')
                  : t('wizard.review.sshRemote')}
              </span>
            </div>
          </AttrRow>

          <AttrRow label={t('wizard.review.path')}>
            <CodePill>{data.path || t('wizard.review.notSet')}</CodePill>
          </AttrRow>
        </SectionCard>

        {/* SECURITY */}
        <SectionCard
          icon={<Shield size={14} />}
          label={t('wizard.review.security')}
          iconClass={cn(
            isEncrypted
              ? 'bg-primary/10 text-primary'
              : 'bg-destructive/10 text-destructive'
          )}
          cardClass={cn(
            isEncrypted
              ? 'bg-muted/20'
              : 'bg-muted/20'
          )}
        >
          {mode === 'create' && (
            <AttrRow label={t('wizard.review.encryption')}>
              <div className="flex items-center gap-1">
                {isEncrypted ? (
                  <Lock size={11} className="text-primary" />
                ) : (
                  <Unlock size={11} className="text-destructive" />
                )}
                <span
                  className={cn(
                    'text-2xs font-semibold px-1.5 py-0.5 rounded-full',
                    isEncrypted
                      ? 'bg-primary/10 text-primary'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {t(getEncryptionLabelKey(data.encryption))}
                </span>
              </div>
            </AttrRow>
          )}

          <AttrRow label={t('wizard.review.passphrase')}>
            {data.passphrase ? (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'text-sm',
                    !showPassphrase && 'font-mono tracking-widest'
                  )}
                >
                  {showPassphrase ? data.passphrase : '••••••••'}
                </span>
                <button
                  type="button"
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  onClick={() => setShowPassphrase((v) => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassphrase ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t('wizard.review.passphraseNotSet')}
              </span>
            )}
          </AttrRow>
        </SectionCard>

        {/* DATA SOURCE — full mode only */}
        {data.repositoryMode === 'full' && (
          <SectionCard
            icon={data.dataSource === 'local' ? <HardDrive size={14} /> : <Laptop size={14} />}
            label={t('wizard.review.dataSource')}
            iconClass="bg-muted text-muted-foreground"
            cardClass="bg-muted/20"
          >
            <AttrRow label={t('wizard.review.source')}>
              <span className="text-sm font-medium">
                {data.dataSource === 'local'
                  ? t('wizard.review.borgUiServer')
                  : t('wizard.review.remoteClient')}
              </span>
            </AttrRow>

            {data.dataSource === 'local' && (
              <>
                <AttrRow label={t('wizard.review.directories')}>
                  <span className="text-sm">
                    {t('wizard.review.directoriesCount', { count: data.sourceDirs.length })}
                  </span>
                </AttrRow>
                <AttrRow label={t('wizard.review.excludePatterns')}>
                  <span className="text-sm">
                    {t('wizard.review.directoriesCount', { count: data.excludePatterns.length })}
                  </span>
                </AttrRow>
              </>
            )}
          </SectionCard>
        )}

        {/* BACKUP CONFIG — full mode only */}
        {data.repositoryMode === 'full' && (
          <SectionCard
            icon={<Settings size={14} />}
            label={t('wizard.review.backupConfiguration')}
            iconClass="bg-muted text-muted-foreground"
            cardClass="bg-muted/20"
          >
            <AttrRow label={t('wizard.review.compression')}>
              <CodePill>{data.compression}</CodePill>
            </AttrRow>

            {data.customFlags && (
              <AttrRow label={t('wizard.review.customFlags')}>
                <CodePill>{data.customFlags}</CodePill>
              </AttrRow>
            )}
          </SectionCard>
        )}
      </div>

      {/* Import / edit notes */}
      {mode === 'import' && (
        <div className="flex items-center gap-2">
          <Info size={14} className="opacity-45 shrink-0" />
          <span className="text-sm text-muted-foreground">
            {t('wizard.review.repositoryImportNote')}
          </span>
        </div>
      )}

      {mode === 'edit' && (
        <div className="flex items-center gap-2">
          <Info size={14} className="opacity-45 shrink-0" />
          <span className="text-sm text-muted-foreground">
            {t('wizard.review.repositoryEditNote')}
          </span>
        </div>
      )}
    </div>
  )
}
