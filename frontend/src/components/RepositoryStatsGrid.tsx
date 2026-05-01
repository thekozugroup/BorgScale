import React from 'react'
import { Archive as ArchiveIcon, Database } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes as formatBytesUtil } from '../utils/dateUtils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '../context/ThemeContext'

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

type ColorKey = 'primary' | 'success' | 'info' | 'secondary'

const COLORS: Record<ColorKey, string> = {
  primary: '#3b82f6',
  success: '#22c55e',
  info: '#06b6d4',
  secondary: '#8b5cf6',
}

const COLOR_BG: Record<ColorKey, { light: string; dark: string }> = {
  primary: { light: 'rgba(59,130,246,0.07)', dark: 'rgba(59,130,246,0.10)' },
  success: { light: 'rgba(34,197,94,0.07)', dark: 'rgba(34,197,94,0.10)' },
  info: { light: 'rgba(6,182,212,0.07)', dark: 'rgba(6,182,212,0.10)' },
  secondary: { light: 'rgba(139,92,246,0.07)', dark: 'rgba(139,92,246,0.10)' },
}

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  colorKey: ColorKey
  tooltip?: string
}

function StatCard({ label, value, icon, colorKey, tooltip }: StatCardProps) {
  const { effectiveMode } = useTheme()
  const isDark = effectiveMode === 'dark'
  const color = COLORS[colorKey]
  const bg = COLOR_BG[colorKey][isDark ? 'dark' : 'light']

  const card = (
    <div
      className="rounded-lg px-4 py-3.5 transition-all duration-200 hover:-translate-y-px"
      style={{
        background: bg,
        boxShadow: isDark
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)`
          : `0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? `0 0 0 1px ${color}59, 0 6px 20px rgba(0,0,0,0.28)`
          : `0 0 0 1px ${color}40, 0 6px 20px rgba(0,0,0,0.1)`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)`
          : `0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)`
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p
            className="text-[0.6rem] font-bold uppercase tracking-[0.06em] block mb-1.5"
            style={{ color }}
          >
            {label}
          </p>
          <p
            className="font-bold leading-tight text-[1.4rem] lg:text-[1.5rem]"
            style={{ color }}
          >
            {value}
          </p>
        </div>
        <div style={{ color, opacity: 0.4, marginTop: 2, flexShrink: 0 }}>{icon}</div>
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
        colorKey="primary"
      />
      <StatCard
        label={t('repositoryStatsGrid.repositorySize')}
        value={formatBytesUtil(stats.deduplicated_size)}
        icon={<Database size={32} />}
        colorKey="success"
        tooltip={t('repositoryStatsGrid.repositorySizeTooltip')}
      />
      <StatCard
        label={t('repositoryStatsGrid.originalSize')}
        value={formatBytesUtil(stats.original_size)}
        icon={<Database size={32} />}
        colorKey="info"
        tooltip={t('repositoryStatsGrid.originalSizeTooltip')}
      />
      <StatCard
        label={
          isBorg2 ? t('repositoryStatsGrid.numberOfFiles') : t('repositoryStatsGrid.compressedSize')
        }
        value={isBorg2 ? stats.total_files || 0 : formatBytesUtil(stats.compressed_size)}
        icon={isBorg2 ? <ArchiveIcon size={32} /> : <Database size={32} />}
        colorKey="secondary"
        tooltip={
          isBorg2
            ? t('repositoryStatsGrid.numberOfFilesTooltip')
            : t('repositoryStatsGrid.compressedSizeTooltip')
        }
      />
    </div>
  )
}
