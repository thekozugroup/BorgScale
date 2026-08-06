import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent, waitFor } from '../../test/test-utils'
import Activity from '../Activity'
import { activityAPI } from '../../services/api'

const refetchSpy = vi.fn()
const jobsTablePropsSpy = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    hasGlobalPermission: (permission: string) => permission === 'repositories.manage_all',
  }),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => {
      void queryFn()
      return {
        data: [
          {
            id: 7,
            type: 'backup',
            status: 'completed',
            started_at: '2026-04-01T10:00:00Z',
            completed_at: '2026-04-01T10:05:00Z',
            error_message: null,
            repository: '/backup/repo7',
            log_file_path: '/logs/job7.log',
            archive_name: null,
            package_name: null,
            repository_path: '/backup/repo7',
            has_logs: true,
          },
        ],
        isLoading: false,
        refetch: refetchSpy,
      }
    },
  }
})

vi.mock('../../components/BackupJobsTable', () => ({
  default: (props: unknown) => {
    jobsTablePropsSpy(props)
    return <div>Jobs Table</div>
  },
}))

describe('Activity page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(activityAPI, 'list').mockResolvedValue({ data: [] } as never)
  })

  it('passes filters into the activity API and supports refresh', async () => {
    const user = userEvent.setup()

    renderWithProviders(<Activity />)

    expect(await screen.findByText('Jobs Table')).toBeInTheDocument()
    expect(activityAPI.list).toHaveBeenCalledWith({ limit: 200 })
    expect(jobsTablePropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showTypeColumn: true,
        showTriggerColumn: true,
        canBreakLocks: true,
        canDeleteJobs: true,
        actions: expect.objectContaining({ delete: true, breakLock: true }),
      })
    )

    await user.click(screen.getAllByRole('combobox')[0])
    await user.click(await screen.findByRole('option', { name: 'Restore' }))

    await waitFor(() => {
      expect(activityAPI.list).toHaveBeenLastCalledWith({
        limit: 200,
        job_type: 'restore',
      })
    })

    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(await screen.findByRole('option', { name: 'Failed' }))

    await waitFor(() => {
      expect(activityAPI.list).toHaveBeenLastCalledWith({
        limit: 200,
        job_type: 'restore',
        status: 'failed',
      })
    })

    await user.click(screen.getByRole('button', { name: /refresh/i }))
    expect(refetchSpy).toHaveBeenCalled()
  })

  it('renders the filters as shared Select components, not native selects', async () => {
    renderWithProviders(<Activity />)

    expect(await screen.findByText('Jobs Table')).toBeInTheDocument()
    expect(document.querySelectorAll('select')).toHaveLength(0)

    const triggers = screen.getAllByRole('combobox')
    expect(triggers).toHaveLength(2)
    triggers.forEach((trigger) => {
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
    })
  })

  it('uses the design-system page title spec', async () => {
    renderWithProviders(<Activity />)

    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading.className).toContain('text-2xl')
    expect(heading.className).toContain('font-semibold')
    expect(heading.className).toContain('tracking-tight')
  })
})
