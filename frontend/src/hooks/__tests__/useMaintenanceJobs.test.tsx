import { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMaintenanceJobs } from '../useMaintenanceJobs'
import { repositoriesAPI } from '../../services/api'

vi.mock('../../services/api', () => ({
  repositoriesAPI: {
    getRunningJobs: vi.fn(),
  },
}))

const getRunningJobs = vi.mocked(repositoriesAPI.getRunningJobs)

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function runningJobsResponse(hasRunningJobs: boolean) {
  return {
    data: {
      has_running_jobs: hasRunningJobs,
      check_job: null,
      compact_job: null,
      prune_job: null,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('useMaintenanceJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setDocumentHidden(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    setDocumentHidden(false)
  })

  it('polls every three seconds while maintenance jobs are running', async () => {
    getRunningJobs.mockResolvedValue(runningJobsResponse(true))

    renderHook(() => useMaintenanceJobs(1), { wrapper: createWrapper() })

    await advance(0)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)

    await advance(3000)
    expect(getRunningJobs).toHaveBeenCalledTimes(2)
  })

  it('stops polling once nothing is running', async () => {
    getRunningJobs.mockResolvedValue(runningJobsResponse(false))

    renderHook(() => useMaintenanceJobs(1), { wrapper: createWrapper() })

    await advance(0)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)

    await advance(30000)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)
  })

  it('backs off instead of retrying at full rate while requests keep failing', async () => {
    getRunningJobs.mockRejectedValue(new Error('backend unreachable'))

    renderHook(() => useMaintenanceJobs(1), { wrapper: createWrapper() })

    await advance(0)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)

    // First failure doubles the interval to 6s
    await advance(3000)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)
    await advance(3000)
    expect(getRunningJobs).toHaveBeenCalledTimes(2)

    // Second failure doubles it again to 12s
    await advance(6000)
    expect(getRunningJobs).toHaveBeenCalledTimes(2)
    await advance(6000)
    expect(getRunningJobs).toHaveBeenCalledTimes(3)
  })

  it('returns to the normal poll rate once a request succeeds again', async () => {
    getRunningJobs.mockRejectedValueOnce(new Error('backend unreachable'))
    getRunningJobs.mockResolvedValue(runningJobsResponse(true))

    renderHook(() => useMaintenanceJobs(1), { wrapper: createWrapper() })

    await advance(0)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)

    await advance(6000)
    expect(getRunningJobs).toHaveBeenCalledTimes(2)

    await advance(3000)
    expect(getRunningJobs).toHaveBeenCalledTimes(3)
  })

  it('does not poll while the tab is hidden', async () => {
    getRunningJobs.mockResolvedValue(runningJobsResponse(true))

    renderHook(() => useMaintenanceJobs(1), { wrapper: createWrapper() })

    await advance(0)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)

    setDocumentHidden(true)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await advance(30000)
    expect(getRunningJobs).toHaveBeenCalledTimes(1)
  })
})
