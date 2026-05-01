import { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, Home, CheckSquare, Square, MinusSquare, Loader2 } from 'lucide-react'
import { BorgApiClient, type Repository } from '../../services/borgApi/client'
import type { Archive } from '../../types'
import { useTranslation } from 'react-i18next'
import { translateBackendKey } from '../../utils/translateBackendKey'
import { cn } from '@/lib/utils'

interface ArchiveItem {
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
}

export interface RestoreFilesStepData {
  selectedPaths: string[]
}

interface WizardStepRestoreFilesProps {
  repository: Repository
  archive: Pick<Archive, 'id' | 'name'>
  data: RestoreFilesStepData
  onChange: (data: Partial<RestoreFilesStepData>) => void
}

export default function WizardStepRestoreFiles({
  repository,
  archive,
  data,
  onChange,
}: WizardStepRestoreFilesProps) {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState<string>('')
  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const selectedPaths = new Set(data.selectedPaths || [])

  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await new BorgApiClient(repository).getArchiveContents(
          archive.id,
          archive.name,
          currentPath
        )
        setItems(response.data.items || [])
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } }
        const errorMsg =
          translateBackendKey(error.response?.data?.detail) ||
          t('wizard.restoreFiles.failedToLoadContents')
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }
    fetchContents()
  }, [repository, archive, currentPath, t])

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : []

  const handleItemClick = (item: ArchiveItem) => {
    if (item.type === 'directory') {
      setCurrentPath(item.path)
    } else {
      toggleSelection(item.path)
    }
  }

  const toggleSelection = (path: string) => {
    const newPaths = new Set(selectedPaths)
    if (newPaths.has(path)) { newPaths.delete(path) } else { newPaths.add(path) }
    onChange({ selectedPaths: Array.from(newPaths) })
  }

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const isSelected = (path: string): boolean => selectedPaths.has(path)

  const hasSelectedChildren = (dirPath: string): boolean =>
    Array.from(selectedPaths).some((p) => p.startsWith(dirPath + '/'))

  const getDirectoryIcon = (item: ArchiveItem) => {
    if (isSelected(item.path)) return <CheckSquare size={18} className="text-primary" />
    if (hasSelectedChildren(item.path)) return <MinusSquare size={18} className="text-primary" />
    return <Square size={18} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <p className="text-base font-semibold mb-1">{t('wizard.restoreFiles.title')}</p>
        <p className="text-sm text-muted-foreground">{t('wizard.restoreFiles.subtitle')}</p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 min-h-8 mb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setCurrentPath('')}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Home size={14} />
          {t('wizard.restoreFiles.root')}
        </button>
        {pathParts.map((part, index) => {
          const pathUpToHere = pathParts.slice(0, index + 1).join('/')
          const isLast = index === pathParts.length - 1
          return (
            <span key={pathUpToHere} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              <button
                type="button"
                onClick={() => !isLast && setCurrentPath(pathUpToHere)}
                className={cn(
                  'text-sm whitespace-nowrap',
                  isLast ? 'font-semibold cursor-default' : 'text-primary hover:underline cursor-pointer'
                )}
              >
                {part}
              </button>
            </span>
          )
        })}
      </div>

      {/* File list */}
      <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-background">
        {/* Selection header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-primary/5" style={{ height: 40, minHeight: 40, maxHeight: 40 }}>
          <CheckSquare size={14} />
          <p className="text-sm font-medium">
            {selectedPaths.size > 0
              ? t('wizard.restoreFiles.itemsSelected', { count: selectedPaths.size })
              : t('wizard.restoreFiles.noItemsSelected')}
          </p>
          {selectedPaths.size > 0 && (
            <button
              type="button"
              onClick={() => onChange({ selectedPaths: [] })}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors"
            >
              {t('wizard.restoreFiles.clearAll')}
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex justify-center p-8">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="p-3 m-3 rounded-xl text-sm border border-destructive/25 bg-destructive/10 text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">{t('wizard.restoreFiles.noItemsFound')}</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.path} className="flex items-center hover:bg-muted/30 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="flex-1 flex items-center gap-2 px-4 py-2.5 text-left min-w-0"
                  >
                    <span className="flex-shrink-0 text-muted-foreground">
                      {item.type === 'directory' ? (
                        <Folder size={18} />
                      ) : isSelected(item.path) ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <File size={18} />
                      )}
                    </span>
                    <span className={cn('text-sm truncate', isSelected(item.path) && 'font-semibold')}>
                      {item.name}
                    </span>
                    {item.size && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">
                        {formatSize(item.size)}
                      </span>
                    )}
                  </button>
                  {item.type === 'directory' && (
                    <button
                      type="button"
                      onClick={() => toggleSelection(item.path)}
                      title={t('wizard.restoreFiles.selectDirTooltip')}
                      className="p-2 mr-2 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {getDirectoryIcon(item)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">{t('wizard.restoreFiles.helpText')}</p>
    </div>
  )
}
