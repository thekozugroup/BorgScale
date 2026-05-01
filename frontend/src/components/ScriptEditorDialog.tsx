import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import CodeEditor from './CodeEditor'
import api from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type OnFailureMode = 'fail' | 'continue' | 'skip'

interface ScriptEditorDialogProps {
  open: boolean
  onClose: () => void
  title: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  timeout?: number
  onTimeoutChange?: (timeout: number) => void
  onFailureMode?: OnFailureMode
  onFailureModeChange?: (value: OnFailureMode) => void
  showContinueOnFailure?: boolean
  repositoryId?: number | null
}

export default function ScriptEditorDialog({
  open,
  onClose,
  title,
  value,
  onChange,
  placeholder,
  timeout = 300,
  onTimeoutChange,
  onFailureMode = 'fail',
  onFailureModeChange,
  showContinueOnFailure = false,
  repositoryId,
}: ScriptEditorDialogProps) {
  const { t } = useTranslation()
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    stdout: string
    stderr: string
    exit_code: number
    execution_time: number
  } | null>(null)

  const handleTestRun = async () => {
    if (!value || value.trim() === '') return

    setTestRunning(true)
    setTestResult(null)

    try {
      const response = await api.post('/scripts/test', {
        script: value,
        ...(repositoryId != null ? { repository_id: repositoryId } : {}),
      })
      setTestResult(response.data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setTestResult({
        success: false,
        stdout: '',
        stderr: translateBackendKey(error.response?.data?.detail) || error.message,
        exit_code: -1,
        execution_time: 0,
      })
    } finally {
      setTestRunning(false)
    }
  }

  const failureModeOptions: { value: OnFailureMode; label: string }[] = [
    { value: 'fail', label: t('scriptEditor.onFailureFail') },
    { value: 'continue', label: t('scriptEditor.onFailureContinue') },
    { value: 'skip', label: t('scriptEditor.onFailureSkip') },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestRun}
              disabled={testRunning || !value || value.trim() === ''}
              className="gap-1.5"
            >
              {testRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {testRunning ? t('scriptEditor.testing') : t('scriptEditor.testRun')}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <CodeEditor
            label=""
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            height="400px"
          />

          <div className="flex gap-4 items-start flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs font-semibold mb-1.5 block">{t('scriptEditor.timeoutLabel')}</Label>
              <Input
                type="number"
                value={timeout}
                onChange={(e) => onTimeoutChange?.(parseInt(e.target.value) || 300)}
                min={30}
                max={3600}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('scriptEditor.timeoutHint')}</p>
            </div>

            {showContinueOnFailure && (
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-semibold mb-2">{t('scriptEditor.onFailureLabel')}</p>
                <div className="flex gap-3 flex-wrap">
                  {failureModeOptions.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="onFailureMode"
                        value={opt.value}
                        checked={onFailureMode === opt.value}
                        onChange={() => onFailureModeChange?.(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {testResult && (
            <div className="mt-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {testResult.success ? (
                  <>
                    <CheckCircle size={18} className="text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {t('scriptEditor.testPassed')}
                    </span>
                  </>
                ) : testResult.exit_code === 0 ? (
                  <>
                    <AlertTriangle size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('scriptEditor.testWarnings')}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      {t('scriptEditor.testFailed')}
                    </span>
                  </>
                )}
                <span
                  className={cn(
                    'ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
                    testResult.exit_code === 0
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  )}
                >
                  {t('scriptEditor.exitCode', { code: testResult.exit_code })}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border border-border text-muted-foreground">
                  {`${testResult.execution_time.toFixed(2)}s`}
                </span>
              </div>

              {testResult.stdout && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('scriptEditor.stdout')}</p>
                  <div className="p-3 rounded-xl overflow-auto max-h-48 bg-foreground">
                    <pre className="text-sm whitespace-pre-wrap break-words m-0 text-background font-mono">
                      {testResult.stdout}
                    </pre>
                  </div>
                </div>
              )}

              {testResult.stderr && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('scriptEditor.stderr')}</p>
                  <div className="p-3 rounded-xl overflow-auto max-h-48 bg-foreground">
                    <pre className="text-sm whitespace-pre-wrap break-words m-0 text-destructive font-mono">
                      {testResult.stderr}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.buttons.cancel')}
            </Button>
            <Button size="sm" onClick={onClose}>
              {t('scriptEditor.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
