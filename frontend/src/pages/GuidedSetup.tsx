import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Server,
  Cloud,
  Lock,
  Unlock,
  Check,
  FolderPlus,
  Trash2,
  Eye,
  EyeOff,
  CalendarDays,
  CalendarRange,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import api, { sshKeysAPI } from '@/services/api'
import { useValidatePath, type PathValidation } from '@/hooks/useValidatePath'
import { usePageTitle } from '../hooks/usePageTitle'
import AdvancedDisclosure from '@/components/wizard/AdvancedDisclosure'

type Destination = 'local' | 'ssh'
type EncryptionChoice = 'encrypted' | 'none'
type PresetKey = 'daily' | 'weekly' | 'hourly' | 'custom'

interface SSHConnection {
  id: number
  host: string
  username: string
  port: number
  ssh_key_id: number
  default_path?: string
  status?: string
}

const PRESETS: Record<Exclude<PresetKey, 'custom'>, string> = {
  daily: '0 3 * * *',
  weekly: '0 3 * * 0',
  hourly: '0 * * * *',
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'my-backups'
  )
}

function basename(p: string): string {
  const parts = p.split('/').filter(Boolean)
  return parts[parts.length - 1] || 'my-backups'
}

interface SchedulePreview {
  expression: string
  next_runs: string[]
}

export default function GuidedSetup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle(t('guidedSetup.title'))

  // Stepper
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Stage 1: destination
  const [destination, setDestination] = useState<Destination>('local')
  const [path, setPath] = useState<string>('/data/borg/my-backups')
  const [pathTouched, setPathTouched] = useState(false)
  const [sshConnId, setSshConnId] = useState<number | ''>('')
  const [pathValidation, setPathValidation] =
    useState<PathValidation | null>(null)
  const validatePath = useValidatePath()

  // Stage 2: sources
  const [sources, setSources] = useState<string[]>([])
  const [newSource, setNewSource] = useState<string>('')

  // Stage 3: encryption
  const [encryption, setEncryption] = useState<EncryptionChoice>('encrypted')
  const [passphrase, setPassphrase] = useState<string>('')
  const [passphraseConfirm, setPassphraseConfirm] = useState<string>('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [passphraseSaved, setPassphraseSaved] = useState(false)

  // Stage 4: schedule / submit
  const [preset, setPreset] = useState<PresetKey>('daily')
  const [customCron, setCustomCron] = useState<string>('0 3 * * *')
  const [autoStart, setAutoStart] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const cronExpression = preset === 'custom' ? customCron : PRESETS[preset]

  // SSH connections (only fetched when needed)
  const { data: sshConnsResp } = useQuery({
    queryKey: ['ssh-connections', 'guided-setup'],
    queryFn: sshKeysAPI.getSSHConnections,
    enabled: destination === 'ssh',
  })
  const sshConnections: SSHConnection[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (sshConnsResp as any)?.data
    if (!raw) return []
    if (Array.isArray(raw)) return raw as SSHConnection[]
    if (Array.isArray(raw.connections)) return raw.connections as SSHConnection[]
    return []
  }, [sshConnsResp])

  // Schedule preview
  const { data: previewResp } = useQuery({
    queryKey: ['schedule-preview', cronExpression],
    queryFn: async () => {
      const r = await api.get<SchedulePreview>('/schedule/preview', {
        params: { expr: cronExpression, count: 3 },
      })
      return r.data
    },
    enabled: step === 4 && !!cronExpression,
  })

  // Auto-validate path on change (debounced via mutation re-call)
  useEffect(() => {
    if (!path) {
      setPathValidation(null)
      return
    }
    let cancelled = false
    const timeout = setTimeout(async () => {
      try {
        const result = await validatePath.mutateAsync({
          path,
          connection_type: destination,
        })
        if (!cancelled) setPathValidation(result)
      } catch {
        if (!cancelled) setPathValidation({ exists: false, error: 'invalid' })
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, destination])

  // Smart-default path regeneration when first source dir added
  useEffect(() => {
    if (pathTouched) return
    if (sources.length === 0) return
    const slug = slugify(basename(sources[0]))
    setPath(`/data/borg/${slug}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.length])

  // ── Validation gates ─────────────────────────────────────────────
  const isPathOk = useMemo(() => {
    if (!path) return false
    if (!pathValidation) return false
    if (pathValidation.error) return false
    if (pathValidation.is_borg_repo) return false
    return true
  }, [path, pathValidation])

  const canAdvance: boolean = useMemo(() => {
    if (step === 1) {
      if (!isPathOk) return false
      if (destination === 'ssh' && !sshConnId) return false
      return true
    }
    if (step === 2) {
      return sources.length > 0
    }
    if (step === 3) {
      if (encryption === 'none') return true
      if (passphrase.length < 12) return false
      if (passphrase !== passphraseConfirm) return false
      if (!passphraseSaved) return false
      return true
    }
    // Stage 4 — preset always selected by default, but require non-empty cron
    return !!cronExpression
  }, [
    step,
    isPathOk,
    destination,
    sshConnId,
    sources.length,
    encryption,
    passphrase,
    passphraseConfirm,
    passphraseSaved,
    cronExpression,
  ])

  const next = () => {
    if (!canAdvance) return
    if (step < 4) setStep(((step + 1) as 1 | 2 | 3 | 4))
  }
  const prev = () => {
    if (step > 1) setStep(((step - 1) as 1 | 2 | 3 | 4))
  }

  // ── Smart-fill: use home folder ──────────────────────────────────
  const useHomeFolder = async () => {
    const tryPath = async (p: string): Promise<string | null> => {
      try {
        const r = await api.get('/filesystem/browse', {
          params: { path: p, connection_type: 'local' },
        })
        const items = (r.data?.items as Array<{
          name: string
          is_directory: boolean
          path?: string
        }>) || []
        const firstDir = items.find((i) => i.is_directory)
        if (firstDir) {
          return firstDir.path ?? `${p.replace(/\/$/, '')}/${firstDir.name}`
        }
      } catch {
        return null
      }
      return null
    }
    const candidate =
      (await tryPath('/local/home')) ?? (await tryPath('/data/home'))
    if (candidate) {
      if (!sources.includes(candidate)) {
        setSources((prev) => [...prev, candidate])
      }
    } else {
      // Last-resort fallback: add /root or a placeholder
      const fallback = '/root'
      if (!sources.includes(fallback)) {
        setSources((prev) => [...prev, fallback])
      }
    }
  }

  const addSource = () => {
    const trimmed = newSource.trim()
    if (!trimmed) return
    if (sources.includes(trimmed)) return
    setSources((prev) => [...prev, trimmed])
    setNewSource('')
  }

  const removeSource = (p: string) =>
    setSources((prev) => prev.filter((x) => x !== p))

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    const repoName = slugify(basename(path))
    const body = {
      repository: {
        name: repoName,
        path,
        mode: 'full' as const,
        source_directories: sources,
        encryption: encryption === 'encrypted' ? 'repokey-blake2' : 'none',
        passphrase: encryption === 'encrypted' ? passphrase : '',
        compression: 'lz4',
        borg_version: 1,
        ...(destination === 'ssh' && sshConnId
          ? { connection_id: sshConnId }
          : {}),
      },
      schedule: {
        name: `${repoName}-schedule`,
        cron_expression: cronExpression,
        archive_name_template: '{hostname}-{now:%Y-%m-%dT%H:%M:%S}',
        run_prune_after: false,
        run_compact_after: false,
      },
      auto_start_backup: autoStart,
    }
    try {
      const resp = await api.post('/repositories/guided-setup', body)
      const data = resp.data as {
        repository_id: number
        scheduled_job_id?: number
        backup_job_id?: number | null
        stage: string
      }
      if (data.stage === 'ready') {
        toast.success(t('guidedSetup.confirm.successToast'))
      } else if (data.stage === 'schedule_created_backup_failed') {
        const warnFn = (toast as unknown as { warning?: (m: string) => void })
          .warning
        if (typeof warnFn === 'function') {
          warnFn(t('guidedSetup.confirm.partialToast'))
        } else {
          toast(t('guidedSetup.confirm.partialToast'))
        }
      } else {
        toast.success(t('guidedSetup.confirm.successToast'))
      }
      navigate(`/dashboard?just_setup=${data.repository_id}`)
    } catch (err) {
      const e = err as {
        response?: {
          status?: number
          data?: { detail?: string | { key?: string } }
        }
      }
      const detail = e.response?.data?.detail
      let message: string
      if (typeof detail === 'string') {
        message = detail
      } else if (detail && typeof detail === 'object' && detail.key) {
        message = t(detail.key as string, { defaultValue: detail.key }) as string
      } else {
        message = t('guidedSetup.confirm.failureToast', { error: 'unknown' })
      }
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  const stepBadge = t('guidedSetup.stepBadge', { current: step, total: 4 })
  const stepKey = (['destination', 'sources', 'encryption', 'schedule'] as const)[
    step - 1
  ]
  const stepTitle = t(`guidedSetup.step.${stepKey}.title`)
  const stepSubtitle = t(`guidedSetup.step.${stepKey}.subtitle`)

  return (
    <div className="min-h-[80vh] max-w-3xl mx-auto p-6" data-testid="guided-setup">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {stepBadge}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{stepTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{stepSubtitle}</p>
      </div>

      {/* Step indicator */}
      <ol
        className="flex items-center gap-2 mb-6"
        aria-label="Setup progress"
        data-testid="guided-setup-stepper"
      >
        {[1, 2, 3, 4].map((s) => (
          <li key={s} className="flex-1 flex items-center gap-2">
            <div
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <DestinationStage
              destination={destination}
              setDestination={setDestination}
              path={path}
              setPath={(p) => {
                setPath(p)
                setPathTouched(true)
              }}
              pathValidation={pathValidation}
              sshConnections={sshConnections}
              sshConnId={sshConnId}
              setSshConnId={setSshConnId}
            />
          )}
          {step === 2 && (
            <SourcesStage
              sources={sources}
              newSource={newSource}
              setNewSource={setNewSource}
              addSource={addSource}
              removeSource={removeSource}
              useHomeFolder={useHomeFolder}
            />
          )}
          {step === 3 && (
            <EncryptionStage
              encryption={encryption}
              setEncryption={setEncryption}
              passphrase={passphrase}
              setPassphrase={setPassphrase}
              passphraseConfirm={passphraseConfirm}
              setPassphraseConfirm={setPassphraseConfirm}
              showPassphrase={showPassphrase}
              setShowPassphrase={setShowPassphrase}
              passphraseSaved={passphraseSaved}
              setPassphraseSaved={setPassphraseSaved}
            />
          )}
          {step === 4 && (
            <ScheduleConfirmStage
              preset={preset}
              setPreset={setPreset}
              customCron={customCron}
              setCustomCron={setCustomCron}
              autoStart={autoStart}
              setAutoStart={setAutoStart}
              nextRuns={previewResp?.next_runs ?? []}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitError={submitError}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-between mt-6">
        <Button
          variant="ghost"
          onClick={prev}
          disabled={step === 1 || submitting}
          data-testid="guided-setup-back"
        >
          {t('guidedSetup.back')}
        </Button>
        {step < 4 ? (
          <Button
            onClick={next}
            disabled={!canAdvance}
            data-testid="guided-setup-continue"
          >
            {t('guidedSetup.continue')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 1: Destination
// ─────────────────────────────────────────────────────────────────────
function DestinationStage({
  destination,
  setDestination,
  path,
  setPath,
  pathValidation,
  sshConnections,
  sshConnId,
  setSshConnId,
}: {
  destination: Destination
  setDestination: (d: Destination) => void
  path: string
  setPath: (p: string) => void
  pathValidation: PathValidation | null
  sshConnections: SSHConnection[]
  sshConnId: number | ''
  setSshConnId: (id: number | '') => void
}) {
  const { t } = useTranslation()
  let pathStatusKey: string | null = null
  let pathStatusOk = false
  if (path && pathValidation) {
    if (pathValidation.error) {
      pathStatusKey = 'guidedSetup.destination.pathStatusNotEmpty'
    } else if (pathValidation.is_borg_repo) {
      pathStatusKey = 'guidedSetup.destination.pathStatusExisting'
    } else if (pathValidation.exists === false) {
      pathStatusKey = 'guidedSetup.destination.pathStatusMissing'
      pathStatusOk = true
    } else {
      pathStatusKey = 'guidedSetup.destination.pathStatusOk'
      pathStatusOk = true
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="radiogroup"
        aria-label="destination"
        className="grid gap-3 md:grid-cols-2"
      >
        <DestinationTile
          selected={destination === 'local'}
          onSelect={() => setDestination('local')}
          icon={Server}
          titleKey="guidedSetup.destination.localTile.title"
          descKey="guidedSetup.destination.localTile.desc"
          testId="guided-tile-local"
        />
        <DestinationTile
          selected={destination === 'ssh'}
          onSelect={() => setDestination('ssh')}
          icon={Cloud}
          titleKey="guidedSetup.destination.sshTile.title"
          descKey="guidedSetup.destination.sshTile.desc"
          testId="guided-tile-ssh"
        />
      </div>

      {destination === 'ssh' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guided-ssh-conn">
            {t('guidedSetup.destination.sshConnection')}
          </Label>
          {sshConnections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <a href="/ssh-connections" className="underline">
                {t('guidedSetup.destination.manageSshLink')}
              </a>
            </p>
          ) : (
            <Select
              value={sshConnId === '' ? '' : String(sshConnId)}
              onValueChange={(v) => setSshConnId(v ? Number(v) : '')}
            >
              <SelectTrigger id="guided-ssh-conn" data-testid="guided-ssh-conn">
                <SelectValue
                  placeholder={t('guidedSetup.destination.sshConnection')}
                />
              </SelectTrigger>
              <SelectContent>
                {sshConnections.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.username}@{c.host}:{c.port}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guided-path">
          {t('guidedSetup.destination.pathLabel')}
        </Label>
        <Input
          id="guided-path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          data-testid="guided-path"
        />
        <p className="text-xs text-muted-foreground">
          {t('guidedSetup.destination.pathHelper')}
        </p>
        {pathStatusKey && (
          <p
            className={cn(
              'text-xs',
              pathStatusOk ? 'text-primary' : 'text-destructive'
            )}
            data-testid="guided-path-status"
          >
            {t(pathStatusKey)}
          </p>
        )}
      </div>
    </div>
  )
}

function DestinationTile({
  selected,
  onSelect,
  icon: Icon,
  titleKey,
  descKey,
  testId,
}: {
  selected: boolean
  onSelect: () => void
  icon: typeof Server
  titleKey: string
  descKey: string
  testId: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-foreground/30 hover:bg-muted/30'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon size={20} />
      </div>
      <div>
        <div className="text-sm font-semibold">{t(titleKey)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 2: Sources
// ─────────────────────────────────────────────────────────────────────
function SourcesStage({
  sources,
  newSource,
  setNewSource,
  addSource,
  removeSource,
  useHomeFolder,
}: {
  sources: string[]
  newSource: string
  setNewSource: (v: string) => void
  addSource: () => void
  removeSource: (p: string) => void
  useHomeFolder: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="secondary"
          onClick={useHomeFolder}
          data-testid="guided-use-home"
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          {t('guidedSetup.sources.suggestHome')}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          placeholder="/var/lib/data"
          data-testid="guided-source-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSource()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addSource}
          disabled={!newSource.trim()}
          data-testid="guided-add-source"
        >
          {t('guidedSetup.sources.addFolder')}
        </Button>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('guidedSetup.sources.noneAdded')}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="guided-sources-list">
          {sources.map((s) => (
            <li
              key={s}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="text-sm font-mono break-all">{s}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSource(s)}
                aria-label={t('guidedSetup.sources.removeFolder')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 3: Encryption
// ─────────────────────────────────────────────────────────────────────
function EncryptionStage({
  encryption,
  setEncryption,
  passphrase,
  setPassphrase,
  passphraseConfirm,
  setPassphraseConfirm,
  showPassphrase,
  setShowPassphrase,
  passphraseSaved,
  setPassphraseSaved,
}: {
  encryption: EncryptionChoice
  setEncryption: (e: EncryptionChoice) => void
  passphrase: string
  setPassphrase: (v: string) => void
  passphraseConfirm: string
  setPassphraseConfirm: (v: string) => void
  showPassphrase: boolean
  setShowPassphrase: (b: boolean) => void
  passphraseSaved: boolean
  setPassphraseSaved: (b: boolean) => void
}) {
  const { t } = useTranslation()
  const mismatch =
    passphrase.length > 0 &&
    passphraseConfirm.length > 0 &&
    passphrase !== passphraseConfirm
  const tooShort = passphrase.length > 0 && passphrase.length < 12
  return (
    <div className="space-y-6">
      <div
        role="radiogroup"
        aria-label="encryption"
        className="grid gap-3 md:grid-cols-2"
      >
        <DestinationTile
          selected={encryption === 'encrypted'}
          onSelect={() => setEncryption('encrypted')}
          icon={Lock}
          titleKey="guidedSetup.encryption.tileEncrypted.title"
          descKey="guidedSetup.encryption.tileEncrypted.desc"
          testId="guided-tile-encrypted"
        />
        <DestinationTile
          selected={encryption === 'none'}
          onSelect={() => setEncryption('none')}
          icon={Unlock}
          titleKey="guidedSetup.encryption.tileNone.title"
          descKey="guidedSetup.encryption.tileNone.desc"
          testId="guided-tile-none"
        />
      </div>

      {encryption === 'encrypted' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guided-passphrase">
              {t('guidedSetup.encryption.passphrase')}
            </Label>
            <div className="relative">
              <Input
                id="guided-passphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                data-testid="guided-passphrase"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="toggle passphrase visibility"
              >
                {showPassphrase ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {tooShort && (
              <p className="text-xs text-destructive">
                {t('guidedSetup.encryption.passphraseShort')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guided-passphrase-confirm">
              {t('guidedSetup.encryption.confirm')}
            </Label>
            <Input
              id="guided-passphrase-confirm"
              type={showPassphrase ? 'text' : 'password'}
              value={passphraseConfirm}
              onChange={(e) => setPassphraseConfirm(e.target.value)}
              data-testid="guided-passphrase-confirm"
            />
            {mismatch && (
              <p
                className="text-xs text-destructive"
                data-testid="guided-passphrase-mismatch"
              >
                {t('guidedSetup.encryption.passphraseMismatch')}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('guidedSetup.encryption.lossWarning')}
          </p>
          <div className="flex items-start gap-2">
            <Checkbox
              id="guided-passphrase-saved"
              checked={passphraseSaved}
              onCheckedChange={(c) => setPassphraseSaved(!!c)}
              data-testid="guided-passphrase-saved"
            />
            <Label
              htmlFor="guided-passphrase-saved"
              className="text-sm font-normal cursor-pointer"
            >
              {t('guidedSetup.encryption.savedConfirm')}
            </Label>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 4: Schedule + Confirm
// ─────────────────────────────────────────────────────────────────────
function ScheduleConfirmStage({
  preset,
  setPreset,
  customCron,
  setCustomCron,
  autoStart,
  setAutoStart,
  nextRuns,
  onSubmit,
  submitting,
  submitError,
}: {
  preset: PresetKey
  setPreset: (p: PresetKey) => void
  customCron: string
  setCustomCron: (v: string) => void
  autoStart: boolean
  setAutoStart: (b: boolean) => void
  nextRuns: string[]
  onSubmit: () => void
  submitting: boolean
  submitError: string | null
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div
        role="radiogroup"
        aria-label="schedule preset"
        className="grid gap-3 md:grid-cols-3"
      >
        <PresetCard
          selected={preset === 'daily'}
          onSelect={() => setPreset('daily')}
          icon={CalendarDays}
          titleKey="guidedSetup.schedule.presetDaily.title"
          descKey="guidedSetup.schedule.presetDaily.desc"
          testId="guided-preset-daily"
        />
        <PresetCard
          selected={preset === 'weekly'}
          onSelect={() => setPreset('weekly')}
          icon={CalendarRange}
          titleKey="guidedSetup.schedule.presetWeekly.title"
          descKey="guidedSetup.schedule.presetWeekly.desc"
          testId="guided-preset-weekly"
        />
        <PresetCard
          selected={preset === 'hourly'}
          onSelect={() => setPreset('hourly')}
          icon={Clock}
          titleKey="guidedSetup.schedule.presetHourly.title"
          descKey="guidedSetup.schedule.presetHourly.desc"
          testId="guided-preset-hourly"
        />
      </div>

      {nextRuns.length > 0 && (
        <div className="rounded-md bg-muted/40 p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            {t('guidedSetup.schedule.nextRunsLabel')}
          </div>
          <ul className="text-xs space-y-0.5" data-testid="guided-next-runs">
            {nextRuns.map((r) => (
              <li key={r} className="font-mono">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdvancedDisclosure labelKey="guidedSetup.schedule.advancedCron">
        <Input
          value={customCron}
          onChange={(e) => {
            setCustomCron(e.target.value)
            setPreset('custom')
          }}
          placeholder="0 3 * * *"
          data-testid="guided-custom-cron"
        />
      </AdvancedDisclosure>

      <div className="flex items-start gap-2">
        <Switch
          id="guided-auto-start"
          checked={autoStart}
          onCheckedChange={(c) => setAutoStart(!!c)}
          data-testid="guided-auto-start"
        />
        <Label
          htmlFor="guided-auto-start"
          className="text-sm font-normal cursor-pointer"
        >
          <span>{t('guidedSetup.schedule.autoStartLabel')}</span>
          <span className="block text-xs text-muted-foreground">
            {t('guidedSetup.schedule.autoStartHelper')}
          </span>
        </Label>
      </div>

      {submitError && (
        <div
          className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="guided-submit-error"
        >
          {submitError}
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={onSubmit}
        disabled={submitting}
        data-testid="guided-submit"
      >
        {submitting ? (
          t('guidedSetup.confirm.submitting')
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            {t('guidedSetup.confirm.submitButton')}
          </>
        )}
      </Button>
    </div>
  )
}

function PresetCard({
  selected,
  onSelect,
  icon: Icon,
  titleKey,
  descKey,
  testId,
}: {
  selected: boolean
  onSelect: () => void
  icon: typeof Server
  titleKey: string
  descKey: string
  testId: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        'flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-foreground/30 hover:bg-muted/30'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-md mb-1',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon size={18} />
      </div>
      <div className="text-sm font-semibold">{t(titleKey)}</div>
      <div className="text-xs text-muted-foreground">{t(descKey)}</div>
    </button>
  )
}
