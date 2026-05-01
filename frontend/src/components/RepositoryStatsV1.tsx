import { HardDrive, Database, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '../utils/dateUtils'
import { Card, CardContent } from '@/components/ui/card'

export interface CacheStats {
  total_size?: number
  unique_size?: number
  unique_csize?: number
  total_chunks?: number
  total_unique_chunks?: number
}

interface RepositoryStatsV1Props {
  stats: CacheStats
}

export default function RepositoryStatsV1({ stats }: RepositoryStatsV1Props) {
  const { t } = useTranslation()

  return (
    <>
      <h3 className="text-base font-semibold mt-2 mb-3">{t('dialogs.repositoryInfo.storageStatistics')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Card className="bg-muted/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Archive size={20} className="text-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t('dialogs.repositoryInfo.totalSize')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatBytes(stats.total_size || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={20} className="text-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t('dialogs.repositoryInfo.usedOnDisk')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatBytes(stats.unique_csize || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Database size={20} className="text-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t('dialogs.repositoryInfo.uniqueData')}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatBytes(stats.unique_size || 0)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-border">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{t('dialogs.repositoryInfo.totalChunks')}</p>
            <p className="text-xl font-semibold">{stats.total_chunks?.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{t('dialogs.repositoryInfo.uniqueChunks')}</p>
            <p className="text-xl font-semibold">{stats.total_unique_chunks?.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
