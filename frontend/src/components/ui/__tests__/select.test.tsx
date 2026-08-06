import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/test-utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'

function renderSelect() {
  return renderWithProviders(
    <Select defaultValue="all">
      <SelectTrigger aria-label="Filter">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="failed">Failed</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('ui/select', () => {
  it('floats on the shared frosted surface', async () => {
    const user = userEvent.setup()
    renderSelect()

    await user.click(screen.getByRole('combobox'))

    const content = document.querySelector('[data-slot="select-content"]')
    expect(content?.className).toContain('surface-frost')
    expect(content?.className).not.toContain('bg-popover')
  })

  it('does not punch an opaque strip through the frost with its scroll buttons', async () => {
    const user = userEvent.setup()
    renderSelect()

    await user.click(screen.getByRole('combobox'))

    const scrollButtons = document.querySelectorAll(
      '[data-slot="select-scroll-up-button"], [data-slot="select-scroll-down-button"]'
    )
    scrollButtons.forEach((button) => {
      expect(button.className).not.toContain('bg-popover')
    })
  })
})
