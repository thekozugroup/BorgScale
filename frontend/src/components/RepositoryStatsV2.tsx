import { HardDrive, Database, Folder, Clock, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes, formatDateShort } from '../utils/dateUtils'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface ArchiveEntry {
  name?: string
  time?: string
  stats?: {
    original_size?: number
    nfiles?: number
  }
}

interface RepositoryStatsV2Props {
  archives: ArchiveEntry[]
}

export default function RepositoryStatsV2({ archives }: RepositoryStatsV2Props) {
  const { t } = useTranslation()

  if (archives.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-1">{t('dialogs.repositoryInfo.noBackupsYet')}</p>
          <p className="text-sm text-muted-foreground">{t('repositoryInfoDialog.noArchivesDescription')}</p>
        </AlertDescription>
      </Alert>
    )
  }

  const first = archives[0]
  const latest = archives[archives.length - 1]

  return (
    <>
      <h3 className="text-base font-semibold mt-2 mb-3">{t('dialogs.repositoryInfo.storageStatistics')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Card className="bg-muted/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Database size={20} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t('dialogs.repositoryInfo.latestBackupSize')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatBytes(latest.stats?.original_size || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={20} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t('dialogs.repositoryInfo.files')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{(latest.stats?.nfiles ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Folder size={20} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t('dialogs.repositoryInfo.archiveCount')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{archives.length.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-border">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('dialogs.repositoryInfo.firstBackup')}</p>
            </div>
            <p className="text-sm font-semibold">{first.time ? formatDateShort(first.time) : t('common.na')}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('dialogs.repositoryInfo.latestBackup')}</p>
            </div>
            <p className="text-sm font-semibold">{latest.time ? formatDateShort(latest.time) : t('common.na')}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
