import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, within, renderWithProviders } from '../../test/test-utils'
import CodeEditor from '../CodeEditor'

function StatefulEditor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <CodeEditor value={value} onChange={setValue} />
}

function getInput() {
  return screen.getByTestId('code-editor-input') as HTMLTextAreaElement
}

describe('CodeEditor', () => {
  it('renders the editable surface synchronously, with no loading state to wait on', () => {
    renderWithProviders(<CodeEditor value="echo hi" onChange={vi.fn()} />)

    expect(getInput()).toHaveValue('echo hi')
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('renders without requesting anything from the network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderWithProviders(<CodeEditor value="echo hi" onChange={vi.fn()} />)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(document.querySelectorAll('script[src], link[href]')).toHaveLength(0)
    fetchSpy.mockRestore()
  })

  it('numbers every line of the script', () => {
    renderWithProviders(<CodeEditor value={'#!/bin/bash\necho one\necho two'} onChange={vi.fn()} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('4')).not.toBeInTheDocument()
  })

  it('highlights shell comments, strings, variables and keywords', () => {
    renderWithProviders(
      <CodeEditor value={'# note\nif [ -n "$HOME" ]; then'} onChange={vi.fn()} />,
    )

    expect(screen.getByText('# note')).toHaveClass('italic')
    expect(screen.getByText('if')).toHaveClass('font-semibold')
    expect(screen.getByText('then')).toHaveClass('font-semibold')
    expect(screen.getByText('"$HOME"')).toBeInTheDocument()
  })

  it('leaves non-shell content untokenized', () => {
    renderWithProviders(<CodeEditor value="if then" onChange={vi.fn()} language="plaintext" />)

    expect(screen.queryByText('if')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('code-editor-highlight')).getByText('if then')).toBeInTheDocument()
  })

  it('reports edits through onChange', () => {
    const onChange = vi.fn()
    renderWithProviders(<CodeEditor value="echo hi" onChange={onChange} />)

    fireEvent.change(getInput(), { target: { value: 'echo bye' } })

    expect(onChange).toHaveBeenCalledWith('echo bye')
  })

  it('associates the label and helper text with the input', () => {
    renderWithProviders(
      <CodeEditor value="" onChange={vi.fn()} label="Script" helperText="Runs before backup" />,
    )

    expect(screen.getByLabelText('Script')).toBe(getInput())
    expect(getInput()).toHaveAccessibleDescription('Runs before backup')
  })

  it('inserts two spaces at the caret when Tab is pressed', () => {
    renderWithProviders(<StatefulEditor initial={'echo hi'} />)
    const input = getInput()
    input.setSelectionRange(0, 0)

    fireEvent.keyDown(input, { key: 'Tab' })

    expect(input).toHaveValue('  echo hi')
    expect(input.selectionStart).toBe(2)
  })

  it('indents every line covered by the selection', () => {
    renderWithProviders(<StatefulEditor initial={'one\ntwo\nthree'} />)
    const input = getInput()
    input.setSelectionRange(0, 8)

    fireEvent.keyDown(input, { key: 'Tab' })

    expect(input).toHaveValue('  one\n  two\nthree')
  })

  it('outdents the current line with Shift+Tab', () => {
    renderWithProviders(<StatefulEditor initial={'  echo hi'} />)
    const input = getInput()
    input.setSelectionRange(9, 9)

    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

    expect(input).toHaveValue('echo hi')
  })

  it('leaves an unindented line alone on Shift+Tab', () => {
    const onChange = vi.fn()
    renderWithProviders(<CodeEditor value="echo hi" onChange={onChange} />)
    const input = getInput()
    input.setSelectionRange(0, 0)

    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

    expect(onChange).not.toHaveBeenCalled()
  })
})
