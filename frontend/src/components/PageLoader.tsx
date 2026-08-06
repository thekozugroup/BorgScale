import { Skeleton } from '@/components/ui/skeleton'

/**
 * Fallback shown while a lazily-loaded route chunk is downloading.
 *
 * It mirrors the shape every page shares — a title block, a summary row, then a
 * content surface — so the layout does not jump when the real page mounts.
 */
export default function PageLoader() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
