import { useQuery } from '@tanstack/react-query'
import { repositoriesAPI } from '../services/api'

export interface FirstRunState {
  showWelcome: boolean
  isLoading: boolean
  isError: boolean
  count: number
}

/**
 * useFirstRun
 *
 * Returns whether the dashboard should be replaced with the first-run welcome
 * experience (i.e. the user has zero Borg repositories).
 *
 * Reuses the same query key as the Repositories page (`['repositories']`) so
 * the React Query cache is shared and we don't double-fetch.
 */
export function useFirstRun(): FirstRunState {
  const query = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.getRepositories,
    staleTime: 30_000,
  })

  // Backend shapes seen:
  //   - axios response wrapping `{ repositories: [...] }` (current)
  //   - bare array
  //   - `{ items: [...] }` / `{ data: [...] }`
  let count = 0
  const payload = query.data
    ? // axios response: { data: T } — but the backend already has its own .data property
      (query.data as { data?: unknown }).data
    : undefined

  if (Array.isArray(payload)) {
    count = payload.length
  } else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    const maybe = obj.repositories ?? obj.items ?? obj.data
    if (Array.isArray(maybe)) count = maybe.length
  }

  return {
    showWelcome: !query.isLoading && !query.isError && count === 0,
    isLoading: query.isLoading,
    isError: query.isError,
    count,
  }
}
