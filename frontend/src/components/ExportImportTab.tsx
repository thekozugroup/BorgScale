import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Download, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import { configExportImportAPI } from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Repository } from '../types'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ImportResult {
  success: boolean
  error?: string
  repositories_created?: number
  repositories_updated?: number
  schedules_created?: number
  schedules_updated?: number
  warnings?: string[]
  errors?: string[]
}

const ExportImportTab: React.FC = () => {
  const { t } = useTranslation()
  const { hasGlobalPermission } = useAuth()
  const canManageExportImport = hasGlobalPermission('settings.export_import.manage')
  const { trackSystem, EventAction } = useAnalytics()

  const [selectedRepos, setSelectedRepos] = useState<number[]>([])
  const [includeSchedules, setIncludeSchedules] = useState(true)
  const [exportingAll, setExportingAll] = useState(true)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [mergeStrategy, setMergeStrategy] = useState('skip_duplicates')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const { data: reposData, isLoading: loadingRepos } = useQuery({
    queryKey: ['exportable-repositories'],
    queryFn: async () => {
      const response = await configExportImportAPI.listExportableRepositories()
      return response.data
    },
  })

  const repositories: Repository[] = reposData?.repositories || []

  const exportMutation = useMutation({
    mutationFn: async () => {
      const repoIds = exportingAll ? undefined : selectedRepos
      const response = await configExportImportAPI.exportBorgmatic(repoIds, includeSchedules)
      return response
    },
    onSuccess: (response) => {
      const contentType = response.headers['content-type'] || 'application/octet-stream'
      const contentDisposition = response.headers['content-disposition'] || ''
      let filename = 'borgscale-export.yaml'
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1].replace(/['"]/g, '')
      const blob = new Blob([response.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(t('exportImport.export.success'))
      trackSystem(EventAction.EXPORT, {
        section: 'export_import',
        exporting_all: exportingAll,
        repository_count: exportingAll ? repositories.length : selectedRepos.length,
        include_schedules: includeSchedules,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('exportImport.failedToExport'))
    },
  })

  const importMutation = useMutation({
    mutationFn: async ({ file, dryRun }: { file: File; dryRun: boolean }) => {
      const response = await configExportImportAPI.importBorgmatic(file, mergeStrategy, dryRun)
      return response.data
    },
    onSuccess: (result) => {
      setImportResult(result)
      if (!result.success) toast.error(result.error || t('exportImport.importFailed'))
      else if (result.errors?.length > 0) toast.error(t('exportImport.importCompletedWithErrors'))
      else toast.success(t('exportImport.importSuccess'))
      trackSystem(EventAction.UPLOAD, {
        section: 'export_import',
        merge_strategy: mergeStrategy,
        dry_run: false,
        success: !!result.success,
        file_extension: importFile?.name.split('.').pop()?.toLowerCase() ?? 'unknown',
        file_size_bytes: importFile?.size ?? 0,
        warning_count: result.warnings?.length || 0,
        error_count: result.errors?.length || 0,
        repositories_created: result.repositories_created || 0,
        repositories_updated: result.repositories_updated || 0,
        schedules_created: result.schedules_created || 0,
        schedules_updated: result.schedules_updated || 0,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('exportImport.failedToImport'))
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        toast.error(t('exportImport.selectYamlFileError'))
        return
      }
      setImportFile(file)
      setImportResult(null)
      trackSystem(EventAction.VIEW, {
        section: 'export_import',
        operation: 'select_import_file',
        file_extension: file.name.split('.').pop()?.toLowerCase() ?? 'unknown',
        file_size_bytes: file.size,
      })
    }
  }

  const toggleRepository = (repoId: number) => {
    if (selectedRepos.includes(repoId)) {
      setSelectedRepos(selectedRepos.filter((id) => id !== repoId))
    } else {
      setSelectedRepos([...selectedRepos, repoId])
    }
  }

  if (!canManageExportImport) return null

  return (
    <div>
      {/* Export Section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Download size={22} />
          <h2 className="text-lg font-semibold">{t('exportImport.export.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('exportImport.export.description')}</p>
      </div>

      <SettingsCard className="mb-6">
        <div className="flex flex-col gap-4">
          {/* Export all checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportingAll}
              onChange={(e) => setExportingAll(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{t('exportImport.exportAllRepositories')}</span>
          </label>

          {!exportingAll && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold">{t('exportImport.selectRepositories')}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRepos(repositories.map((r) => r.id))} disabled={loadingRepos}>{t('exportImport.selectAll')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRepos([])} disabled={loadingRepos}>{t('exportImport.clear')}</Button>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-auto" style={{ maxHeight: 200 }}>
                {loadingRepos ? (
                  <p className="text-sm text-muted-foreground p-3">{t('exportImport.loadingRepositories')}</p>
                ) : repositories.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">{t('exportImport.noRepositoriesAvailable')}</p>
                ) : (
                  <div>
                    {repositories.map((repo) => (
                      <label key={repo.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 border-b border-border last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedRepos.includes(repo.id)}
                          onChange={() => toggleRepository(repo.id)}
                          className="w-4 h-4 rounded flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{repo.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{repo.path} · {repo.repository_type}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSchedules}
              onChange={(e) => setIncludeSchedules(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{t('exportImport.includeSchedules')}</span>
          </label>

          <Button
            className="gap-1.5 self-start"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || (!exportingAll && selectedRepos.length === 0)}
          >
            {exportMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exportMutation.isPending ? t('exportImport.export.exporting') : t('exportImport.export.button')}
          </Button>
        </div>
      </SettingsCard>

      <div className="border-t border-border my-8" />

      {/* Import Section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Upload size={22} />
          <h2 className="text-lg font-semibold">{t('exportImport.import.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('exportImport.import.description')}</p>
      </div>

      <SettingsCard>
        <div className="flex flex-col gap-4">
          {/* File selector */}
          <div>
            <input
              accept=".yaml,.yml"
              style={{ display: 'none' }}
              id="import-file-input"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="import-file-input">
              <Button variant="outline" className="gap-1.5 cursor-pointer" asChild>
                <span><FileText size={15} />{t('exportImport.selectYamlFile')}</span>
              </Button>
            </label>
            {importFile && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('exportImport.selectedFile', { name: importFile.name })}
              </p>
            )}
          </div>

          {/* Merge strategy */}
          <div>
            <p className="text-xs font-semibold mb-1.5">{t('exportImport.conflictResolutionStrategy')}</p>
            <Select value={mergeStrategy} onValueChange={(v) => {
              setMergeStrategy(v)
              trackSystem(EventAction.EDIT, { section: 'export_import', setting: 'merge_strategy', value: v })
            }}>
              <SelectTrigger className="h-9 text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip_duplicates">{t('exportImport.strategySkipDuplicates')}</SelectItem>
                <SelectItem value="replace">{t('exportImport.strategyReplace')}</SelectItem>
                <SelectItem value="rename">{t('exportImport.strategyRename')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertCircle size={16} />
            <AlertDescription>
              <strong>{t('exportImport.importantLabel')}</strong>{' '}
              {t('exportImport.importSecurityWarning')}
            </AlertDescription>
          </Alert>

          <Button
            className="gap-1.5 self-start"
            onClick={() => importFile && importMutation.mutate({ file: importFile, dryRun: false })}
            disabled={!importFile || importMutation.isPending}
          >
            {importMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {importMutation.isPending ? t('exportImport.import.importing') : t('exportImport.import.button')}
          </Button>

          {importMutation.isPending && (
            <div className="h-1.5 rounded-full overflow-hidden bg-muted">
              <div className="h-full bg-primary animate-pulse w-full" />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <SettingsCard>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle size={22} className="text-primary" />
                  ) : (
                    <AlertCircle size={22} className="text-destructive" />
                  )}
                  <p className="text-base font-semibold">
                    {importResult.success ? t('exportImport.importSummary') : t('exportImport.importFailed')}
                  </p>
                </div>

                {importResult.success && (
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'repositoriesCreated', val: importResult.repositories_created || 0 },
                      { key: 'repositoriesUpdated', val: importResult.repositories_updated || 0 },
                      { key: 'schedulesCreated', val: importResult.schedules_created || 0 },
                      { key: 'schedulesUpdated', val: importResult.schedules_updated || 0 },
                    ].map((item) => (
                      <p key={item.key} className="text-sm">
                        <strong>{t(`exportImport.${item.key}`)}:</strong> {item.val}
                      </p>
                    ))}

                    {(importResult.warnings?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        <p className="text-sm font-semibold">{t('exportImport.warnings')}:</p>
                        {importResult.warnings?.map((w, i) => (
                          <Alert key={i}><AlertDescription>{w}</AlertDescription></Alert>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!importResult.success && (
                  <Alert variant="destructive"><AlertDescription>{importResult.error}</AlertDescription></Alert>
                )}

                {(importResult.errors?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    <p className="text-sm font-semibold">{t('exportImport.errors')}:</p>
                    {importResult.errors?.map((e, i) => (
                      <Alert key={i} variant="destructive"><AlertDescription>{e}</AlertDescription></Alert>
                    ))}
                  </div>
                )}
              </div>
            </SettingsCard>
          )}
        </div>
      </SettingsCard>
    </div>
  )
}

export default ExportImportTab
