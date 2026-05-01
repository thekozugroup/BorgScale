import React, { useState, useEffect, useRef } from 'react'
import {
  File,
  ChevronRight,
  Home,
  Search,
  Archive,
  HardDrive,
  FolderPlus,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import api from '../services/api'
import { sshKeysAPI } from '../services/api'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface FileSystemItem {
  name: string
  path: string
  is_directory: boolean
  size?: number
  modified?: string
  is_borg_repo: boolean
  is_local_mount?: boolean
  is_mount_point?: boolean
  ssh_connection?: SSHConnection
  permissions?: string
}

interface SSHConnection {
  id: number
  ssh_key_id: number
  host: string
  username: string
  port: number
  default_path?: string
  mount_point?: string
  status: string
}

interface SSHNetworkConfig {
  ssh_key_id: number
  host: string
  username: string
  port: number
}

interface FileExplorerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (selectedPaths: string[]) => void
  title?: string
  initialPath?: string
  multiSelect?: boolean
  connectionType?: 'local' | 'ssh'
  sshConfig?: SSHNetworkConfig
  selectMode?: 'directories' | 'files' | 'both'
  showSshMountPoints?: boolean
  allowedSshConnectionId?: number | null
}

export default function FileExplorerDialog({
  open,
  onClose,
  onSelect,
  title,
  initialPath = '/',
  multiSelect = false,
  connectionType = 'local',
  sshConfig,
  selectMode = 'directories',
  showSshMountPoints = true,
  allowedSshConnectionId = null,
}: FileExplorerDialogProps) {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [items, setItems] = useState<FileSystemItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sshConnections, setSshConnections] = useState<SSHConnection[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [activeConnectionType, setActiveConnectionType] = useState(connectionType)
  const [activeSshConfig, setActiveSshConfig] = useState(sshConfig)
  const [isInsideLocalMount, setIsInsideLocalMount] = useState(false)

  // Create folder dialog
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  const initialLoadDone = useRef(false)

  const loadSSHConnections = async () => {
    try {
      const response = await sshKeysAPI.getSSHConnections()
      const connections = response.data?.connections || []
      setSshConnections(connections.filter((conn: SSHConnection) => conn.status === 'connected'))
    } catch (err) {
      console.error('Failed to load SSH connections:', err)
      setSshConnections([])
    }
  }

  const loadDirectory = React.useCallback(
    async (path: string, conn?: 'local' | 'ssh', config?: SSHNetworkConfig) => {
      setLoading(true)
      setError(null)

      if (conn !== undefined) {
        setActiveConnectionType(conn)
      }
      if (config !== undefined) {
        setActiveSshConfig(config)
      }

      const useConnectionType = conn !== undefined ? conn : activeConnectionType
      const useSshConfig = config !== undefined ? config : activeSshConfig

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {
          path,
          connection_type: useConnectionType,
        }

        if (useConnectionType === 'ssh' && useSshConfig) {
          params.ssh_key_id = useSshConfig.ssh_key_id
          params.host = useSshConfig.host
          params.username = useSshConfig.username
          params.port = useSshConfig.port
        }

        const response = await api.get('/filesystem/browse', { params })
        setItems(response.data.items || [])
        setCurrentPath(response.data.current_path)
        setIsInsideLocalMount(response.data.is_inside_local_mount || false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const detail = err.response?.data?.detail
        if (detail && typeof detail === 'object' && detail.key) {
          setError(t(detail.key, detail.params) as string)
        } else {
          setError(typeof detail === 'string' ? detail : t('fileExplorer.failedToLoad'))
        }
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [activeConnectionType, activeSshConfig, t]
  )

  useEffect(() => {
    if (open && !initialLoadDone.current) {
      initialLoadDone.current = true
      setSelectedPaths([])
      setSearchTerm('')

      if (initialPath) {
        loadDirectory(initialPath, connectionType, sshConfig)
      } else {
        loadDirectory('', connectionType, sshConfig)
      }

      if (connectionType === 'local') {
        loadSSHConnections()
      }
    }
    if (!open) {
      initialLoadDone.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPath, connectionType, sshConfig])

  const handleItemClick = (item: FileSystemItem) => {
    if (item.is_mount_point && item.ssh_connection) {
      const sshCfg = {
        ssh_key_id: item.ssh_connection.ssh_key_id,
        host: item.ssh_connection.host,
        username: item.ssh_connection.username,
        port: item.ssh_connection.port,
      }
      const startPath = item.ssh_connection.default_path || '/'
      loadDirectory(startPath, 'ssh', sshCfg)
      setSearchTerm('')
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else if (item.is_directory) {
      loadDirectory(item.path)
      setSearchTerm('')
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }

  const handleItemSelect = (item: FileSystemItem) => {
    if (selectMode === 'directories' && !item.is_directory) return
    if (selectMode === 'files' && item.is_directory) return

    if (multiSelect) {
      setSelectedPaths((prev) =>
        prev.includes(item.path) ? prev.filter((p) => p !== item.path) : [...prev, item.path]
      )
    } else {
      setSelectedPaths([item.path])
    }
  }

  const handleBreadcrumbClick = (path: string) => {
    if (path === '/' && activeConnectionType === 'ssh' && connectionType === 'local') {
      setActiveConnectionType('local')
      setActiveSshConfig(undefined)
      loadDirectory('/', 'local', undefined)
    } else {
      loadDirectory(path)
    }
  }

  const handleConfirm = () => {
    const paths = selectedPaths.map((path) => {
      if (activeConnectionType === 'ssh' && activeSshConfig && connectionType === 'local') {
        return `ssh://${activeSshConfig.username}@${activeSshConfig.host}:${activeSshConfig.port}${path}`
      }
      return path
    })
    onSelect(paths)
    onClose()
  }

  const handleSelectCurrent = () => {
    let path = currentPath
    if (activeConnectionType === 'ssh' && activeSshConfig && connectionType === 'local') {
      path = `ssh://${activeSshConfig.username}@${activeSshConfig.host}:${activeSshConfig.port}${currentPath}`
    }
    onSelect([path])
    onClose()
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setCreatingFolder(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        path: currentPath,
        folder_name: newFolderName.trim(),
        connection_type: activeConnectionType,
      }

      if (activeConnectionType === 'ssh' && activeSshConfig) {
        params.ssh_key_id = activeSshConfig.ssh_key_id
        params.host = activeSshConfig.host
        params.username = activeSshConfig.username
        params.port = activeSshConfig.port
      }

      await api.post('/filesystem/create-folder', params)
      await loadDirectory(currentPath)
      setShowCreateFolder(false)
      setNewFolderName('')
      setError(null)
      setNewFolderName('')
      setError(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to create folder:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create folder'
      if (typeof errorMessage === 'object') {
        setError(JSON.stringify(errorMessage))
      } else {
        setError(errorMessage)
      }
    } finally {
      setCreatingFolder(false)
    }
  }

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs: { label: string; path: string }[] = [
      { label: t('dialogs.fileExplorer.root'), path: '/' },
    ]

    let accumulatedPath = ''
    parts.forEach((part) => {
      accumulatedPath += `/${part}`
      breadcrumbs.push({ label: part, path: accumulatedPath })
    })

    return breadcrumbs
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getMountPointItems = (): FileSystemItem[] => {
    if (currentPath !== '/' || activeConnectionType !== 'local' || !showSshMountPoints) return []

    const filteredConnections = allowedSshConnectionId
      ? sshConnections.filter((conn) => conn.id === allowedSshConnectionId)
      : sshConnections

    return filteredConnections.map((conn) => {
      const displayName =
        conn.mount_point && conn.mount_point.trim()
          ? conn.mount_point
          : `ssh://${conn.username}@${conn.host}:${conn.port}${conn.default_path || '/'}`

      return {
        name: displayName,
        path: `ssh://${conn.username}@${conn.host}:${conn.port}${conn.default_path || '/'}`,
        is_directory: true,
        is_borg_repo: false,
        is_mount_point: true,
        ssh_connection: conn,
      }
    })
  }

  const shouldHideLocalItems =
    allowedSshConnectionId && currentPath === '/' && activeConnectionType === 'local'

  const allItems = [...getMountPointItems(), ...(shouldHideLocalItems ? [] : items)]
  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const breadcrumbs = getBreadcrumbs()

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl w-full p-0 gap-0 overflow-hidden h-[75vh] flex flex-col"
        >
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">
                {title ?? t('dialogs.fileExplorer.selectDirectory')}
              </DialogTitle>
              {activeConnectionType === 'ssh' && activeSshConfig ? (
                <Badge variant="outline" className="text-xs font-medium">
                  {activeSshConfig.username}@{activeSshConfig.host}
                </Badge>
              ) : isInsideLocalMount && activeConnectionType === 'local' ? (
                <Badge variant="outline" className="text-xs font-medium gap-1">
                  <HardDrive size={12} />
                  {t('fileExplorer.chips.host')}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>

          {/* Breadcrumb Navigation */}
          <div className="px-3 py-1.5 bg-muted/30 border-b shrink-0">
            <nav className="flex items-center flex-wrap gap-0.5 text-xs">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight size={12} className="text-muted-foreground mx-0.5 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(crumb.path)}
                    className={cn(
                      'flex items-center gap-0.5 hover:underline hover:text-primary transition-colors',
                      index === breadcrumbs.length - 1
                        ? 'font-semibold text-foreground'
                        : 'text-foreground'
                    )}
                  >
                    {index === 0 && <Home size={12} />}
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Search and Create Folder */}
          <div className="px-3 py-1.5 flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder={t('fileExplorer.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-[35px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap h-[35px]"
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus size={16} />
              {t('fileExplorer.newFolder')}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-3 pb-1.5 shrink-0">
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Mount Point Info */}
          {currentPath === '/' && activeConnectionType === 'local' && sshConnections.length > 0 && (
            <div className="px-3 pb-1.5 shrink-0">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {t('fileExplorer.sshInfoAlert')}
                </p>
              </div>
            </div>
          )}

          {/* File List or Loading */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={32} className="animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('fileExplorer.loading')}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <FolderOpen size={36} />
                <p className="text-sm">{t('fileExplorer.noItemsFound')}</p>
                <p className="text-xs text-muted-foreground">
                  {searchTerm
                    ? t('fileExplorer.tryDifferentSearch')
                    : t('fileExplorer.emptyDirectory')}
                </p>
              </div>
            ) : (
              <ul className="px-1 py-0">
                {filteredItems.map((item) => {
                  const isSelectable =
                    (selectMode === 'directories' && item.is_directory) ||
                    (selectMode === 'files' && !item.is_directory) ||
                    selectMode === 'both'

                  const isSelected = selectedPaths.includes(item.path)

                  return (
                    <li key={item.path} className="list-none">
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors',
                          'hover:bg-muted',
                          isSelected && !multiSelect && 'bg-primary/10 hover:bg-primary/15'
                        )}
                        onClick={() =>
                          item.is_directory
                            ? handleItemClick(item)
                            : isSelectable && handleItemSelect(item)
                        }
                      >
                        <span className="shrink-0 flex items-center">
                          {item.is_mount_point ? (
                            <HardDrive size={18} className="text-primary" />
                          ) : item.is_local_mount ? (
                            <HardDrive size={18} className="text-muted-foreground" />
                          ) : item.is_borg_repo ? (
                            <Archive size={18} className="text-destructive/70" />
                          ) : item.is_directory ? (
                            <FolderOpen size={18} className="text-foreground/70" />
                          ) : (
                            <File size={18} className="text-muted-foreground" />
                          )}
                        </span>

                        <span className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-sm truncate">{item.name}</span>
                          {item.is_mount_point && (
                            <Badge className="h-4 text-[0.6rem] font-semibold px-1 bg-primary/10 text-primary border-primary/20">
                              {t('fileExplorer.chips.remote')}
                            </Badge>
                          )}
                          {item.is_local_mount && (
                            <Badge variant="outline" className="h-4 text-[0.6rem] font-semibold px-1">
                              {t('fileExplorer.chips.host')}
                            </Badge>
                          )}
                          {item.is_borg_repo && (
                            <Badge className="h-4 text-[0.6rem] font-semibold px-1 bg-muted text-muted-foreground border-border">
                              {t('fileExplorer.chips.borg')}
                            </Badge>
                          )}
                          {!item.is_directory && item.size && (
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">
                              {formatFileSize(item.size)}
                            </span>
                          )}
                        </span>

                        {isSelectable && multiSelect && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleItemSelect(item)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Multi-select info */}
            {multiSelect && selectedPaths.length > 0 && (
              <div className="px-3 py-2 bg-primary/5 border-t">
                <p className="text-xs font-semibold text-primary">
                  {t('fileExplorer.selectedCount', { count: selectedPaths.length })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="px-3 py-2 border-t flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
              {t('fileExplorer.cancel')}
            </Button>
            <div className="flex-1" />
            {selectMode === 'directories' && (
              <Button variant="outline" size="sm" onClick={handleSelectCurrent}>
                {t('fileExplorer.useCurrent')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedPaths.length === 0}
            >
              {multiSelect && selectedPaths.length > 0
                ? t('fileExplorer.selectWithCount', { count: selectedPaths.length })
                : t('fileExplorer.select')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog
        open={showCreateFolder}
        onOpenChange={(isOpen) => { if (!isOpen && !creatingFolder) setShowCreateFolder(false) }}
      >
        <DialogContent showCloseButton={false} className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('fileExplorer.createFolderTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-folder-input">{t('fileExplorer.folderNameLabel')}</Label>
              <Input
                id="new-folder-input"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder()
                  }
                }}
                placeholder={t('fileExplorer.folderNamePlaceholder')}
                disabled={creatingFolder}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="-mx-4 -mb-4 border-t bg-muted/50 px-4 py-3 rounded-b-xl flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolder(false)
                setNewFolderName('')
                setError(null)
              }}
              disabled={creatingFolder}
            >
              {t('fileExplorer.cancel')}
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || creatingFolder}
            >
              {creatingFolder ? t('fileExplorer.creating') : t('fileExplorer.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
