import { Skeleton } from '@/components/ui/skeleton'

const STAT_COUNT = 4

function StatCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="rounded-lg px-4 py-3.5 bg-muted/50 border border-border opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: STAT_COUNT }, (_, i) => (
        <StatCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}
