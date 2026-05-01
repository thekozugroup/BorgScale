import { Database, Archive, HardDrive, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes, formatDate } from '../utils/dateUtils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface RepositoryInfoProps {
  repoInfo?: {
    repository?: {
      id?: string
      last_modified?: string
    }
    cache?: {
      stats?: {
        total_size?: number
        total_csize?: number
        unique_csize?: number
        total_chunks?: number
        total_unique_chunks?: number
      }
    }
    encryption?: {
      mode?: string
    }
  }
  archivesCount?: number
  loading?: boolean
}

export default function RepositoryInfo({
  repoInfo,
  archivesCount = 0,
  loading = false,
}: RepositoryInfoProps) {
  const { t } = useTranslation()
  const stats = repoInfo?.cache?.stats

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">{t('dialogs.repositoryInfo.loadingInfo')}</p>
        </CardContent>
      </Card>
    )
  }

  if (!repoInfo) {
    return null
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <Archive size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold">
                {t('repositoryInfo.archives')}
              </span>
            </div>
            <p className="text-xl font-semibold">{archivesCount}</p>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <HardDrive size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold">
                {t('repositoryInfo.totalSize')}
              </span>
            </div>
            <p className="text-xl font-semibold">
              {stats?.total_size ? formatBytes(stats.total_size) : t('repositoryInfo.na')}
            </p>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <Database size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold">
                {t('dialogs.repositoryInfo.uniqueData')}
              </span>
            </div>
            <p className="text-xl font-semibold">
              {stats?.unique_csize ? formatBytes(stats.unique_csize) : t('repositoryInfo.na')}
            </p>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold">
                {t('repositoryInfo.lastModified')}
              </span>
            </div>
            <p className="text-sm font-semibold">
              {repoInfo.repository?.last_modified
                ? formatDate(repoInfo.repository.last_modified)
                : t('repositoryInfo.na')}
            </p>
          </div>
        </div>

        {repoInfo.encryption?.mode && (
          <div className="mt-4 pt-4 border-t border-border">
            <Badge variant="outline">
              {t('repositoryInfo.encryption')}: {repoInfo.encryption.mode}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
