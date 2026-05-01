import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Copy, Download, PlayCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LogLine {
  line_number: number
  content: string
}

export interface TerminalLogViewerHandle {
  copyLogs: () => void
}

interface TerminalLogViewerProps {
  jobId: string
  status: string
  jobType?: string
  showHeader?: boolean
  onFetchLogs: (offset: number) => Promise<{
    lines: LogLine[]
    total_lines: number
    has_more: boolean
  }>
}

// JSON syntax highlighting (VS Code Dark+ colour scheme)
const JSON_TOKEN_REGEX =
  /("(?:[^"\\]|\\.)*")\s*(?=:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g

function colorizeJsonLine(content: string): React.ReactNode {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return content
  try {
    JSON.parse(trimmed)
  } catch {
    return content
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  JSON_TOKEN_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = JSON_TOKEN_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const [fullMatch, key, stringVal, num, keyword, punct] = match
    if (key) {
      parts.push(<span key={match.index} style={{ color: '#9cdcfe' }}>{key}</span>)
      const trailingSpace = fullMatch.slice(key.length)
      if (trailingSpace) parts.push(trailingSpace)
    } else if (stringVal) {
      parts.push(<span key={match.index} style={{ color: '#ce9178' }}>{stringVal}</span>)
    } else if (num) {
      parts.push(<span key={match.index} style={{ color: '#b5cea8' }}>{num}</span>)
    } else if (keyword) {
      parts.push(<span key={match.index} style={{ color: '#569cd6' }}>{keyword}</span>)
    } else if (punct) {
      parts.push(punct)
    }
    lastIndex = match.index + fullMatch.length
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex))
  return <>{parts}</>
}

const MemoizedLogLine = React.memo(({ log }: { log: LogLine }) => (
  <div className="mb-1">
    <span
      className="text-neutral-500 text-[0.8rem] mr-4 select-none"
    >
      {log.line_number}
    </span>
    <span className="text-neutral-200">{colorizeJsonLine(log.content)}</span>
  </div>
))
MemoizedLogLine.displayName = 'MemoizedLogLine'

export const TerminalLogViewer = React.forwardRef<TerminalLogViewerHandle, TerminalLogViewerProps>(
  function TerminalLogViewer(
    { jobId, status, jobType = 'backup', showHeader = true, onFetchLogs },
    ref
  ) {
    const { t } = useTranslation()
    const [logs, setLogs] = useState<LogLine[]>([])
    const logsRef = useRef<LogLine[]>([])
    const isLoadingRef = useRef(false)
    const logContainerRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)
    const [totalLines, setTotalLines] = useState(0)
    const [showingTail, setShowingTail] = useState(false)

    useEffect(() => {
      const fetchLogs = async () => {
        if (isLoadingRef.current) return
        isLoadingRef.current = true
        try {
          const offset = status === 'running' ? 0 : logsRef.current.length
          const result = await onFetchLogs(offset)
          if (status !== 'running' && logsRef.current.length === 0 && result.total_lines > 500) {
            const tailOffset = Math.max(0, result.total_lines - 500)
            const tailResult = await onFetchLogs(tailOffset)
            setLogs(tailResult.lines)
            logsRef.current = tailResult.lines
            setTotalLines(tailResult.total_lines)
            setShowingTail(true)
          } else {
            if (result.lines.length > 0) {
              if (status === 'running') {
                setLogs(result.lines)
                logsRef.current = result.lines
              } else {
                setLogs((prev) => {
                  const newLogs = [...prev, ...result.lines]
                  logsRef.current = newLogs
                  return newLogs
                })
              }
            }
            setTotalLines(result.total_lines)
          }
        } catch (error) {
          console.error('Failed to fetch logs:', error)
        } finally {
          isLoadingRef.current = false
        }
      }

      fetchLogs()
      if (status === 'running') {
        const interval = setInterval(fetchLogs, 2000)
        return () => clearInterval(interval)
      }
    }, [status, onFetchLogs])

    useEffect(() => {
      if (autoScroll && logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }
    }, [logs, autoScroll])

    const handleScroll = () => {
      if (logContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
        setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
      }
    }

    const handleCopyLogs = () => {
      const logText = logs.map((log) => log.content).join('\n')
      navigator.clipboard.writeText(logText)
      toast.success(t('terminalLogViewer.toasts.logsCopied'))
    }

    useImperativeHandle(ref, () => ({ copyLogs: handleCopyLogs }))

    const handleDownloadLogs = () => {
      const logText = logs.map((log) => log.content).join('\n')
      const blob = new Blob([logText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${jobId}_logs.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('terminalLogViewer.toasts.logsDownloaded'))
    }

    const handleJumpToStart = async () => {
      try {
        const result = await onFetchLogs(0)
        setLogs(result.lines)
        logsRef.current = result.lines
        setShowingTail(false)
        if (logContainerRef.current) logContainerRef.current.scrollTop = 0
      } catch (error) {
        console.error('Failed to fetch logs from start:', error)
        toast.error(t('terminalLogViewer.toasts.failedToLoad'))
      }
    }

    return (
      <div>
        {/* Header */}
        {showHeader && (
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4">
            <div>
              <p className="text-base font-semibold">{t('terminalLogViewer.title')}</p>
              {status === 'running' && totalLines > 500 && (
                <p className="text-xs text-muted-foreground">
                  {t('terminalLogViewer.tailLabel', { total: totalLines.toLocaleString() })}
                </p>
              )}
              {status !== 'running' && totalLines > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('terminalLogViewer.linesLabel', { count: logs.length, total: totalLines })}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
              >
                <Copy size={14} />
                {t('terminalLogViewer.copyLogs')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleDownloadLogs}
                disabled={logs.length === 0}
              >
                <Download size={14} />
                {t('terminalLogViewer.download')}
              </Button>
            </div>
          </div>
        )}

        {/* Status bar above terminal */}
        {status === 'running' ? (
          <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 text-xs font-medium">
              <PlayCircle size={14} />
              {t('terminalLogViewer.liveStreaming')}
            </Badge>
            {totalLines > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('terminalLogViewer.linesDisplayed', { count: logs.length })}
              </span>
            )}
          </div>
        ) : showingTail && totalLines > 500 ? (
          <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
            <Badge variant="secondary" className="text-xs font-medium">
              {t('terminalLogViewer.showingLast', { total: totalLines.toLocaleString() })}
            </Badge>
            <Button size="sm" variant="ghost" className="text-xs h-auto py-1 min-w-0" onClick={handleJumpToStart}>
              {t('terminalLogViewer.jumpToStart')}
            </Button>
          </div>
        ) : null}

        {/* Terminal */}
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '0.875rem',
            padding: '1rem',
            height: 500,
            overflowY: 'auto',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            borderRadius: '0.375rem',
          }}
        >
          {logs.length === 0 ? (
            <span className="text-sm text-neutral-500">
              {status === 'running'
                ? t('terminalLogViewer.waitingForLogs')
                : t('terminalLogViewer.noLogsAvailable')}
            </span>
          ) : (
            logs.map((log) => <MemoizedLogLine key={`${jobId}-${log.line_number}`} log={log} />)
          )}

          {/* Running indicator */}
          {status === 'running' && (
            <div className="flex items-center mt-4">
              <div
                className="w-2 h-2 rounded-full mr-2 animate-pulse"
                style={{ background: 'hsl(var(--primary))' }}
              />
              <span className="text-sm" style={{ color: 'hsl(var(--primary))' }}>
                {t('terminalLog.inProgress', {
                  type: jobType.charAt(0).toUpperCase() + jobType.slice(1),
                })}
              </span>
            </div>
          )}
        </div>

        {/* Auto-scroll indicator */}
        {!autoScroll && status === 'running' && (
          <div className="mt-2 text-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAutoScroll(true)
                if (logContainerRef.current) {
                  logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
                }
              }}
            >
              {t('terminalLogViewer.newLogsAvailable')}
            </Button>
          </div>
        )}
      </div>
    )
  }
)

export default TerminalLogViewer
