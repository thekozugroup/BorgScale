import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Folder, FileText, Inbox, Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BorgApiClient, type Repository } from '../services/borgApi/client'
import { Archive } from '../types'
import { formatDateCompact, formatBytes as formatBytesUtil } from '../utils/dateUtils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ArchiveContentsDialogProps {
  open: boolean
  archive: Archive | null
  repository: Repository | null
  onClose: () => void
  onDownloadFile?: (archiveName: string, filePath: string) => void
}

interface FileItem {
  name: string
  path: string
  size?: number | null
  mtime?: string
  type: string
}

interface RawFileItem {
  name: string
  path: string
  size?: number | null
  type: string
  mtime?: string
}

function normalizeArchivePath(path: string) {
  if (!path || path === '/') {
    return '/'
  }
  return `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

export default function ArchiveContentsDialog({
  open,
  archive,
  repository,
  onClose,
  onDownloadFile,
}: ArchiveContentsDialogProps) {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState('/')

  // Reset path when archive changes
  useEffect(() => {
    if (open && archive) {
      setCurrentPath('/')
    }
  }, [open, archive])

  // Fetch archive contents
  const { data: archiveContents, isFetching } = useQuery({
    queryKey: ['archive-contents', repository?.id, archive?.name, currentPath],
    queryFn: async () => {
      if (!repository || !archive) {
        throw new Error('Repository or archive not selected')
      }
      const path = currentPath === '/' ? '' : currentPath.slice(1)
      return new BorgApiClient(repository).getArchiveContents(archive.id, archive.name, path)
    },
    enabled: !!archive && !!repository && open,
    staleTime: 5 * 60 * 1000,
  })

  // File browser helper functions
  const getFilesInCurrentPath = () => {
    if (!archiveContents?.data?.items) return { folders: [], files: [] }

    const items = archiveContents.data.items
    const folders: FileItem[] = []
    const files: FileItem[] = []

    items.forEach((item: RawFileItem) => {
      if (item.type === 'directory') {
        folders.push({
          name: item.name,
          path: item.path,
          size: item.size,
          type: 'd',
        })
      } else {
        files.push({
          name: item.name,
          path: item.path,
          size: item.size,
          mtime: item.mtime,
          type: 'f',
        })
      }
    })

    return { folders, files }
  }

  const navigateToPath = (path: string) => {
    setCurrentPath(normalizeArchivePath(path))
  }

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [{ label: t('archiveContents.root'), path: '/' }]

    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [{ label: t('archiveContents.root'), path: '/' }]

    let accumulatedPath = ''
    parts.forEach((part) => {
      accumulatedPath += `/${part}`
      breadcrumbs.push({ label: part, path: accumulatedPath })
    })

    return breadcrumbs
  }

  const { folders, files } = getFilesInCurrentPath()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl w-full p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col"
      >
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <FolderOpen size={24} className="text-muted-foreground shrink-0" />
            <div>
              <DialogTitle className="text-base font-semibold">
                {t('archiveContents.title')}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{archive?.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center flex-wrap gap-1 px-4 py-2 border-b shrink-0">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && (
                  <span className="text-sm text-muted-foreground">/</span>
                )}
                <button
                  type="button"
                  onClick={() => navigateToPath(crumb.path)}
                  className="text-sm text-primary underline hover:text-primary/80 cursor-pointer"
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isFetching ? (
              <div className="space-y-1 p-3">
                {[
                  { width: 'w-[55%]', isFolder: true },
                  { width: 'w-[40%]', isFolder: true },
                  { width: 'w-[70%]', isFolder: true },
                  { width: 'w-[62%]', isFolder: false },
                  { width: 'w-[48%]', isFolder: false },
                  { width: 'w-[75%]', isFolder: false },
                  { width: 'w-[33%]', isFolder: false },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-md ${row.isFolder ? 'bg-primary/5' : 'bg-muted/50'}`}
                  >
                    <Skeleton className="size-5 shrink-0 rounded" />
                    <Skeleton className={`h-4 flex-1 ${row.width}`} />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : archiveContents?.data?.items ? (
              archiveContents.data.items.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                  {folders.length === 0 && files.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        {t('archiveContents.emptyDirectory')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-3">
                      {/* Folders */}
                      {folders.map((folder, index) => (
                        <div
                          key={`folder-${index}`}
                          onClick={() => navigateToPath(folder.path)}
                          className="flex items-center justify-between p-3 rounded-md cursor-pointer select-none bg-primary/10 hover:bg-primary/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-foreground flex-1">
                            <Folder size={20} />
                            <span className="text-sm font-medium">{folder.name}</span>
                          </div>
                          {folder.size !== null && folder.size !== undefined ? (
                            <span className="text-sm text-muted-foreground ml-2">
                              {formatBytesUtil(folder.size)}
                            </span>
                          ) : null}
                        </div>
                      ))}

                      {/* Files */}
                      {files.map((file, index) => (
                        <div
                          key={`file-${index}`}
                          className="flex items-center justify-between p-3 rounded-md select-none bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 text-foreground">
                            <FileText size={20} />
                            <span className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                              {file.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-sm text-muted-foreground min-w-[165px] text-right font-mono text-[0.8rem] whitespace-nowrap">
                              {file.mtime ? formatDateCompact(file.mtime) : '-'}
                            </span>
                            <span className="text-sm text-muted-foreground w-20 text-right">
                              {file.size ? formatBytesUtil(file.size) : '0 B'}
                            </span>
                            {onDownloadFile && (
                              <button
                                type="button"
                                title={t('archiveContents.downloadFile')}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => {
                                  if (archive) {
                                    onDownloadFile(archive.name, file.path)
                                  }
                                }}
                              >
                                <Download size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-6">
                  <div className="size-[72px] rounded-full flex items-center justify-center bg-muted mb-5">
                    <Inbox size={32} className="opacity-50" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">
                    {t('archiveContents.emptyArchive')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[380px] leading-relaxed">
                    {t('archiveContents.emptyArchiveDesc')}
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-6">
                <div className="size-[72px] rounded-full flex items-center justify-center bg-muted mb-5">
                  <Inbox size={32} className="opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('archiveContents.noInfo')}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="hidden md:flex px-4 py-3 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.buttons.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
