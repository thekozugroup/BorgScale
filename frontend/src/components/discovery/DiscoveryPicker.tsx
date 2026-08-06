import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import api from '@/services/api'

export interface FoundRepo {
  path: string
  borg_version: number
  repository_id: string | null
  last_modified_ts: number | null
  size_bytes: number | null
  encryption_guess: 'encrypted' | 'unencrypted' | 'unknown'
  archive_count: number | null
  already_imported: boolean
  source: 'local' | 'remote'
}

interface DiscoveryResponse {
  found: FoundRepo[]
  scanned_roots: string[]
  elapsed_ms?: number
  partial: boolean
}

interface Props {
  mode: 'local' | 'remote'
  connectionId?: number // required when mode === 'remote'
  defaultRoots?: string[]
  onImported?: () => void
}

export default function DiscoveryPicker({ mode, connectionId, defaultRoots, onImported }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [results, setResults] = useState<DiscoveryResponse | null>(null)
  const [scanning, setScanning] = useState(false)
  const [target, setTarget] = useState<FoundRepo | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [importMode, setImportMode] = useState<'observe' | 'full'>('full')
  const [name, setName] = useState('')

  async function runScan() {
    setScanning(true)
    try {
      const url =
        mode === 'local' ? '/repositories/discover/local' : '/repositories/discover/remote'
      const body: Record<string, unknown> = {
        max_depth: mode === 'local' ? 8 : 6,
        budget_seconds: 30,
      }
      if (defaultRoots && defaultRoots.length) body.roots = defaultRoots
      if (mode === 'remote') {
        if (!connectionId) {
          toast.error(t('discovery.errors.noConnection'))
          return
        }
        body.connection_id = connectionId
      }
      const resp = await api.post<DiscoveryResponse>(url, body)
      setResults(resp.data)
      if (resp.data.partial) {
        toast.warning(t('discovery.partialResults'))
      } else if (resp.data.found.length === 0) {
        toast.info(t('discovery.noneFound'))
      } else {
        toast.success(t('discovery.foundCount', { count: resp.data.found.length }))
      }
    } catch {
      toast.error(t('discovery.errors.scanFailed'))
    } finally {
      setScanning(false)
    }
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error('no target')
      const body: Record<string, unknown> = {
        path: target.path,
        name: name || undefined,
        mode: importMode,
      }
      if (passphrase) body.passphrase = passphrase
      if (mode === 'remote' && connectionId) body.connection_id = connectionId
      const resp = await api.post('/repositories/quick-import', body)
      return resp.data
    },
    onSuccess: () => {
      toast.success(t('discovery.importSuccess'))
      qc.invalidateQueries({ queryKey: ['repositories'] })
      setTarget(null)
      setPassphrase('')
      setName('')
      onImported?.()
    },
    onError: () => {
      toast.error(t('discovery.importFailed'))
    },
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-2 flex flex-wrap items-center gap-3">
          <Button onClick={runScan} disabled={scanning} data-testid="discovery-scan-button">
            {scanning ? t('discovery.scanning') : t('discovery.startScan')}
          </Button>
          {results && (
            <span className="text-sm text-muted-foreground">
              {t('discovery.scannedRoots', { roots: results.scanned_roots.join(', ') })}
              {results.elapsed_ms != null && <> &middot; {Math.round(results.elapsed_ms)} ms</>}
            </span>
          )}
        </CardContent>
      </Card>

      {results && results.found.length > 0 && (
        <div className="space-y-2">
          {results.found.map((r) => (
            <Card key={r.path} data-testid={`found-repo-${r.path}`}>
              <CardContent className="pt-2 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm truncate" title={r.path}>
                    {r.path}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={r.encryption_guess === 'encrypted' ? 'default' : 'secondary'}>
                      {t(`discovery.guess.${r.encryption_guess}`)}
                    </Badge>
                    <Badge variant="outline">borg v{r.borg_version}</Badge>
                    {r.last_modified_ts && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.last_modified_ts * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant={r.already_imported ? 'secondary' : 'default'}
                  disabled={r.already_imported}
                  onClick={() => {
                    setTarget(r)
                    setName(r.path.split('/').filter(Boolean).pop() ?? '')
                    setImportMode('full')
                    setPassphrase('')
                  }}
                  data-testid={`import-${r.path}`}
                >
                  {r.already_imported
                    ? t('discovery.alreadyImported')
                    : t('discovery.importButton')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!target}
        onOpenChange={(o) => {
          if (!o) setTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('discovery.importDialog.title')}</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3 text-sm">
              <div className="font-mono">{target.path}</div>
              <div>
                <Label htmlFor="qi-name">{t('discovery.importDialog.nameLabel')}</Label>
                <Input id="qi-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="qi-mode">{t('discovery.importDialog.modeLabel')}</Label>
                <select
                  id="qi-mode"
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'observe' | 'full')}
                >
                  <option value="full">{t('discovery.modePickerFull')}</option>
                  <option value="observe">{t('discovery.modePickerObserve')}</option>
                </select>
              </div>
              {target.encryption_guess === 'encrypted' ? (
                <div>
                  <Label htmlFor="qi-pass">{t('discovery.passphraseRequired')}</Label>
                  <Input
                    id="qi-pass"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder={t('discovery.passphrasePlaceholder')}
                    data-testid="qi-passphrase"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="qi-pass">{t('discovery.passphraseOptional')}</Label>
                  <Input
                    id="qi-pass"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    data-testid="qi-passphrase"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              data-testid="qi-submit"
            >
              {importMutation.isPending ? t('discovery.importing') : t('discovery.importButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
