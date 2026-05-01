import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ArchiveCardSkeletonProps {
  index?: number
}

const widths = [160, 200, 140, 180, 152, 190, 170, 210, 145, 185]

export default function ArchiveCardSkeleton({ index = 0 }: ArchiveCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border-b border-b-neutral-100 dark:border-b-neutral-800/70 opacity-0',
        // Desktop: 4-col grid; mobile: flex-wrap
        'md:grid md:grid-cols-[minmax(0,1fr)_76px_minmax(180px,220px)_132px] md:items-center md:gap-2 md:px-4 md:py-[9px]',
        'flex flex-wrap gap-1.5 px-[14px] py-[10px]',
        'animate-[archiveSkeletonFadeIn_0.35s_ease_forwards]',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <style>{`
        @keyframes archiveSkeletonFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <Skeleton
        className="h-4 rounded-sm"
        style={{ width: widths[index % 10] }}
      />
      <Skeleton className="h-[18px] w-9 rounded-full" />
      <Skeleton className="h-3.5 w-[90px]" />
      <div className="flex gap-0.5 md:justify-end">
        <Skeleton className="size-7 rounded-[6px]" />
        <Skeleton className="size-7 rounded-[6px]" />
        <Skeleton className="size-7 rounded-[6px]" />
        <Skeleton className="size-7 rounded-[6px]" />
      </div>
    </div>
  )
}
