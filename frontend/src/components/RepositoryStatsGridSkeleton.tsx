import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '../context/ThemeContext'

type ColorKey = 'primary' | 'success' | 'info' | 'secondary' | 'warning'

const STAT_COLORS: ColorKey[] = ['primary', 'success', 'info', 'secondary']

const COLOR_BG: Record<ColorKey, { light: string; dark: string }> = {
  primary: { light: 'rgba(37,99,235,0.07)', dark: 'rgba(37,99,235,0.1)' },
  success: { light: 'rgba(22,163,74,0.07)', dark: 'rgba(22,163,74,0.1)' },
  info: { light: 'rgba(8,145,178,0.07)', dark: 'rgba(8,145,178,0.1)' },
  secondary: { light: 'rgba(124,58,237,0.07)', dark: 'rgba(124,58,237,0.1)' },
  warning: { light: 'rgba(234,88,12,0.07)', dark: 'rgba(234,88,12,0.1)' },
}

interface StatCardSkeletonProps {
  colorKey: ColorKey
  index: number
}

function StatCardSkeleton({ colorKey, index }: StatCardSkeletonProps) {
  const { effectiveMode } = useTheme()
  const isDark = effectiveMode === 'dark'
  const bg = COLOR_BG[colorKey][isDark ? 'dark' : 'light']

  return (
    <div
      className="rounded-lg px-4 py-3.5"
      style={{
        background: bg,
        boxShadow: isDark
          ? '0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)',
        opacity: 0,
        animation: `fadeInUp 0.35s ease forwards`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-2.5 mb-2 rounded" style={{ width: [64, 72, 84, 96][index] }} />
          <Skeleton className="h-7 rounded" style={{ width: [48, 56, 60, 62][index] }} />
        </div>
        <Skeleton className="w-8 h-8 rounded mt-0.5 opacity-50" />
      </div>
    </div>
  )
}

export default function RepositoryStatsGridSkeleton() {
  return (
    <>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_COLORS.map((colorKey, i) => (
          <StatCardSkeleton key={colorKey} colorKey={colorKey} index={i} />
        ))}
      </div>
    </>
  )
}
