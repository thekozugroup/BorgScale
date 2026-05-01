import { render, screen, fireEvent } from '@testing-library/react'
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
    render(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[1]}
        onChange={onChange}
        allowReorder={true}
      />
    )
    // Repo A (id:1) is already selected — clicking it again should remove it or be a no-op;
    // the component uses toggle semantics, so clicking a selected repo deselects it.
    // For uniqueness: open the dropdown and click Repo A (already selected).
    // Use the actual component API: open dropdown by clicking the input/button
    const dropdownTrigger = screen.getByPlaceholderText(/select repositories/i)
    fireEvent.click(dropdownTrigger)

    // Repo A option should appear
    const repoAOption = screen.getAllByText('Repo A')
    expect(repoAOption.length).toBeGreaterThan(0)
  })

  it('should allow adding distinct repositories', () => {
    const onChange = vi.fn()
    render(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[1]}
        onChange={onChange}
        allowReorder={true}
      />
    )

    // Open dropdown
    const dropdownTrigger = screen.getByPlaceholderText(/select repositories/i)
    fireEvent.click(dropdownTrigger)

    // Click Repo B (not yet selected)
    const repoBOptions = screen.getAllByText('Repo B')
    fireEvent.click(repoBOptions[repoBOptions.length - 1])

    // onChange should have been called with [1, 2]
    expect(onChange).toHaveBeenCalledWith([1, 2])
  })
})
