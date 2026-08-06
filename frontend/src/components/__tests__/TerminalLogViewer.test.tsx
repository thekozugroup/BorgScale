import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderWithProviders, screen } from '../../test/test-utils'
import { TerminalLogViewer } from '../TerminalLogViewer'

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const jsonLine = (lineNumber: number, file: string) => ({
  line_number: lineNumber,
  content: `{"file": "${file}"}`,
})

function logsResponse(lines: Array<{ line_number: number; content: string }>) {
  return { lines, total_lines: lines.length, has_more: false }
}

describe('TerminalLogViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setDocumentHidden(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    setDocumentHidden(false)
  })

  it('does not re-render log lines that did not change between polls', async () => {
    const onFetchLogs = vi.fn().mockResolvedValue(logsResponse([jsonLine(1, 'one.txt')]))

    renderWithProviders(<TerminalLogViewer jobId="7" status="running" onFetchLogs={onFetchLogs} />)

    await advance(0)
    expect(onFetchLogs).toHaveBeenCalledTimes(1)

    // colorizeJsonLine parses each line it renders, so a parse means a re-render
    const parseSpy = vi.spyOn(JSON, 'parse')
    const renderedLines = () =>
      parseSpy.mock.calls.filter(([value]) => typeof value === 'string' && value.includes('"file"'))

    await advance(2000)
    expect(onFetchLogs).toHaveBeenCalledTimes(2)
    expect(renderedLines()).toHaveLength(0)

    onFetchLogs.mockResolvedValue(logsResponse([jsonLine(1, 'one.txt'), jsonLine(2, 'two.txt')]))
    await advance(2000)

    // Only the appended line is rendered again — the untouched one is reused
    expect(renderedLines()).toEqual([['{"file": "two.txt"}']])
    parseSpy.mockRestore()
  })

  it('stops polling once the job is no longer running', async () => {
    const onFetchLogs = vi.fn().mockResolvedValue(logsResponse([jsonLine(1, 'one.txt')]))

    const { rerender } = renderWithProviders(
      <TerminalLogViewer jobId="7" status="running" onFetchLogs={onFetchLogs} />
    )

    await advance(0)
    expect(onFetchLogs).toHaveBeenCalledTimes(1)

    rerender(<TerminalLogViewer jobId="7" status="completed" onFetchLogs={onFetchLogs} />)
    await advance(0)
    const callsWhenFinished = onFetchLogs.mock.calls.length

    await advance(30000)
    expect(onFetchLogs).toHaveBeenCalledTimes(callsWhenFinished)
  })

  it('does not fetch logs while the tab is hidden', async () => {
    const onFetchLogs = vi.fn().mockResolvedValue(logsResponse([jsonLine(1, 'one.txt')]))

    renderWithProviders(<TerminalLogViewer jobId="7" status="running" onFetchLogs={onFetchLogs} />)

    await advance(0)
    expect(onFetchLogs).toHaveBeenCalledTimes(1)

    setDocumentHidden(true)
    await advance(10000)
    expect(onFetchLogs).toHaveBeenCalledTimes(1)

    setDocumentHidden(false)
    await advance(2000)
    expect(onFetchLogs).toHaveBeenCalledTimes(2)
  })

  it('renders the streaming badge while the job runs', async () => {
    const onFetchLogs = vi.fn().mockResolvedValue(logsResponse([jsonLine(1, 'one.txt')]))

    renderWithProviders(<TerminalLogViewer jobId="7" status="running" onFetchLogs={onFetchLogs} />)

    await advance(0)
    expect(screen.getByText('Live Streaming (Last 500 lines)')).toBeInTheDocument()
  })
})
