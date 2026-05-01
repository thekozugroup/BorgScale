import React from 'react'
import { HardDrive, Cloud, FolderOpen, FileCheck, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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

interface ArchiveFile {
  path: string
  mode: string
  user: string
  group: string
  size: number
  mtime: string
  healthy: boolean
}

export interface RestoreReviewData {
  destinationType: 'local' | 'ssh'
  destinationConnectionId: number | ''
  restoreStrategy: 'original' | 'custom'
  customPath: string
}

interface WizardStepRestoreReviewProps {
  data: RestoreReviewData
  selectedFiles: ArchiveFile[]
  sshConnections: SSHConnection[]
  archiveName: string
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 py-2">
      <p className="text-sm text-muted-foreground flex-shrink-0">{label}</p>
      <div className="text-left sm:text-right">{children}</div>
    </div>
  )
}

const BADGE_PRIMARY = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20'
const BADGE_WARNING = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border'
const BADGE_DEFAULT = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border border-border text-muted-foreground'

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; headerBg?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function WizardStepRestoreReview({
  data,
  selectedFiles,
  sshConnections,
  archiveName,
}: WizardStepRestoreReviewProps) {
  const { t } = useTranslation()

  const destinationConnection =
    data.destinationType === 'ssh' && data.destinationConnectionId
      ? sshConnections.find((c) => c.id === data.destinationConnectionId)
      : null

  const sshPrefix = destinationConnection
    ? `ssh://${destinationConnection.username}@${destinationConnection.host}:${destinationConnection.port}`
    : ''

  const getDestinationPath = (originalPath: string) => {
    let path: string
    if (data.restoreStrategy === 'custom' && data.customPath) {
      const archivePath = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath
      path = `${data.customPath.replace(/\/$/, '')}/${archivePath}`
    } else {
      path = originalPath
    }
    if (path && !path.startsWith('/')) path = '/' + path
    return sshPrefix ? `${sshPrefix}${path}` : path
  }

  const examplePaths = selectedFiles.length > 0 ? selectedFiles.slice(0, 3).map((f) => f.path) : []
  const hasMoreFiles = selectedFiles.length > 3


  return (
    <div className="flex flex-col gap-4">
      {/* Success Alert */}
      <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-primary/20 bg-primary/10 text-primary">
        <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
        <p className="font-semibold">
          {selectedFiles.length === 0
            ? t('wizard.restoreReview.readyEntireArchive', { archiveName })
            : t('wizard.restoreReview.readyFiles', { count: selectedFiles.length, archiveName })}
        </p>
      </div>

      {/* Destination Summary */}
      <Panel
        icon={data.destinationType === 'local' ? <HardDrive size={16} /> : <Cloud size={16} />}
        title={t('wizard.restoreReview.restoreDestination')}
      >
        <SummaryRow label={t('wizard.restoreReview.destinationType')}>
          <span className={BADGE_PRIMARY}>
            {data.destinationType === 'local'
              ? t('wizard.restoreReview.borgUiServer')
              : t('wizard.restoreReview.remoteMachine')}
          </span>
        </SummaryRow>

        {data.destinationType === 'ssh' && destinationConnection && (
          <>
            <div className="border-t border-border my-1" />
            <SummaryRow label={t('wizard.restoreReview.sshConnection')}>
              <span className="text-sm font-mono">
                {destinationConnection.username}@{destinationConnection.host}:{destinationConnection.port}
              </span>
            </SummaryRow>
          </>
        )}

        <div className="border-t border-border my-1" />
        <SummaryRow label={t('wizard.restoreReview.restoreStrategy')}>
          <span className={data.restoreStrategy === 'original' ? BADGE_WARNING : BADGE_DEFAULT}>
            {data.restoreStrategy === 'original'
              ? t('wizard.restoreReview.originalLocation')
              : t('wizard.restoreReview.customLocation')}
          </span>
        </SummaryRow>

        {data.restoreStrategy === 'custom' && (
          <>
            <div className="border-t border-border my-1" />
            <SummaryRow label={t('wizard.restoreReview.customPath')}>
              <span className="text-sm font-mono">
                {data.customPath || t('wizard.restoreReview.notSet')}
              </span>
            </SummaryRow>
          </>
        )}
      </Panel>

      {/* Restore Preview */}
      {examplePaths.length > 0 && (
        <Panel
          icon={<FileCheck size={16} />}
          title={t('wizard.restoreReview.restorePreview')}
        >
          <p className="text-xs text-muted-foreground mb-3">{t('wizard.restoreReview.previewNote')}</p>
          <div className="p-3 rounded-xl bg-muted/30 overflow-auto max-h-48">
            <div className="flex flex-col gap-3">
              {examplePaths.map((path, index) => (
                <div key={index} className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground font-mono">Original: {path}</p>
                  <p className="text-sm font-semibold font-mono text-primary">
                    → {getDestinationPath(path)}
                  </p>
                </div>
              ))}
              {hasMoreFiles && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('wizard.restoreReview.andMoreFiles', { count: selectedFiles.length - 3 })}
                </p>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* Files Summary */}
      <Panel
        icon={<FolderOpen size={16} />}
        title={t('wizard.restoreReview.filesToRestore')}
      >
        <SummaryRow label={t('wizard.restoreReview.numberOfItems')}>
          <span className={BADGE_PRIMARY}>
            {selectedFiles.length === 0
              ? t('wizard.restoreReview.allFilesInArchive')
              : t('wizard.restoreReview.files', { count: selectedFiles.length })}
          </span>
        </SummaryRow>

        {selectedFiles.length === 0 && (
          <>
            <div className="border-t border-border my-2" />
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm mt-1 border border-border bg-muted/40 text-muted-foreground">
              {t('wizard.restoreReview.entireArchiveNote')}
            </div>
          </>
        )}
      </Panel>

      {/* Ready Alert */}
      <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-primary/20 bg-primary/10 text-primary">
        <FileCheck size={16} className="flex-shrink-0 mt-0.5" />
        <p className="font-semibold">{t('wizard.restoreReview.everythingLooksGood')}</p>
      </div>
    </div>
  )
}
