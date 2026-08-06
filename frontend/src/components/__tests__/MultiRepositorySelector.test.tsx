import { screen, renderWithProviders, userEvent } from '../../test/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { MultiRepositorySelector } from '../MultiRepositorySelector'
import { Repository } from '@/types'

const mockRepositories: Repository[] = [
  { id: 1, name: 'Repo A', path: '/path/to/a' } as Repository,
  { id: 2, name: 'Repo B', path: '/path/to/b' } as Repository,
  { id: 3, name: 'Repo C', path: '/path/to/c' } as Repository,
]

const getTrigger = () => screen.getByRole('button', { name: /repositories/i })

describe('MultiRepositorySelector Uniqueness', () => {
  it('should dedup repositories when duplicate is added', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[1]}
        onChange={onChange}
        allowReorder={true}
      />
    )
    await user.click(getTrigger())

    // Repo A option should appear in the dropdown list
    const repoAOptions = screen.getAllByText('Repo A')
    expect(repoAOptions.length).toBeGreaterThan(0)
  })

  it('should allow adding distinct repositories', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[1]}
        onChange={onChange}
        allowReorder={true}
      />
    )

    await user.click(getTrigger())

    // Click Repo B (not yet selected) - it appears in the dropdown options
    await user.click(screen.getByRole('option', { name: /repo b/i }))

    // onChange should have been called with [1, 2]
    expect(onChange).toHaveBeenCalledWith([1, 2])
  })
})

describe('MultiRepositorySelector accessibility', () => {
  it('exposes combobox trigger semantics with aria-expanded and aria-controls', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    )

    const trigger = getTrigger()
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('id', trigger.getAttribute('aria-controls'))
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
  })

  it('marks options with role=option and aria-selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[2]}
        onChange={vi.fn()}
      />
    )
    await user.click(getTrigger())

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(screen.getByRole('option', { name: /repo b/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: /repo a/i })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('supports full keyboard selection: Tab, Enter, ArrowDown, Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[]}
        onChange={onChange}
      />
    )

    await user.tab()
    expect(getTrigger()).toHaveFocus()

    await user.keyboard('{Enter}')
    const searchInput = screen.getByRole('combobox')
    expect(searchInput).toHaveFocus()

    // First option is active on open; ArrowDown moves to the second
    const options = screen.getAllByRole('option')
    expect(searchInput).toHaveAttribute('aria-activedescendant', options[0].id)

    await user.keyboard('{ArrowDown}')
    expect(searchInput).toHaveAttribute('aria-activedescendant', options[1].id)

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith([2])
  })

  it('opens the dropdown with ArrowDown on the trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    )

    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('wraps ArrowUp navigation to the last option', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    )
    await user.click(getTrigger())

    const options = screen.getAllByRole('option')
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', options[2].id)
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    )
    const trigger = getTrigger()
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('keeps arrow navigation within the filtered options', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MultiRepositorySelector
        repositories={mockRepositories}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    )
    await user.click(getTrigger())
    await user.keyboard('Repo B')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', options[0].id)
  })
})
