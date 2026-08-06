import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { sshKeysAPI } from '@/services/api'
import { translateBackendKey } from '@/utils/translateBackendKey'

type Step = 'form' | 'paste' | 'verifying' | 'success' | 'error'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function QuickConnectModal({ open, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('form')
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('root')
  const [port, setPort] = useState(22)
  const [publicKey, setPublicKey] = useState('')
  const [suggestedCommand, setSuggestedCommand] = useState('')
  const [sshKeyId, setSshKeyId] = useState<number | null>(null)
  const [hintKey, setHintKey] = useState<string | null>(null)
  const [stderrRaw, setStderrRaw] = useState('')
  const [borgVersion, setBorgVersion] = useState<string | null>(null)

  function reset() {
    setStep('form')
    setHost('')
    setUsername('root')
    setPort(22)
    setPublicKey('')
    setSuggestedCommand('')
    setSshKeyId(null)
    setHintKey(null)
    setStderrRaw('')
    setBorgVersion(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  const initMutation = useMutation({
    mutationFn: () => sshKeysAPI.manualPairInit({}),
    onSuccess: (resp) => {
      const data = resp.data
      setPublicKey(data.public_key)
      setSuggestedCommand(data.suggested_command)
      setSshKeyId(data.ssh_key_id)
      qc.invalidateQueries({ queryKey: ['system-ssh-key'] })
      setStep('paste')
    },
    onError: () => {
      toast.error(t('ssh.manualPair.initFailed'))
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      sshKeysAPI.manualPairVerify({
        ssh_key_id: sshKeyId!,
        host,
        username,
        port,
        save_connection: true,
      }),
    onSuccess: (resp) => {
      const data = resp.data
      if (data.success) {
        setBorgVersion(data.borg_version)
        setStep('success')
        qc.invalidateQueries({ queryKey: ['ssh-connections'] })
        qc.invalidateQueries({ queryKey: ['system-ssh-key'] })
        toast.success(t('ssh.manualPair.successToast'))
        onSuccess?.()
        setTimeout(() => handleOpenChange(false), 2500)
      } else {
        setHintKey(data.hint_key)
        setStderrRaw(data.stderr_raw || '')
        setStep('error')
      }
    },
    onError: () => {
      setHintKey('backend.ssh.hint.unknownFailure')
      setStderrRaw('')
      setStep('error')
    },
  })

  function copyToClipboard(text: string, successKey: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t(successKey)))
      .catch(() => toast.error(t('common.errors.clipboardFailed')))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t('ssh.manualPair.title')}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('ssh.manualPair.intro')}</p>
            <div>
              <Label htmlFor="qc-host">{t('ssh.manualPair.hostLabel')}</Label>
              <Input
                id="qc-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="backup.example.com"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qc-user">{t('ssh.manualPair.userLabel')}</Label>
                <Input
                  id="qc-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="qc-port">{t('ssh.manualPair.portLabel')}</Label>
                <Input
                  id="qc-port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || 22)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button
                onClick={() => initMutation.mutate()}
                disabled={!host || initMutation.isPending}
                data-testid="qc-continue"
              >
                {initMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('ssh.manualPair.preparing')}
                  </>
                ) : (
                  t('ssh.manualPair.continue')
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'paste' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('ssh.manualPair.pasteIntro', { user: username, host, port })}
            </p>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('ssh.manualPair.publicKey')}
              </Label>
              <div className="mt-1 relative">
                <textarea
                  readOnly
                  value={publicKey}
                  className="w-full font-mono text-xs p-2 pr-10 rounded border bg-muted/30 min-h-[80px] resize-none"
                  data-testid="qc-public-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1"
                  onClick={() => copyToClipboard(publicKey, 'ssh.manualPair.copiedKey')}
                  data-testid="qc-copy-key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ol className="text-sm space-y-2 list-decimal pl-5">
              <li>{t('ssh.manualPair.step1', { target: `${username}@${host}` })}</li>
              <li>
                {t('ssh.manualPair.step2')}
                <div className="mt-1 relative">
                  <code className="block font-mono text-xs p-2 pr-10 rounded border bg-muted/30 break-all">
                    {suggestedCommand}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() =>
                      copyToClipboard(suggestedCommand, 'ssh.manualPair.copiedCommand')
                    }
                    data-testid="qc-copy-cmd"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </li>
              <li>{t('ssh.manualPair.step3')}</li>
            </ol>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep('form')}>
                {t('common.buttons.back')}
              </Button>
              <Button
                onClick={() => {
                  setStep('verifying')
                  verifyMutation.mutate()
                }}
                disabled={verifyMutation.isPending}
                data-testid="qc-test-connection"
              >
                <Terminal className="h-4 w-4 mr-2" />
                {t('ssh.manualPair.testConnection')}
              </Button>
            </div>
          </div>
        )}

        {step === 'verifying' && (
          <div className="py-8 flex flex-col items-center gap-2" data-testid="qc-verifying">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('ssh.manualPair.verifying', { target: `${username}@${host}` })}
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-3" data-testid="qc-success">
            <Check className="h-12 w-12 text-primary" />
            <div className="text-center">
              <p className="font-medium">{t('ssh.manualPair.connectedTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {borgVersion
                  ? t('ssh.manualPair.connectedWithVersion', { version: borgVersion })
                  : t('ssh.manualPair.connected')}
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-3" data-testid="qc-error">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('ssh.manualPair.failedTitle')}</AlertTitle>
              <AlertDescription>
                {hintKey
                  ? translateBackendKey(hintKey, 'ssh.manualPair.failedGeneric')
                  : t('ssh.manualPair.failedGeneric')}
              </AlertDescription>
            </Alert>
            {stderrRaw && (
              <details className="rounded border p-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  {t('ssh.manualPair.rawErrorToggle')}
                </summary>
                <pre className="mt-2 font-mono text-xs whitespace-pre-wrap break-all">
                  {stderrRaw}
                </pre>
              </details>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep('paste')}>
                {t('common.buttons.back')}
              </Button>
              <Button
                onClick={() => {
                  setStep('verifying')
                  verifyMutation.mutate()
                }}
                data-testid="qc-retry"
              >
                {t('ssh.manualPair.retryTest')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
