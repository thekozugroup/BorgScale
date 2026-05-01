import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Loader2, Plus, Edit, Trash2, Play, FileCode, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import CodeEditor from '../components/CodeEditor'
import ScriptParameterInputs, { ScriptParameter } from '../components/ScriptParameterInputs'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'
import DataTable, { ActionButton, Column } from '../components/DataTable'

interface Script {
  id: number
  name: string
  description: string | null
  file_path: string
  category: string
  timeout: number
  run_on: string
  usage_count: number
  is_template: boolean
  created_at: string
  updated_at: string
  parameters?: ScriptParameter[] | null
}

interface ScriptDetail extends Script {
  content: string
  repositories: Array<{
    id: number
    name: string
    hook_type: string
    enabled: boolean
  }>
  recent_executions: Array<{
    id: number
    repository_id: number | null
    status: string
    started_at: string | null
    exit_code: number | null
    execution_time: number | null
  }>
}

interface TestResult {
  success: boolean
  exit_code: number
  stdout: string
  stderr: string
  execution_time: number
}

export default function Scripts() {
  const { t } = useTranslation()
  const { hasGlobalPermission } = useAuth()
  const canManageScripts = hasGlobalPermission('settings.scripts.manage')
  const { trackScripts, EventAction } = useAnalytics()
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [editingScript, setEditingScript] = useState<ScriptDetail | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testingScript, setTestingScript] = useState(false)
  const [testingScriptData, setTestingScriptData] = useState<Script | null>(null)
  const [testParameterValues, setTestParameterValues] = useState<Record<string, string>>({})
  const [detectedParameters, setDetectedParameters] = useState<ScriptParameter[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content:
      '#!/bin/bash\n\necho "Script started"\n\n# Your script here\n\necho "Script completed"',
    timeout: 300,
    run_on: 'always',
    category: 'custom',
  })

  const fetchScripts = useCallback(async () => {
    try {
      const response = await api.get('/scripts')
      setScripts(Array.isArray(response.data) ? response.data : [])
    } catch {
      toast.error(t('scripts.errors.failedToLoad'))
      setScripts([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchScripts()
  }, [fetchScripts])

  const handleCreate = () => {
    setEditingScript(null)
    const defaultContent =
      '#!/bin/bash\n\necho "Script started"\n\n# Your script here\n\necho "Script completed"'
    setFormData({
      name: '',
      description: '',
      content: defaultContent,
      timeout: 300,
      run_on: 'always',
      category: 'custom',
    })
    setDetectedParameters(parseParameters(defaultContent))
    setDialogOpen(true)
    trackScripts(EventAction.VIEW, undefined, { source: 'create_dialog' })
  }

  const handleEdit = async (script: Script) => {
    try {
      const response = await api.get(`/scripts/${script.id}`)
      const detail: ScriptDetail = response.data
      setEditingScript(detail)
      setFormData({
        name: detail.name,
        description: detail.description || '',
        content: detail.content,
        timeout: detail.timeout,
        run_on: detail.run_on,
        category: detail.category,
      })
      setDetectedParameters(detail.parameters || [])
      setDialogOpen(true)
      trackScripts(EventAction.VIEW, detail.name, { source: 'edit_dialog' })
    } catch (error) {
      console.error('Failed to fetch script details:', error)
      toast.error(t('scripts.errors.failedToLoadDetails'))
    }
  }

  // Parse parameters from script content
  const parseParameters = (content: string): ScriptParameter[] => {
    const pattern = /\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g
    const matches = [...content.matchAll(pattern)]
    const paramsMap = new Map<string, ScriptParameter>()

    matches.forEach(([, name, defaultValue]) => {
      if (name.startsWith('BORG_UI_')) return
      if (!paramsMap.has(name)) {
        paramsMap.set(name, {
          name,
          type: 'text', // Default to text, user can mark as secret with checkbox
          default: defaultValue?.trim() || '',
          description: name.toLowerCase().replace(/_/g, ' '),
          required: false, // Never auto-require; users may fill params dynamically at runtime
        })
      }
    })

    return Array.from(paramsMap.values())
  }

  // Update detected parameters when content changes
  const handleContentChange = (content: string) => {
    setFormData({ ...formData, content })
    const params = parseParameters(content)

    // Merge with existing parameters to preserve user's secret selections
    const mergedParams = params.map((newParam) => {
      const existing = detectedParameters.find((p) => p.name === newParam.name)
      if (existing) {
        // Keep user's type selection if they changed it
        return { ...newParam, type: existing.type }
      }
      return newParam
    })

    setDetectedParameters(mergedParams)
  }

  const handleParameterTypeToggle = (paramName: string) => {
    setDetectedParameters((prev) =>
      prev.map((param) =>
        param.name === paramName
          ? { ...param, type: param.type === 'password' ? 'text' : 'password' }
          : param
      )
    )
  }

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        parameters: detectedParameters,
      }

      if (editingScript) {
        // Update existing script
        await api.put(`/scripts/${editingScript.id}`, dataToSave)
        toast.success(t('scripts.toasts.scriptUpdated'))
        trackScripts(EventAction.EDIT, editingScript.name, {
          category: dataToSave.category,
          run_on: dataToSave.run_on,
          parameter_count: detectedParameters.length,
        })
      } else {
        // Create new script
        await api.post('/scripts', dataToSave)
        toast.success(t('scripts.toasts.scriptCreated'))
        trackScripts(EventAction.CREATE, dataToSave.name, {
          category: dataToSave.category,
          run_on: dataToSave.run_on,
          parameter_count: detectedParameters.length,
        })
      }
      setDialogOpen(false)
      fetchScripts()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to save script:', error)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onError = (error: any) => {
        toast.error(
          translateBackendKey(error.response?.data?.detail) || t('scripts.toasts.saveFailed')
        )
      }
      onError(error)
    }
  }

  const handleDelete = async (script: Script) => {
    if (!confirm(t('scripts.confirmDelete', { name: script.name }))) {
      return
    }

    try {
      await api.delete(`/scripts/${script.id}`)
      toast.success(t('scripts.toasts.scriptDeleted'))
      trackScripts(EventAction.DELETE, script.name, { category: script.category })
      fetchScripts()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to delete script:', error)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onError = (error: any) => {
        toast.error(
          translateBackendKey(error.response?.data?.detail) || t('scripts.toasts.deleteFailed')
        )
      }
      onError(error)
    }
  }

  const handleTest = async (script: Script) => {
    setTestingScriptData(script)
    setTestParameterValues({})
    setTestResult(null)
    setTestDialogOpen(true)
    trackScripts(EventAction.VIEW, script.name, { source: 'test_dialog' })
  }

  const executeTest = async () => {
    if (!testingScriptData) return

    try {
      setTestingScript(true)
      setTestResult(null)

      const response = await api.post(`/scripts/${testingScriptData.id}/test`, {
        parameter_values: testParameterValues,
        timeout: undefined,
      })
      setTestResult(response.data)
      trackScripts(EventAction.TEST, testingScriptData.name, {
        parameter_count: Object.keys(testParameterValues).length,
        success: !!response.data?.success,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to test script:', error)
      setTestResult({
        success: false,
        exit_code: -1,
        stdout: '',
        stderr: translateBackendKey(error.response?.data?.detail) || error.message,
        execution_time: 0,
      })
      trackScripts(EventAction.TEST, testingScriptData.name, {
        parameter_count: Object.keys(testParameterValues).length,
        success: false,
      })
    } finally {
      setTestingScript(false)
    }
  }

  const RUN_ON_BADGE: Record<string, string> = {
    success: 'bg-primary/10 text-primary border-primary/20',
    failure: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-muted text-muted-foreground border-border',
    always: 'bg-secondary text-secondary-foreground border-border',
  }

  if (!canManageScripts) {
    return null
  }

  const columns: Column<Script>[] = [
    {
      id: 'name',
      label: t('scripts.table.name'),
      render: (script) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={18} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{script.name}</p>
            {script.description && (
              <p className="text-xs text-muted-foreground md:hidden">{script.description}</p>
            )}
          </div>
          {script.parameters && script.parameters.length > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold border border-border bg-muted text-muted-foreground flex-shrink-0">
              {script.parameters.length} param{script.parameters.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'description',
      label: t('scripts.table.description'),
      render: (script) => (
        <p className="text-sm text-muted-foreground max-w-xs">{script.description || '-'}</p>
      ),
    },
    {
      id: 'category',
      label: t('scripts.table.category'),
      render: (script) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border border-border text-muted-foreground">
          {script.category}
        </span>
      ),
    },
    {
      id: 'run_on',
      label: t('scripts.table.runOn'),
      render: (script) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${RUN_ON_BADGE[script.run_on] ?? 'border-border text-muted-foreground'}`}>
          {script.run_on}
        </span>
      ),
    },
    {
      id: 'timeout',
      label: t('scripts.table.timeout'),
      render: (script) => (
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span className="text-sm">{script.timeout}s</span>
        </div>
      ),
    },
    {
      id: 'usage_count',
      label: t('scripts.table.usage'),
      render: (script) => (
        <span className="text-sm">{t('scripts.usedInCount', { count: script.usage_count })}</span>
      ),
    },
  ]

  const actions: ActionButton<Script>[] = [
    {
      label: t('scripts.actions.test'),
      icon: <Play size={18} />,
      onClick: handleTest,
      tooltip: t('scripts.actions.test'),
    },
    {
      label: t('scripts.actions.edit'),
      icon: <Edit size={18} />,
      onClick: handleEdit,
      disabled: (script) => script.is_template,
      tooltip: t('scripts.actions.edit'),
    },
    {
      label: t('scripts.actions.delete'),
      icon: <Trash2 size={18} />,
      onClick: handleDelete,
      disabled: (script) => script.is_template,
      color: 'error',
      tooltip: (script) =>
        script.is_template
          ? t('scripts.actions.cannotDeleteTemplates')
          : script.usage_count > 0
            ? t('scripts.usedInCount', { count: script.usage_count })
            : t('scripts.actions.delete'),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <p className="text-2xl font-bold">{t('scripts.title')}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{t('scripts.subtitle')}</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto gap-1.5">
          <Plus size={20} />
          {t('scripts.newScript')}
        </Button>
      </div>

      <DataTable
        data={scripts}
        columns={columns}
        actions={actions}
        getRowKey={(script) => script.id}
        variant="outlined"
        loading={loading}
        emptyState={{
          icon: <FileCode size={48} />,
          title: t('scripts.empty'),
        }}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingScript ? t('scripts.editDialog.title') : t('scripts.createDialog.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <div>
              <Label htmlFor="script-form-name" className="text-xs font-semibold mb-1.5 block">{t('scripts.fields.name')} *</Label>
              <Input
                id="script-form-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('scripts.fields.nameHelperText')}</p>
            </div>

            <div>
              <Label htmlFor="script-form-description" className="text-xs font-semibold mb-1.5 block">{t('scripts.fields.description')}</Label>
              <textarea
                id="script-form-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('scripts.fields.descriptionHelperText')}</p>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('scripts.fields.runOn')}</Label>
              <select
                value={formData.run_on}
                onChange={(e) => setFormData({ ...formData, run_on: e.target.value })}
                className="w-full rounded-md border border-input bg-background h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="success">{t('scripts.runOn.success')}</option>
                <option value="failure">{t('scripts.runOn.failure')}</option>
                <option value="warning">{t('scripts.runOn.warning')}</option>
                <option value="always">{t('scripts.runOn.always')}</option>
              </select>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
              {t('scripts.runOn.note')}
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('scripts.fields.timeout')}</Label>
              <Input
                type="number"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                min={30}
                max={3600}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('scripts.fields.timeoutHint')}</p>
            </div>

            <CodeEditor
              label={t('scripts.fields.content')}
              value={formData.content}
              onChange={handleContentChange}
              height="300px"
              language="shell"
              helperText={t('scripts.fields.contentHint')}
            />

            {/* Parameter Configuration */}
            {detectedParameters.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{t('scripts.fields.parameters')}</p>
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-3 border border-border bg-muted/40 text-muted-foreground">
                  {t('scripts.fields.parametersHint')}
                </div>
                <div className="rounded-xl border border-border p-3 flex flex-col gap-3">
                  {detectedParameters.map((param) => (
                    <div
                      key={param.name}
                      className={`flex items-center justify-between p-3 rounded-lg border ${param.type === 'password' ? 'border-border bg-muted/30' : 'border-border'}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold font-mono">{param.name}</p>
                        <div className="flex gap-2 mt-0.5">
                          {param.default && (
                            <span className="text-xs text-muted-foreground">Default: {param.default}</span>
                          )}
                          {param.required && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold border border-destructive/20 bg-destructive/10 text-destructive">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t('scripts.fields.treatAsSecret')}</span>
                        <input
                          type="checkbox"
                          checked={param.type === 'password'}
                          onChange={() => handleParameterTypeToggle(param.name)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingScript && editingScript.usage_count > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
                {t('scripts.usedInPlaces', { count: editingScript.usage_count })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('scripts.buttons.cancel')}</Button>
              <Button onClick={handleSave} disabled={!formData.name.trim()}>
                {editingScript ? t('scripts.buttons.update') : t('scripts.buttons.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={(open) => !open && setTestDialogOpen(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Play size={20} />
                {t('scripts.testDialog.title')}: {testingScriptData?.name}
              </div>
            </DialogTitle>
          </DialogHeader>
          {!testResult ? (
            <div className="flex flex-col gap-4 pt-1">
              {testingScriptData?.parameters && testingScriptData.parameters.length > 0 ? (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
                    {t('scripts.testDialog.hasParams')}
                  </div>
                  <ScriptParameterInputs
                    parameters={testingScriptData.parameters}
                    values={testParameterValues}
                    onChange={setTestParameterValues}
                  />
                </>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-border bg-muted/40 text-muted-foreground">
                  {t('scripts.testDialog.noParams')}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                  {t('scripts.buttons.cancel')}
                </Button>
                <Button onClick={executeTest} disabled={testingScript} className="gap-1.5">
                  {testingScript ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {testingScript ? t('scripts.testDialog.running') : t('scripts.testDialog.runTest')}
                </Button>
              </div>
            </div>
          ) : testingScript ? (
            <div className="flex justify-center items-center gap-3 py-8">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
              <span>{t('scripts.testDialog.runningScript')}</span>
            </div>
          ) : testResult ? (
            <div className="flex flex-col gap-3">
              {/* Status */}
              <div className={`flex items-start gap-2 p-3 rounded-xl text-sm border ${testResult.success ? 'border-primary/20 bg-primary/10 text-primary' : 'border-destructive/25 bg-destructive/10 text-destructive'}`}>
                {testResult.success ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> : <XCircle size={18} className="flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">
                    {testResult.success ? t('scripts.testDialog.success') : t('scripts.testDialog.failed')}
                  </p>
                  <p className="text-xs mt-0.5">
                    {t('scripts.testDialog.exitCode', { code: testResult.exit_code, time: testResult.execution_time.toFixed(2) })}
                  </p>
                </div>
              </div>

              {/* Stdout */}
              {testResult.stdout && (
                <div>
                  <p className="text-sm font-semibold mb-1">{t('scripts.testDialog.stdout')}</p>
                  <div className="p-3 rounded-xl overflow-auto max-h-48 bg-neutral-900">
                    <pre className="text-sm font-mono whitespace-pre-wrap m-0 text-neutral-200">{testResult.stdout}</pre>
                  </div>
                </div>
              )}

              {/* Stderr */}
              {testResult.stderr && (
                <div>
                  <p className="text-sm font-semibold mb-1 text-destructive">{t('scripts.testDialog.stderr')}</p>
                  <div className="p-3 rounded-xl overflow-auto max-h-48 bg-neutral-900">
                    <pre className="text-sm font-mono whitespace-pre-wrap m-0 text-destructive">{testResult.stderr}</pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTestResult(null)}>
                  {t('scripts.testDialog.testAgain')}
                </Button>
                <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                  {t('scripts.testDialog.close')}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
