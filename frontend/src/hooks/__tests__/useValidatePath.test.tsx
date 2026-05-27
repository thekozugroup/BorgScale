import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useValidatePath } from '../useValidatePath'

vi.mock('@/services/api', () => ({
  default: { post: vi.fn() },
}))
import api from '@/services/api'

const apiPost = api.post as unknown as ReturnType<typeof vi.fn>

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useValidatePath', () => {
  it('returns validation when API succeeds', async () => {
    apiPost.mockResolvedValue({
      data: {
        exists: true,
        is_directory: true,
        is_borg_repo: false,
        path: '/data/borg/new',
      },
    })
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const { result } = renderHook(() => useValidatePath(), {
      wrapper: wrap(qc),
    })
    const res = await result.current.mutateAsync('/data/borg/new')
    expect(res.exists).toBe(true)
    // is_dir is mirrored from is_directory
    expect(res.is_dir).toBe(true)
    expect(res.is_directory).toBe(true)
    expect(res.is_borg_repo).toBe(false)
  })

  it('returns error when API rejects', async () => {
    apiPost.mockRejectedValue({ response: { data: { detail: 'not found' } } })
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const { result } = renderHook(() => useValidatePath(), {
      wrapper: wrap(qc),
    })
    const res = await result.current.mutateAsync('/nonexistent')
    expect(res.exists).toBe(false)
    expect(res.error).toBe('not found')
  })
})
