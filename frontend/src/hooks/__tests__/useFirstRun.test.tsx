import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFirstRun } from '../useFirstRun'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  repositoriesAPI: {
    getRepositories: vi.fn(),
  },
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

describe('useFirstRun', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  it('returns showWelcome=true when no repositories exist', async () => {
    const { repositoriesAPI } = await import('../../services/api')
    vi.mocked(repositoriesAPI.getRepositories).mockResolvedValue({
      data: { repositories: [] },
    } as never)

    const { result } = renderHook(() => useFirstRun(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.showWelcome).toBe(true)
    expect(result.current.count).toBe(0)
  })

  it('returns showWelcome=false when at least one repository exists', async () => {
    const { repositoriesAPI } = await import('../../services/api')
    vi.mocked(repositoriesAPI.getRepositories).mockResolvedValue({
      data: { repositories: [{ id: 1, name: 'one' }] },
    } as never)

    const { result } = renderHook(() => useFirstRun(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.showWelcome).toBe(false)
    expect(result.current.count).toBe(1)
  })

  it('handles bare-array response shape', async () => {
    const { repositoriesAPI } = await import('../../services/api')
    vi.mocked(repositoriesAPI.getRepositories).mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
    } as never)

    const { result } = renderHook(() => useFirstRun(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.showWelcome).toBe(false)
    expect(result.current.count).toBe(2)
  })

  it('returns showWelcome=false on error', async () => {
    const { repositoriesAPI } = await import('../../services/api')
    vi.mocked(repositoriesAPI.getRepositories).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useFirstRun(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(true)
    expect(result.current.showWelcome).toBe(false)
  })
})
