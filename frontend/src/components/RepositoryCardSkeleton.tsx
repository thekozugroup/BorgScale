import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface RepositoryCardSkeletonProps {
  index?: number
}

const NAME_WIDTHS = [120, 148, 104, 136, 116, 152]
const PATH_WIDTHS = [200, 240, 180, 220, 196, 232]

export default function RepositoryCardSkeleton({ index = 0 }: RepositoryCardSkeletonProps) {
  const nameWidth = NAME_WIDTHS[index % NAME_WIDTHS.length]
  const pathWidth = PATH_WIDTHS[index % PATH_WIDTHS.length]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card',
        'shadow-[0_0_0_1px_theme(colors.border),0_2px_8px_theme(colors.black/7%)] dark:shadow-[0_0_0_1px_theme(colors.border),0_4px_16px_theme(colors.black/25%)]',
        'opacity-0 animate-[skeletonFadeIn_0.4s_ease_forwards]',
        '[animation-delay:var(--delay)]'
      )}
      style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}
    >
      <div className="px-4 pb-3.5 pt-4 sm:px-5">
        {/* ── Header ── */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Name row */}
            <div className="mb-1 flex items-center gap-1.5">
              <Skeleton className="h-5 rounded" style={{ width: nameWidth }} />
              <Skeleton className="h-4.5 w-10 shrink-0 rounded-full" />
            </div>
            {/* Path */}
            <Skeleton className="h-3.5 rounded" style={{ width: pathWidth }} />
          </div>
          {/* Edit button placeholder */}
          <Skeleton className="size-7 shrink-0 rounded" />
        </div>

        {/* ── Stats Band ── */}
        <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-border/60 bg-muted/30 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => {
            const isRightColXs = i % 2 === 1
            const isLastSm = i === 3
            const isFirstRowXs = i < 2
            return (
              <div
                key={i}
                className={cn(
                  'px-3 py-2.5',
                  !isLastSm && 'border-r border-border/60',
                  isFirstRowXs && 'border-b border-border/60 sm:border-b-0',
                  isRightColXs && 'border-r-0 sm:border-r',
                  isLastSm && 'border-r-0'
                )}
              >
                <div className="mb-1 flex items-center gap-1">
                  <Skeleton className="size-2.5 shrink-0 rounded" />
                  <Skeleton className="h-2.5 w-10 rounded" />
                </div>
                <Skeleton
                  className="h-4 rounded"
                  style={{ width: [36, 48, 52, 44][i] }}
                />
              </div>
            )
          })}
        </div>

        {/* ── Secondary Metadata ── */}
        <div className="mb-3 flex flex-wrap gap-3 px-0.5">
          {[56, 72, 68, 60].map((w, i) => (
            <Skeleton key={i} className="h-3 rounded" style={{ width: w }} />
          ))}
        </div>

        {/* ── Action Bar ── */}
        <div className="flex items-center gap-1.5 border-t border-border/60 pt-3">
          {/* Left icon cluster */}
          <div className="flex flex-1 items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="size-8 rounded-md" />
            ))}
          </div>
          {/* Right: primary action button */}
          <Skeleton className="h-7.5 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}
