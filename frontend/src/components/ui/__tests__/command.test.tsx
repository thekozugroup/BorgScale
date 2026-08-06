import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../../test/test-utils'
import { Command, CommandGroup, CommandItem, CommandList } from '../command'

describe('ui/command', () => {
  it('floats on the shared frosted surface', () => {
    renderWithProviders(
      <Command>
        <CommandList>
          <CommandGroup heading="Repositories">
            <CommandItem value="my-server">my-server</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )

    const root = document.querySelector('[data-slot="command"]')
    expect(root?.className).toContain('surface-frost')
    expect(root?.className).not.toContain('bg-popover')
  })
})
