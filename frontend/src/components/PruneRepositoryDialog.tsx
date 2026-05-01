import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ResponsiveDialog from './ResponsiveDialog'
import {
  Scissors,
  FlaskConical,
  TriangleAlert,
  Info,
  Clock,
  Sun,
  CalendarDays,
  CalendarRange,
  Calendar,
  CheckCircle2,
  XCircle,
  Terminal,
  Loader2,
} from 'lucide-react'
import { Repository } from '../types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface PruneForm {
  keep_hourly: number
  keep_daily: number
  keep_weekly: number
  keep_monthly: number
  keep_quarterly: number
  keep_yearly: number
}

interface PruneResults {
  dry_run: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prune_result?: any
}

interface PruneRepositoryDialogProps {
  open: boolean
  repository: Repository | null
  onClose: () => void
  onDryRun: (form: PruneForm) => Promise<void>
  onConfirmPrune: (form: PruneForm) => Promise<void>
  isLoading: boolean
  results: PruneResults | null
}

const defaultPruneForm: PruneForm = {
  keep_hourly: 0,
  keep_daily: 7,
  keep_weekly: 4,
  keep_monthly: 6,
  keep_quarterly: 0,
  keep_yearly: 1,
}

// ─── Colorized terminal output ────────────────────────────────────────────────

type BorgLineType =
  | 'keep'
  | 'prune'
  | 'separator'
  | 'stats-header'
  | 'stats-deleted'
  | 'stats-all'
  | 'stats-chunk'
  | 'empty'
  | 'normal'

// V1 prune logs are stored as "[stderr] {...json...}" lines — extract the message
function extractMessage(raw: string): string {
  const prefixMatch = raw.match(/^\[(stderr|stdout)\] (.+)$/)
  if (prefixMatch) {
    try {
      const parsed = JSON.parse(prefixMatch[2])
      return typeof parsed.message === 'string' ? parsed.message : prefixMatch[2]
    } catch {
      return prefixMatch[2]
    }
  }
  return raw
}

function classifyLine(msg: string): BorgLineType {
  const t = msg.trim()
  if (t === '') return 'empty'
  if (msg.startsWith('Keeping archive') || msg.startsWith('Would keep archive')) return 'keep'
  if (
    msg.startsWith('Pruning archive') ||
    msg.startsWith('Would prune archive') ||
    msg.startsWith('Would prune:')
  )
    return 'prune'
  if (/^-{6,}/.test(t)) return 'separator'
  if (/^\s*Deleted data:/.test(msg)) return 'stats-deleted'
  if (/^\s*All archives:/.test(msg)) return 'stats-all'
  if (/^\s*Chunk index:/.test(msg)) return 'stats-chunk'
  if (/^\s*(Original size|Compressed size|Unique chunks|Total chunks)/.test(msg))
    return 'stats-header'
  return 'normal'
}

// Segment a "Keeping/Pruning archive ..." line into typed spans
function segmentArchiveLine(line: string) {
  const ruleMatch = line.match(/(\(rule:[^)]+\))/)
  const hashMatch = line.match(/\[([a-f0-9]{16,})\]/)
  const colonIdx = line.indexOf(':')

  if (colonIdx === -1) return [{ text: line, kind: 'verb' as const }]

  const prefix = line.slice(0, colonIdx + 1)
  const rest = line.slice(colonIdx + 1)

  const segments: { text: string; kind: 'verb' | 'rule' | 'name' | 'date' | 'hash' | 'plain' }[] =
    []

  if (ruleMatch) {
    const rIdx = prefix.indexOf(ruleMatch[1])
    segments.push({ text: prefix.slice(0, rIdx), kind: 'verb' })
    segments.push({ text: ruleMatch[1], kind: 'rule' })
    segments.push({ text: prefix.slice(rIdx + ruleMatch[1].length), kind: 'plain' })
  } else {
    segments.push({ text: prefix, kind: 'verb' })
  }

  if (hashMatch) {
    const hStart = rest.lastIndexOf('[' + hashMatch[1])
    const beforeHash = rest.slice(0, hStart).trimEnd()
    const dateMatch = beforeHash.match(/\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\S+\s+\S+)$/)
    if (dateMatch) {
      segments.push({
        text: ' ' + beforeHash.slice(0, beforeHash.length - dateMatch[0].length).trim(),
        kind: 'name',
      })
      segments.push({ text: ' ' + dateMatch[1], kind: 'date' })
    } else {
      segments.push({ text: ' ' + beforeHash.trim(), kind: 'name' })
    }
    segments.push({ text: ' [' + hashMatch[1] + ']', kind: 'hash' })
  } else {
    segments.push({ text: rest, kind: 'name' })
  }

  return segments
}

interface ColorizedOutputProps {
  text: string
  isFailed?: boolean
}

// Semantic token CSS classes for colorized prune output line types
const LINE_CLASS: Record<BorgLineType, string> = {
  keep: 'text-primary',
  prune: 'text-destructive',
  separator: 'text-foreground/20',
  'stats-deleted': 'text-destructive',
  'stats-all': 'text-foreground',
  'stats-chunk': 'text-muted-foreground',
  'stats-header': 'text-muted-foreground',
  empty: '',
  normal: 'text-foreground',
}

function ColorizedOutput({ text, isFailed = false }: ColorizedOutputProps) {
  const lines = text.split('\n').map(extractMessage)

  return (
    <div
      style={{
        margin: 0,
        padding: '0.5rem',
        fontSize: '0.745rem',
        lineHeight: 1.7,
        overflow: 'auto',
        maxHeight: 380,
        fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
      }}
    >
      {lines.map((line, i) => {
        const type = classifyLine(line)

        if (type === 'empty') {
          return <div key={i} style={{ height: '0.5em' }} />
        }

        if (type === 'keep' || type === 'prune') {
          const segs = segmentArchiveLine(line)
          return (
            <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {segs.map((seg, j) => {
                const segClass =
                  seg.kind === 'verb'
                    ? type === 'keep' ? 'text-primary font-bold' : 'text-destructive font-bold'
                    : seg.kind === 'rule'
                      ? 'text-muted-foreground font-semibold'
                      : seg.kind === 'name'
                        ? 'text-foreground'
                        : seg.kind === 'date'
                          ? 'text-muted-foreground'
                          : seg.kind === 'hash'
                            ? 'text-foreground/30'
                            : 'text-foreground/60'
                return (
                  <span key={j} className={segClass}>
                    {seg.text}
                  </span>
                )
              })}
            </div>
          )
        }

        const lineClass = isFailed && type === 'normal' ? 'text-destructive' : LINE_CLASS[type]
        return (
          <div
            key={i}
            className={lineClass}
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontWeight: type === 'stats-deleted' || type === 'stats-all' ? 500 : 400,
            }}
          >
            {line}
          </div>
        )
      })}
    </div>
  )
}

// ─── Results Dialog ───────────────────────────────────────────────────────────

interface PruneResultsDialogProps {
  open: boolean
  results: PruneResults
  repository: Repository | null
  currentForm: PruneForm
  isLoading: boolean
  onClose: () => void
  onRunPrune: (form: PruneForm) => void
  onCloseAll: () => void
}

function PruneResultsDialog({
  open,
  results,
  repository,
  currentForm,
  isLoading,
  onClose,
  onRunPrune,
  onCloseAll,
}: PruneResultsDialogProps) {
  const { t } = useTranslation()

  const isFailed = results.prune_result?.success === false
  const isDryRun = results.dry_run
  const stdout = results.prune_result?.stdout ?? ''
  const stderr = results.prune_result?.stderr ?? ''
  const hasOutput = stdout || stderr

  const headerIcon = isFailed ? (
    <XCircle size={20} />
  ) : isDryRun ? (
    <FlaskConical size={20} />
  ) : (
    <CheckCircle2 size={20} />
  )

  const badge = isFailed
    ? t('dialogs.prune.pruneFailedBadge')
    : isDryRun
      ? t('dialogs.prune.dryRunPreviewBadge')
      : t('dialogs.prune.pruneCompleteBadge')

  const badgeColor = isFailed
    ? 'text-destructive bg-destructive/10 border-destructive/30'
    : isDryRun
      ? 'text-muted-foreground bg-muted border-border'
      : 'text-primary bg-primary/10 border-primary/20'

  const title = isDryRun
    ? t('dialogs.prune.dryRunResultsTitle')
    : isFailed
      ? t('dialogs.prune.operationFailed')
      : t('dialogs.prune.pruneResultsTitle')

  const stderrSectionBorderClass = isFailed ? 'border-destructive/20' : 'border-border'

  const footer = (
    <div className="flex items-center justify-end gap-2 px-5 py-3">
      {isDryRun && !isFailed ? (
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('dialogs.prune.close')}
          </Button>
          <Button
            size="sm"
            disabled={isLoading}
            className="gap-1.5 whitespace-nowrap bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onRunPrune(currentForm)}
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Scissors size={13} />}
            {isLoading ? t('status.running') : t('dialogs.prune.runPruneNow')}
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant={isFailed ? 'destructive' : 'default'}
          onClick={onCloseAll}
        >
          {isFailed ? t('dialogs.prune.close') : t('dialogs.prune.done')}
        </Button>
      )}
    </div>
  )

  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="md" fullWidth footer={footer}>
      {/* ── Title ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${isFailed ? 'bg-destructive/10 text-destructive' : isDryRun ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
          >
            {headerIcon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold leading-tight">{title}</p>
              <span
                className={`px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase tracking-[0.06em] border ${badgeColor}`}
              >
                {badge}
              </span>
            </div>
            {repository?.name && (
              <p
                className="text-[0.72rem] text-muted-foreground truncate mt-0.5"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              >
                {repository.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Output ── */}
      <div className="px-5 pb-4">
        {hasOutput ? (
          <div className="rounded-xl overflow-hidden border border-border bg-foreground/[0.02]">
            {/* Terminal header bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-foreground/[0.03]">
              <span className="text-muted-foreground flex">
                <Terminal size={13} />
              </span>
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t('dialogs.prune.outputLabel')}
              </span>
            </div>

            {stdout && <ColorizedOutput text={stdout} />}

            {stderr && (
              <div className={stdout ? 'border-t border-border' : ''}>
                {stdout && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${stderrSectionBorderClass}`}>
                    <span
                      className={`text-[0.6rem] font-bold uppercase tracking-[0.08em] ${isFailed ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {t('dialogs.prune.messagesLabel')}
                    </span>
                  </div>
                )}
                <ColorizedOutput text={stderr} isFailed={isFailed} />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground rounded-xl border border-border">
            <p className="text-sm">{t('dialogs.prune.noArchivesWouldBeDeleted')}</p>
          </div>
        )}

        {!isFailed && (
          <p className="text-xs text-muted-foreground mt-3 px-0.5 leading-relaxed">
            {isDryRun ? t('dialogs.prune.dryRunNote') : t('dialogs.prune.pruneNote')}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}

// ─── Config Dialog ────────────────────────────────────────────────────────────

export default function PruneRepositoryDialog({
  open,
  repository,
  onClose,
  onDryRun,
  onConfirmPrune,
  isLoading,
  results,
}: PruneRepositoryDialogProps) {
  const { t } = useTranslation()
  const [pruneForm, setPruneForm] = useState<PruneForm>(defaultPruneForm)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [activeOp, setActiveOp] = useState<'dry_run' | 'prune' | null>(null)

  React.useEffect(() => {
    if (open) setPruneForm(defaultPruneForm)
  }, [open])

  React.useEffect(() => {
    if (!isLoading) setActiveOp(null)
  }, [isLoading])

  React.useEffect(() => {
    if (results) {
      setResultsOpen(true)
    }
  }, [results])

  const handleResultsClose = () => {
    setResultsOpen(false)
  }

  const handleResultsCloseAll = () => {
    setResultsOpen(false)
    onClose()
  }

  const handleRunPruneFromResults = (form: PruneForm) => {
    setResultsOpen(false)
    onConfirmPrune(form)
  }

  const retentionFields = [
    { key: 'keep_hourly' as const, icon: <Clock size={14} />, label: t('dialogs.prune.keepHourly') },
    { key: 'keep_daily' as const, icon: <Sun size={14} />, label: t('dialogs.prune.keepDaily') },
    { key: 'keep_weekly' as const, icon: <CalendarDays size={14} />, label: t('dialogs.prune.keepWeekly') },
    { key: 'keep_monthly' as const, icon: <CalendarRange size={14} />, label: t('dialogs.prune.keepMonthly') },
    { key: 'keep_quarterly' as const, icon: <CalendarRange size={14} />, label: t('dialogs.prune.keepQuarterly') },
    { key: 'keep_yearly' as const, icon: <Calendar size={14} />, label: t('dialogs.prune.keepYearly') },
  ]

  const footer = (
    <div className="flex items-center justify-end gap-2 px-5 py-3">
      <Button
        variant="outline"
        size="sm"
        disabled={isLoading}
        className="gap-1.5 whitespace-nowrap"
        onClick={() => {
          setActiveOp('dry_run')
          onDryRun(pruneForm)
        }}
      >
        {activeOp === 'dry_run' ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <FlaskConical size={13} />
        )}
        {activeOp === 'dry_run' ? t('status.running') : t('dialogs.prune.dryRunButton')}
      </Button>
      <Button
        size="sm"
        disabled={isLoading}
        className="gap-1.5 whitespace-nowrap bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={() => {
          setActiveOp('prune')
          onConfirmPrune(pruneForm)
        }}
      >
        {activeOp === 'prune' ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Scissors size={13} />
        )}
        {activeOp === 'prune' ? t('status.running') : t('dialogs.pruneRepository.confirm')}
      </Button>
    </div>
  )

  return (
    <>
      <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm" fullWidth footer={footer}>
        {/* ── Title ── */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 bg-muted text-muted-foreground"
            >
              <Scissors size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight">
                {t('dialogs.pruneRepository.title')}
              </p>
              {repository?.name && (
                <p
                  className="text-[0.72rem] text-muted-foreground truncate"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {repository.name}
                </p>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-auto flex text-muted-foreground cursor-help flex-shrink-0 mt-0.5"
                >
                  <Info size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">{t('dialogs.prune.whatDoesPruningDo')}</p>
                <p className="mb-1">{t('dialogs.prune.explanation')}</p>
                <p className="font-semibold">{t('dialogs.prune.dryRunTip')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="px-5 pb-4">
          {/* ── Retention policy ── */}
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            {t('dialogs.prune.retentionPolicy')}
          </p>

          <div className="rounded-xl overflow-hidden mb-1.5 border border-border">
            {retentionFields.map((field, i) => (
              <div
                key={field.key}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 bg-foreground/[0.015] hover:bg-foreground/[0.03]${i < retentionFields.length - 1 ? ' border-b border-border' : ''}`}
              >
                <span className="text-muted-foreground flex flex-shrink-0">{field.icon}</span>
                <label
                  htmlFor={`prune-${field.key}`}
                  className="flex-1 text-sm cursor-pointer"
                >
                  {field.label}
                </label>
                <div
                  className="flex items-center rounded px-2 py-1 border border-border bg-background"
                  style={{ width: 72 }}
                >
                  <input
                    id={`prune-${field.key}`}
                    type="number"
                    value={pruneForm[field.key]}
                    min={0}
                    onChange={(e) =>
                      setPruneForm({ ...pruneForm, [field.key]: parseInt(e.target.value) || 0 })
                    }
                    className="w-full text-center text-sm font-semibold tabular-nums bg-transparent outline-none p-0"
                    style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-4 px-0.5">
            {t('dialogs.prune.exampleExplanation')}
          </p>

          {/* ── Warning strip ── */}
          <div className="flex gap-2 items-start p-3 rounded-xl border border-border bg-muted/40">
            <span className="flex flex-shrink-0 mt-0.5 text-muted-foreground">
              <TriangleAlert size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t('dialogs.prune.warningTitle')}
              </p>
              <p className="text-[0.78rem] text-muted-foreground">
                {t('dialogs.prune.warningCompact')}
              </p>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      {/* ── Results Dialog (separate overlay) ── */}
      {results && (
        <PruneResultsDialog
          open={resultsOpen}
          results={results}
          repository={repository}
          currentForm={pruneForm}
          isLoading={isLoading}
          onClose={handleResultsClose}
          onRunPrune={handleRunPruneFromResults}
          onCloseAll={handleResultsCloseAll}
        />
      )}
    </>
  )
}
