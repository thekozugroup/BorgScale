import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Trash2,
  FileCode,
  Clock,
  AlertTriangle,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import ScriptParameterInputs, { ScriptParameter } from './ScriptParameterInputs'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type OnFailureMode = 'fail' | 'continue' | 'skip'

interface Script {
  id: number
  name: string
  description: string | null
  timeout: number
  run_on: string
  category: string
  parameters?: ScriptParameter[] | null
}

interface RepositoryScript {
  id: number
  script_id: number
  script_name: string
  script_description: string | null
  execution_order: number
  enabled: boolean
  custom_timeout: number | null
  custom_run_on: string | null
  continue_on_error: boolean | null
  skip_on_failure: boolean | null
  default_timeout: number
  default_run_on: string
  parameters?: ScriptParameter[] | null
  parameter_values?: Record<string, string> | null
}

interface RepositoryScriptsTabProps {
  repositoryId: number
  hookType: 'pre-backup' | 'post-backup'
  onUpdate?: () => void
  onScriptsChange?: (hasScripts: boolean) => void
  hasInlineScript?: boolean
  onClearInlineScript?: () => void
}

const RUN_ON_BADGE: Record<string, string> = {
  success: 'bg-primary/10 text-primary border-primary/20',
  failure: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-muted text-muted-foreground border-border',
  always: 'bg-secondary text-secondary-foreground border-border',
}

export default function RepositoryScriptsTab({
  repositoryId,
  hookType,
  onUpdate,
  onScriptsChange,
  hasInlineScript,
  onClearInlineScript,
}: RepositoryScriptsTabProps) {
  const { t } = useTranslation()
  const { trackScripts, EventAction } = useAnalytics()
  const [scripts, setScripts] = useState<RepositoryScript[]>([])
  const [availableScripts, setAvailableScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedScriptId, setSelectedScriptId] = useState<number | ''>('')
  const [editParametersDialog, setEditParametersDialog] = useState<{
    open: boolean
    script: RepositoryScript | null
  }>({ open: false, script: null })

  const [testDialog, setTestDialog] = useState<{
    open: boolean
    script: RepositoryScript | null
    running: boolean
    result: {
      success: boolean
      stdout: string
      stderr: string
      exit_code: number
      execution_time: number
    } | null
  }>({ open: false, script: null, running: false, result: null })

  const fetchAssignedScripts = React.useCallback(async () => {
    try {
      const response = await api.get(`/repositories/${repositoryId}/scripts`)
      const scriptsData =
        hookType === 'pre-backup' ? response.data.pre_backup : response.data.post_backup
      console.log(
        'Fetched scripts:',
        scriptsData?.map((s: RepositoryScript) => ({
          id: s.id,
          name: s.script_name,
          order: s.execution_order,
        }))
      )
      setScripts(scriptsData || [])
      onScriptsChange?.(scriptsData && scriptsData.length > 0)
    } catch (error) {
      console.error('Failed to fetch assigned scripts:', error)
      toast.error(t('repositoryScriptsTab.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [repositoryId, hookType, onScriptsChange, t])

  const fetchAvailableScripts = React.useCallback(async () => {
    try {
      const response = await api.get('/scripts')
      setAvailableScripts(response.data)
    } catch (error) {
      console.error('Failed to fetch available scripts:', error)
    }
  }, [])

  useEffect(() => {
    fetchAssignedScripts()
    fetchAvailableScripts()
  }, [fetchAssignedScripts, fetchAvailableScripts])

  const handleAddScript = async (assignmentData: AssignmentData) => {
    if (!selectedScriptId) return

    try {
      const nextOrder = Math.max(0, ...scripts.map((s) => s.execution_order)) + 1

      if (scripts.length === 0 && hasInlineScript && onClearInlineScript) {
        onClearInlineScript()
      }

      await api.post(`/repositories/${repositoryId}/scripts`, {
        script_id: selectedScriptId,
        hook_type: hookType,
        execution_order: nextOrder,
        enabled: true,
        continue_on_error: assignmentData.on_failure_mode === 'continue',
        skip_on_failure: assignmentData.on_failure_mode === 'skip',
        parameter_values: assignmentData.parameter_values,
      })

      toast.success(t('repositoryScriptsTab.assignedSuccessfully'))
      fetchAssignedScripts()
      setAddDialogOpen(false)
      setSelectedScriptId('')
      if (onUpdate) onUpdate()
      const addedScript = availableScripts.find((s) => s.id === selectedScriptId)
      trackScripts(EventAction.CREATE, addedScript?.name, {
        source: 'repository_assignment',
        hook_type: hookType,
        parameter_count: Object.keys(assignmentData.parameter_values || {}).length,
        on_failure_mode: assignmentData.on_failure_mode,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to assign script:', error)
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('repositoryScripts.errors.failedToAssign')
      )
    }
  }

  const handleRemoveScript = async (scriptAssignmentId: number) => {
    if (!confirm(t('repositoryScripts.confirmRemove'))) return
    const removedScript = scripts.find((s) => s.id === scriptAssignmentId)

    try {
      await api.delete(`/repositories/${repositoryId}/scripts/${scriptAssignmentId}`)
      toast.success(t('repositoryScriptsTab.removedSuccessfully'))
      fetchAssignedScripts()
      if (onUpdate) onUpdate()
      trackScripts(EventAction.DELETE, removedScript?.script_name, {
        source: 'repository_assignment',
        hook_type: hookType,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to remove script:', error)
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('repositoryScripts.errors.failedToRemove')
      )
    }
  }

  const handleUpdateParameters = async (
    scriptAssignmentId: number,
    parameterValues: Record<string, string>,
    onFailureMode: OnFailureMode
  ) => {
    try {
      await api.put(`/repositories/${repositoryId}/scripts/${scriptAssignmentId}`, {
        parameter_values: parameterValues,
        continue_on_error: onFailureMode === 'continue',
        skip_on_failure: onFailureMode === 'skip',
      })
      toast.success(t('repositoryScriptsTab.parametersUpdatedSuccessfully'))
      fetchAssignedScripts()
      setEditParametersDialog({ open: false, script: null })
      if (onUpdate) onUpdate()
      trackScripts(EventAction.EDIT, editParametersDialog.script?.script_name, {
        source: 'repository_assignment',
        hook_type: hookType,
        parameter_count: Object.keys(parameterValues || {}).length,
        on_failure_mode: onFailureMode,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to update parameters:', error)
      toast.error(
        translateBackendKey(error.response?.data?.detail) ||
          t('repositoryScripts.errors.failedToUpdateParameters')
      )
    }
  }

  const handleTestScript = async (script: RepositoryScript) => {
    setTestDialog({ open: true, script, running: true, result: null })
    try {
      const response = await api.post(`/scripts/${script.script_id}/test`, {
        repository_id: repositoryId,
        parameter_values: script.parameter_values ?? undefined,
      })
      setTestDialog((prev) => ({ ...prev, running: false, result: response.data }))
      trackScripts(EventAction.TEST, script.script_name, {
        source: 'repository_assignment',
        hook_type: hookType,
        success: !!response.data?.success,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setTestDialog((prev) => ({
        ...prev,
        running: false,
        result: {
          success: false,
          stdout: '',
          stderr: translateBackendKey(error.response?.data?.detail) || error.message,
          exit_code: -1,
          execution_time: 0,
        },
      }))
      trackScripts(EventAction.TEST, script.script_name, {
        source: 'repository_assignment',
        hook_type: hookType,
        success: false,
      })
    }
  }

  const areParametersOutOfSync = (script: RepositoryScript): boolean => {
    if (!script.parameters || script.parameters.length === 0) return false
    const paramValues = script.parameter_values || {}
    const scriptParams = script.parameters
    const missingRequired = scriptParams.some((p) => p.required && !paramValues[p.name])
    if (missingRequired) return true
    const currentParamNames = new Set(scriptParams.map((p) => p.name))
    return Object.keys(paramValues).some((key) => !currentParamNames.has(key))
  }

  React.useLayoutEffect(() => {
    const key = `openScriptDialog_${repositoryId}_${hookType}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any)[key] = () => setAddDialogOpen(true)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[key]
    }
  }, [repositoryId, hookType])

  const renderScriptList = () => {
    if (scripts.length === 0) return null

    return (
      <div className="flex flex-col gap-1">
        {scripts.map((script) => {
          const effectiveTimeout = script.custom_timeout || script.default_timeout
          const effectiveRunOn = script.custom_run_on || script.default_run_on
          const effectiveSkipOnFailure = script.skip_on_failure === true
          const effectiveContinueOnError =
            !effectiveSkipOnFailure &&
            (script.continue_on_error !== null ? script.continue_on_error : true)
          const isPreBackup = hookType === 'pre-backup'

          return (
            <div
              key={script.id}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors duration-150 flex-wrap"
            >
              <FileCode size={14} className="flex-shrink-0 opacity-60" />
              <p className="text-sm font-medium flex-1 min-w-0 truncate">{script.script_name}</p>

              {/* Badges */}
              <span className="inline-flex items-center px-1.5 py-0 rounded text-[0.65rem] font-semibold bg-muted text-muted-foreground border border-border" style={{ height: 18 }}>
                #{script.execution_order}
              </span>
              {script.parameters && script.parameters.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center px-1.5 rounded text-[0.65rem] font-semibold bg-muted text-muted-foreground border border-border cursor-default" style={{ height: 18 }}>
                      {script.parameters.length} param{script.parameters.length > 1 ? 's' : ''}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('repositoryScripts.parametersConfigured', { count: script.parameters.length })}
                  </TooltipContent>
                </Tooltip>
              )}
              {areParametersOutOfSync(script) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 px-1.5 rounded text-[0.65rem] font-semibold bg-muted text-muted-foreground border border-border cursor-default" style={{ height: 18 }}>
                      <AlertTriangle size={10} />
                      {t('repositoryScripts.chips.outOfSync')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t('repositoryScripts.tooltips.parametersOutOfSync')}</TooltipContent>
                </Tooltip>
              )}
              {!isPreBackup && (
                <span className={cn('inline-flex items-center px-1.5 rounded text-[0.65rem] font-semibold border cursor-default', RUN_ON_BADGE[effectiveRunOn] ?? 'bg-muted text-muted-foreground border-border')} style={{ height: 18 }}>
                  {effectiveRunOn}
                </span>
              )}
              {isPreBackup && effectiveSkipOnFailure && (
                <span className="inline-flex items-center px-1.5 rounded text-[0.65rem] font-semibold bg-muted text-muted-foreground border border-border" style={{ height: 18 }}>
                  {t('repositoryScripts.chips.skipsGracefully')}
                </span>
              )}
              {isPreBackup && effectiveContinueOnError && (
                <span className="inline-flex items-center px-1.5 rounded text-[0.65rem] font-semibold bg-muted text-muted-foreground border border-border" style={{ height: 18 }}>
                  {t('repositoryScripts.chips.continuesOnError')}
                </span>
              )}

              <div className="flex items-center gap-0.5 text-muted-foreground">
                <Clock size={11} className="opacity-60" />
                <span className="text-xs">{effectiveTimeout}s</span>
              </div>

              {/* Actions */}
              <div className="flex gap-0.5 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleTestScript(script)}
                      className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Play size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('repositoryScripts.tooltips.testScript', 'Test run this script')}</TooltipContent>
                </Tooltip>
                {script.parameters && script.parameters.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setEditParametersDialog({ open: true, script })}
                        className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Settings size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('repositoryScripts.tooltips.configureParameters')}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleRemoveScript(script.id)}
                      className="flex items-center justify-center w-6 h-6 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('repositoryScripts.tooltips.remove')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('repositoryScriptsTab.loading')}</p>
  }

  return (
    <div>
      {renderScriptList()}

      <RepositoryScriptDialog
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); setSelectedScriptId('') }}
        availableScripts={availableScripts}
        selectedScriptId={selectedScriptId}
        onScriptSelect={setSelectedScriptId}
        onSubmit={handleAddScript}
        hookType={hookType}
        scriptsCount={scripts.length}
        hasInlineScript={hasInlineScript}
      />

      {editParametersDialog.script && (
        <EditParametersDialog
          open={editParametersDialog.open}
          onClose={() => setEditParametersDialog({ open: false, script: null })}
          script={editParametersDialog.script}
          isPreBackup={hookType === 'pre-backup'}
          onSubmit={(paramValues, mode) =>
            handleUpdateParameters(editParametersDialog.script!.id, paramValues, mode)
          }
        />
      )}

      <ScriptTestDialog
        open={testDialog.open}
        onClose={() => setTestDialog({ open: false, script: null, running: false, result: null })}
        scriptName={testDialog.script?.script_name ?? ''}
        running={testDialog.running}
        result={testDialog.result}
      />
    </div>
  )
}

interface AssignmentData {
  script_id: number | ''
  on_failure_mode: OnFailureMode
  parameter_values?: Record<string, string>
}

interface RepositoryScriptDialogProps {
  open: boolean
  onClose: () => void
  availableScripts: Script[]
  selectedScriptId: number | ''
  onScriptSelect: (id: number) => void
  onSubmit: (assignData: AssignmentData) => void
  hookType: 'pre-backup' | 'post-backup'
  scriptsCount: number
  hasInlineScript?: boolean
}

const FAILURE_MODE_OPTIONS: { value: OnFailureMode; labelKey: string }[] = [
  { value: 'fail', labelKey: 'scriptEditor.onFailureFail' },
  { value: 'continue', labelKey: 'scriptEditor.onFailureContinue' },
  { value: 'skip', labelKey: 'scriptEditor.onFailureSkip' },
]

function RepositoryScriptDialog({
  open,
  onClose,
  availableScripts,
  selectedScriptId,
  onScriptSelect,
  onSubmit,
  hookType,
  scriptsCount,
  hasInlineScript,
}: RepositoryScriptDialogProps) {
  const { t } = useTranslation()
  const [onFailureMode, setOnFailureMode] = useState<OnFailureMode>('fail')
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({})
  const isPreBackup = hookType === 'pre-backup'

  const selectedScript = availableScripts.find((s) => s.id === selectedScriptId)
  const hasParameters =
    selectedScript?.parameters &&
    Array.isArray(selectedScript.parameters) &&
    selectedScript.parameters.length > 0

  useEffect(() => {
    if (open) {
      setOnFailureMode('fail')
      setParameterValues({})
    }
  }, [open])

  useEffect(() => {
    if (selectedScript) {
      console.log('Selected script:', selectedScript.name, 'Parameters:', selectedScript.parameters)
    }
  }, [selectedScript])

  const handleSubmit = () => {
    onSubmit({
      script_id: selectedScriptId,
      on_failure_mode: onFailureMode,
      parameter_values: parameterValues,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('repositoryScripts.dialog.assignTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          {isPreBackup && hasInlineScript && scriptsCount === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              Adding a library script will replace your current inline script for this hook.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-1.5">{t('repositoryScripts.dialog.selectScriptLabel')}</p>
            <select
              value={selectedScriptId}
              onChange={(e) => onScriptSelect(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— {t('repositoryScripts.dialog.selectScriptLabel')} —</option>
              {availableScripts.map((script) => (
                <option key={script.id} value={script.id}>
                  {script.name}{script.description ? ` — ${script.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {hasParameters && (
            <ScriptParameterInputs
              parameters={selectedScript.parameters!}
              values={parameterValues}
              onChange={setParameterValues}
            />
          )}

          {isPreBackup && (
            <div>
              <p className="text-xs font-semibold mb-2">{t('repositoryScripts.dialog.onFailureLabel')}</p>
              <div className="flex flex-col gap-1.5">
                {FAILURE_MODE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="onFailureMode_assign"
                      value={opt.value}
                      checked={onFailureMode === opt.value}
                      onChange={() => setOnFailureMode(opt.value)}
                    />
                    {t(opt.labelKey)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('repositoryScripts.dialog.cancel')}
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!selectedScriptId}>
              {t('repositoryScripts.dialog.assignScript')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface EditParametersDialogProps {
  open: boolean
  onClose: () => void
  script: RepositoryScript
  isPreBackup: boolean
  onSubmit: (paramValues: Record<string, string>, onFailureMode: OnFailureMode) => void
}

function EditParametersDialog({
  open,
  onClose,
  script,
  isPreBackup,
  onSubmit,
}: EditParametersDialogProps) {
  const { t } = useTranslation()
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({})
  const [onFailureMode, setOnFailureMode] = useState<OnFailureMode>('fail')

  useEffect(() => {
    if (open) {
      setParameterValues(script.parameter_values ? { ...script.parameter_values } : {})
      setOnFailureMode(
        script.skip_on_failure ? 'skip' : script.continue_on_error ? 'continue' : 'fail'
      )
    }
  }, [open, script])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('repositoryScripts.parametersDialog.title', { scriptName: script.script_name })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          {script.parameters && script.parameters.length > 0 ? (
            <ScriptParameterInputs
              parameters={script.parameters}
              values={parameterValues}
              onChange={setParameterValues}
            />
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
              {t('repositoryScripts.parametersDialog.noParameters')}
            </div>
          )}

          {isPreBackup && (
            <div>
              <p className="text-xs font-semibold mb-2">{t('repositoryScripts.dialog.onFailureLabel')}</p>
              <div className="flex flex-col gap-1.5">
                {FAILURE_MODE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="onFailureMode_edit"
                      value={opt.value}
                      checked={onFailureMode === opt.value}
                      onChange={() => setOnFailureMode(opt.value)}
                    />
                    {t(opt.labelKey)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('repositoryScripts.parametersDialog.cancel')}
            </Button>
            <Button size="sm" onClick={() => onSubmit(parameterValues, onFailureMode)}>
              {t('repositoryScripts.parametersDialog.saveParameters')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ScriptTestDialogProps {
  open: boolean
  onClose: () => void
  scriptName: string
  running: boolean
  result: {
    success: boolean
    stdout: string
    stderr: string
    exit_code: number
    execution_time: number
  } | null
}

function ScriptTestDialog({ open, onClose, scriptName, running, result }: ScriptTestDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span>Test: {scriptName}</span>
              {running && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
              {result && (
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle size={18} className="text-primary" />
                  ) : (
                    <XCircle size={18} className="text-destructive" />
                  )}
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', result.exit_code === 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20')}>
                    Exit: {result.exit_code}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border border-border text-muted-foreground">
                    {result.execution_time.toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2 border-t border-border flex flex-col gap-3">
          {running && (
            <div className="flex justify-center py-6">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {result && (
            <>
              {result.stdout && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('scriptEditor.stdout')}</p>
                  <div className="p-3 rounded-xl overflow-auto max-h-72 bg-neutral-900">
                    <pre className="text-sm whitespace-pre-wrap break-words m-0 text-neutral-200 font-mono">
                      {result.stdout}
                    </pre>
                  </div>
                </div>
              )}
              {result.stderr && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('scriptEditor.stderr')}</p>
                  <div className="p-3 rounded-xl overflow-auto max-h-48 bg-neutral-900">
                    <pre className="text-sm whitespace-pre-wrap break-words m-0 text-destructive font-mono">
                      {result.stderr}
                    </pre>
                  </div>
                </div>
              )}
              {!result.stdout && !result.stderr && (
                <div className={`p-3 rounded-xl text-sm border ${result.success ? 'border-primary/20 bg-primary/10 text-primary' : 'border-destructive/25 bg-destructive/10 text-destructive'}`}>
                  {result.success ? t('scriptEditor.testPassed') : t('scriptEditor.testFailed')}
                </div>
              )}
            </>
          )}
          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.buttons.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
