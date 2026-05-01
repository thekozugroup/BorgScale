import React from 'react'
import { Archive as ArchiveIcon, Database } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes as formatBytesUtil } from '../utils/dateUtils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'

interface RepositoryStats {
  original_size: number
  compressed_size: number
  deduplicated_size: number
  total_files?: number
}

interface RepositoryStatsGridProps {
  stats: RepositoryStats
  archivesCount: number
  borgVersion?: number
  archivesLoading?: boolean
}

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  bgOpacity?: '5' | '10'
  tooltip?: string
}

function StatCard({ label, value, icon, bgOpacity = '10', tooltip }: StatCardProps) {
  const bgClass = bgOpacity === '5' ? 'bg-primary/5' : 'bg-primary/10'

  const card = (
    <div
      className={`rounded-lg px-4 py-3.5 transition-all duration-200 hover:-translate-y-px ${bgClass} border border-primary/20 hover:border-primary/40`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.06em] block mb-1.5 text-primary">
            {label}
          </p>
          <p className="font-bold leading-tight text-xl lg:text-2xl text-primary">
            {value}
          </p>
        </div>
        <div className="text-primary opacity-40 mt-0.5 flex-shrink-0">{icon}</div>
      </div>
    </div>
  )

  if (!tooltip) return card

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export default function RepositoryStatsGrid({
  stats,
  archivesCount,
  borgVersion,
  archivesLoading,
}: RepositoryStatsGridProps) {
  const { t } = useTranslation()
  const isBorg2 = borgVersion === 2

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={t('repositoryStatsGrid.totalArchives')}
        value={
          archivesLoading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            archivesCount
          )
        }
        icon={<ArchiveIcon size={32} />}
        bgOpacity="10"
      />
      <StatCard
        label={t('repositoryStatsGrid.repositorySize')}
        value={formatBytesUtil(stats.deduplicated_size)}
        icon={<Database size={32} />}
        bgOpacity="5"
        tooltip={t('repositoryStatsGrid.repositorySizeTooltip')}
      />
      <StatCard
        label={t('repositoryStatsGrid.originalSize')}
        value={formatBytesUtil(stats.original_size)}
        icon={<Database size={32} />}
        bgOpacity="10"
        tooltip={t('repositoryStatsGrid.originalSizeTooltip')}
      />
      <StatCard
        label={
          isBorg2 ? t('repositoryStatsGrid.numberOfFiles') : t('repositoryStatsGrid.compressedSize')
        }
        value={isBorg2 ? stats.total_files || 0 : formatBytesUtil(stats.compressed_size)}
        icon={isBorg2 ? <ArchiveIcon size={32} /> : <Database size={32} />}
        bgOpacity="5"
        tooltip={
          isBorg2
            ? t('repositoryStatsGrid.numberOfFilesTooltip')
            : t('repositoryStatsGrid.compressedSizeTooltip')
        }
      />
    </div>
  )
}
