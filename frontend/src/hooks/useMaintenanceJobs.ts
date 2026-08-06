import { useRef, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { repositoriesAPI } from '../services/api'

interface MaintenanceJob {
  id: number
  progress: number
  progress_message: string | null
  started_at: string | null
}

interface RunningJobsResponse {
  has_running_jobs: boolean
  check_job: MaintenanceJob | null
  compact_job: MaintenanceJob | null
  prune_job: MaintenanceJob | null
}

const ACTIVE_POLL_MS = 3000
const MAX_FAILURE_BACKOFF_MS = 60000

const subscribeToVisibility = (onStoreChange: () => void) => {
  document.addEventListener('visibilitychange', onStoreChange)
  return () => document.removeEventListener('visibilitychange', onStoreChange)
}

const getDocumentHidden = () => document.hidden

/**
 * Hook to track running maintenance jobs (check/compact/prune) for a repository
 *
 * Polls every 3 seconds while jobs are running and stops once they finish.
 * One instance runs per repository card, so repeated failures back off
 * exponentially and polling pauses entirely while the tab is hidden — a
 * 20-repository dashboard would otherwise multiply every request.
 */
export function useMaintenanceJobs(repositoryId: number | null, enabled: boolean = true) {
  const documentHidden = useSyncExternalStore(subscribeToVisibility, getDocumentHidden)
  // React Query resets its own failure count on every fetch, so the streak that
  // drives the backoff is tracked here
  const failureStreak = useRef(0)

  const { data, isLoading } = useQuery({
    queryKey: ['running-jobs', repositoryId],
    queryFn: async () => {
      try {
        const response = await repositoriesAPI.getRunningJobs(repositoryId!)
        failureStreak.current = 0
        return response.data as RunningJobsResponse
      } catch (error) {
        failureStreak.current += 1
        throw error
      }
    },
    enabled: enabled && repositoryId !== null,
    refetchInterval: (query) => {
      if (!enabled || documentHidden) return false
      if (failureStreak.current > 0) {
        return Math.min(ACTIVE_POLL_MS * 2 ** failureStreak.current, MAX_FAILURE_BACKOFF_MS)
      }
      // Keep polling if we have running jobs, or if we haven't fetched data yet
      const data = query.state.data
      return !data || data.has_running_jobs ? ACTIVE_POLL_MS : false
    },
    refetchOnWindowFocus: true, // Refetch when returning to tab
    refetchOnMount: true, // Refetch when component mounts
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache results (was cacheTime in v3)
    retry: false,
  })

  return {
    hasRunningJobs: data?.has_running_jobs ?? false,
    checkJob: data?.check_job ?? null,
    compactJob: data?.compact_job ?? null,
    pruneJob: data?.prune_job ?? null,
    isLoading,
  }
}
