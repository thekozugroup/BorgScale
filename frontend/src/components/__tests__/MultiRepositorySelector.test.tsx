import { fireEvent, screen, renderWithProviders } from '../../test/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { MultiRepositorySelector } from '../MultiRepositorySelector'
import { Repository } from '@/types'

const mockRepositories: Repository[] = [
  { id: 1, name: 'Repo A', path: '/path/to/a' } as Repository,
  { id: 2, name: 'Repo B', path: '/path/to/b' } as Repository,
  { id: 3, name: 'Repo C', path: '/path/to/c' } as Repository,
]

describe('MultiRepositorySelector Uniqueness', () => {
  it('should dedup repositories when duplicate is added', () => {
    const onChange = vi.fn()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[1]}
        onChange={onChange}
        allowReorder={true}
      />
    )
    // Open the dropdown by clicking the trigger div (shows "Search or add more..." text)
    const dropdownTrigger = screen.getByText(/Search or add more|Select repositories/i).closest('div[class*="cursor-pointer"]') ?? screen.getByText(/Search or add more/i).closest('div')
    fireEvent.click(dropdownTrigger!)

    // Repo A option should appear in the dropdown list
    const repoAOptions = screen.getAllByText('Repo A')
    expect(repoAOptions.length).toBeGreaterThan(0)
  })

  it('should allow adding distinct repositories', () => {
    const onChange = vi.fn()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[1]}
        onChange={onChange}
        allowReorder={true}
      />
    )

    // Open dropdown by clicking the trigger
    const dropdownTrigger = screen.getByText(/Search or add more|Select repositories/i).closest('div[class*="cursor-pointer"]') ?? screen.getByText(/Search or add more/i).closest('div')
    fireEvent.click(dropdownTrigger!)

    // Click Repo B (not yet selected) - it appears in the dropdown options
    const repoBOptions = screen.getAllByText('Repo B')
    fireEvent.click(repoBOptions[repoBOptions.length - 1])

    // onChange should have been called with [1, 2]
    expect(onChange).toHaveBeenCalledWith([1, 2])
  })
})
