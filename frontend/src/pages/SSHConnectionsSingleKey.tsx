import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sshKeysAPI } from '../services/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Alert, AlertDescription } from '../components/ui/alert'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  Key,
  Copy,
  RefreshCw,
  Wifi,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getApiErrorDetail } from '../utils/apiErrors'
import { translateBackendKey } from '../utils/translateBackendKey'
import RemoteMachineCard from '../components/RemoteMachineCard'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'

interface StorageInfo {
  total: number
  total_formatted: string
  used: number
  used_formatted: string
  available: number
  available_formatted: string
  percent_used: number
  last_check?: string | null
}

interface SSHConnection {
  id: number
  ssh_key_id: number
  ssh_key_name: string
  host: string
  username: string
  port: number
  use_sftp_mode: boolean
  use_sudo: boolean
  default_path?: string
  ssh_path_prefix?: string
  mount_point?: string
  status: string
  last_test?: string
  last_success?: string
  error_message?: string
  storage?: StorageInfo | null
  created_at: string
}

interface ImportKeyPayload extends Record<string, unknown> {
  name: string
  private_key_path: string
  public_key_path: string
  description: string
}

interface DeployConnectionPayload extends Record<string, unknown> {
  host: string
  username: string
  port: number
  password: string
  use_sftp_mode: boolean
  default_path: string
  ssh_path_prefix: string
  mount_point: string
}

interface TestConnectionPayload extends Record<string, unknown> {
  host: string
  username: string
  port: number
}

interface UpdateConnectionPayload extends Record<string, unknown> {
  host: string
  username: string
  port: number
  use_sftp_mode: boolean
  use_sudo: boolean
  default_path: string
  ssh_path_prefix: string
  mount_point: string
}

export default function SSHConnectionsSingleKey() {
  const { t } = useTranslation()
  usePageTitle(t('sshConnections.title'))
  const queryClient = useQueryClient()
  const { track, EventCategory, EventAction } = useAnalytics()
  const { hasGlobalPermission } = useAuth()
  const canManageSsh = hasGlobalPermission('settings.ssh.manage')

  // State
  const [keyVisible, setKeyVisible] = useState(false)
  const [fingerprintVisible, setFingerprintVisible] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deployDialogOpen, setDeployDialogOpen] = useState(false)
  const [testConnectionDialogOpen, setTestConnectionDialogOpen] = useState(false)
  const [editConnectionDialogOpen, setEditConnectionDialogOpen] = useState(false)
  const [deleteConnectionDialogOpen, setDeleteConnectionDialogOpen] = useState(false)
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false)
  const [redeployKeyDialogOpen, setRedeployKeyDialogOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<SSHConnection | null>(null)
  const [keyType, setKeyType] = useState('ed25519')
  const [redeployPassword, setRedeployPassword] = useState('')
  const [importForm, setImportForm] = useState({
    name: 'System SSH Key',
    private_key_path: '',
    public_key_path: '',
    description: 'Imported system SSH key for all remote connections',
  })
  const [connectionForm, setConnectionForm] = useState({
    host: '',
    username: '',
    port: 22,
    password: '',
    use_sftp_mode: true,
    default_path: '',
    ssh_path_prefix: '',
    mount_point: '',
  })
  const [testConnectionForm, setTestConnectionForm] = useState({
    host: '',
    username: '',
    port: 22,
  })
  const [editConnectionForm, setEditConnectionForm] = useState({
    host: '',
    username: '',
    port: 22,
    use_sftp_mode: true,
    use_sudo: false,
    default_path: '',
    ssh_path_prefix: '',
    mount_point: '',
  })

  // Queries
  const { data: systemKeyData, isLoading: keyLoading } = useQuery({
    queryKey: ['system-ssh-key'],
    queryFn: sshKeysAPI.getSystemKey,
    enabled: canManageSsh,
    refetchInterval: 30000,
  })

  const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
    queryKey: ['ssh-connections'],
    queryFn: sshKeysAPI.getSSHConnections,
    enabled: canManageSsh,
    refetchInterval: 30000,
  })

  const systemKey = systemKeyData?.data?.ssh_key
  const keyExists = systemKeyData?.data?.exists
  const connections: SSHConnection[] = connectionsData?.data?.connections || []

  // Statistics
  const stats = {
    totalConnections: connections.length,
    activeConnections: connections.filter((c) => c.status === 'connected').length,
    failedConnections: connections.filter((c) => c.status === 'failed').length,
  }

  // Mutations
  const generateKeyMutation = useMutation({
    mutationFn: (data: { name: string; key_type: string; description?: string }) =>
      sshKeysAPI.generateSSHKey(data),
    onSuccess: () => {
      toast.success(t('sshConnections.toasts.keyGenerated'))
      queryClient.invalidateQueries({ queryKey: ['system-ssh-key'] })
      setGenerateDialogOpen(false)
      track(EventCategory.SSH, EventAction.CREATE, { resource: 'key' })
    },
    onError: (error: unknown) => {
      console.error('Failed to generate SSH key:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('sshConnections.toasts.keyGenerateFailed')
      )
    },
  })

  const importKeyMutation = useMutation({
    mutationFn: (data: ImportKeyPayload) => sshKeysAPI.importSSHKey(data),
    onSuccess: () => {
      toast.success(t('sshConnections.toasts.keyImported'))
      queryClient.invalidateQueries({ queryKey: ['system-ssh-key'] })
      setImportDialogOpen(false)
      setImportForm({
        name: 'System SSH Key',
        private_key_path: '',
        public_key_path: '',
        description: 'Imported system SSH key for all remote connections',
      })
      track(EventCategory.SSH, EventAction.UPLOAD, { resource: 'key' })
    },
    onError: (error: unknown) => {
      console.error('Failed to import SSH key:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('sshConnections.toasts.keyImportFailed')
      )
    },
  })

  const deployKeyMutation = useMutation({
    mutationFn: (data: { keyId: number; connectionData: DeployConnectionPayload }) =>
      sshKeysAPI.deploySSHKey(data.keyId, data.connectionData),
    onSuccess: () => {
      toast.success(t('sshConnections.toasts.keyDeployed'))
      queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      setDeployDialogOpen(false)
      setConnectionForm({
        host: '',
        username: '',
        port: 22,
        password: '',
        use_sftp_mode: true,
        default_path: '',
        ssh_path_prefix: '',
        mount_point: '',
      })
      track(EventCategory.SSH, EventAction.CREATE, { resource: 'connection' })
    },
    onError: (error: unknown) => {
      console.error('Failed to deploy SSH key:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('sshConnections.toasts.keyDeployFailed')
      )
    },
  })

  const testConnectionMutation = useMutation({
    mutationFn: (data: { keyId: number; connectionData: TestConnectionPayload }) =>
      sshKeysAPI.testSSHConnection(data.keyId, data.connectionData),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(t('sshConnections.toasts.connectionTestSuccess'))
        track(EventCategory.SSH, EventAction.TEST, { resource: 'connection' })
      } else {
        toast.error(t('sshConnections.toasts.connectionTestFailed'))
      }
      queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
    },
    onError: (error: unknown) => {
      console.error('Failed to test connection:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('sshConnections.toasts.connectionTestFailed')
      )
    },
  })

  const updateConnectionMutation = useMutation({
    mutationFn: (data: { connectionId: number; connectionData: UpdateConnectionPayload }) =>
      sshKeysAPI.updateSSHConnection(data.connectionId, data.connectionData),
    onSuccess: async (_response, variables) => {
      toast.success(t('sshConnections.toasts.connectionUpdated'))
      setEditConnectionDialogOpen(false)
      setSelectedConnection(null)
      track(EventCategory.SSH, EventAction.EDIT, { resource: 'connection' })

      // Automatically test the connection after update
      try {
        await sshKeysAPI.testExistingConnection(variables.connectionId)
        queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      } catch (error: unknown) {
        // Test failure is already shown in the connection status
        console.error('Failed to test connection:', error)
        queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      }
    },
    onError: (error: unknown) => {
      console.error('Failed to update connection:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('sshConnections.toasts.connectionUpdateFailed')
      )
    },
  })

  const deleteConnectionMutation = useMutation({
    mutationFn: (connectionId: number) => sshKeysAPI.deleteSSHConnection(connectionId),
    onSuccess: () => {
      toast.success(t('sshConnections.toasts.connectionDeleted'))
      queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      setDeleteConnectionDialogOpen(false)
      setSelectedConnection(null)
      track(EventCategory.SSH, EventAction.DELETE, { resource: 'connection' })
    },
    onError: (error: unknown) => {
      console.error('Failed to delete connection:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('sshConnections.toasts.connectionDeleteFailed')
      )
    },
  })

  const refreshStorageMutation = useMutation({
    mutationFn: (connectionId: number) => sshKeysAPI.refreshConnectionStorage(connectionId),
    onSuccess: () => {
      toast.success(t('sshConnections.toasts.storageRefreshed'))
      queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      track(EventCategory.SSH, EventAction.VIEW, { resource: 'storage' })
    },
    onError: (error: unknown) => {
      console.error('Failed to refresh storage:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('sshConnections.toasts.storageRefreshFailed')
      )
    },
  })

  const testExistingConnectionMutation = useMutation({
    mutationFn: (connectionId: number) => sshKeysAPI.testExistingConnection(connectionId),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(t('sshConnections.toasts.connectionTestSuccess'))
      } else {
        toast.error(
          translateBackendKey(response.data.error) ||
            t('sshConnections.toasts.connectionTestFailed')
        )
      }
      queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      track(EventCategory.SSH, EventAction.TEST, { resource: 'connection' })
    },
    onError: (error: unknown) => {
      console.error('Failed to test connection:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) ||
          t('sshConnections.toasts.connectionTestFailed')
      )
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: number) => sshKeysAPI.deleteSSHKey(keyId),
    onSuccess: () => {
      toast.success(t('sshConnections.toasts.keyDeleted'))
      queryClient.invalidateQueries({ queryKey: ['system-ssh-key'] })
      queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
      setDeleteKeyDialogOpen(false)
      track(EventCategory.SSH, EventAction.DELETE, { resource: 'key' })
    },
    onError: (error: unknown) => {
      console.error('Failed to delete SSH key:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('sshConnections.toasts.keyDeleteFailed')
      )
    },
  })

  const redeployKeyMutation = useMutation({
    mutationFn: ({ connectionId, password }: { connectionId: number; password: string }) =>
      sshKeysAPI.redeployKeyToConnection(connectionId, password),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(t('sshConnections.toasts.keyDeployed'))
        queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
        setRedeployKeyDialogOpen(false)
        setRedeployPassword('')
        track(EventCategory.SSH, EventAction.START, {
          resource: 'connection',
          operation: 'deploy_key',
        })
      } else {
        toast.error(
          translateBackendKey(response.data.error) || t('sshConnections.toasts.keyDeployFailed')
        )
      }
    },
    onError: (error: unknown) => {
      console.error('Failed to redeploy SSH key:', error)
      toast.error(
        translateBackendKey(getApiErrorDetail(error)) || t('sshConnections.toasts.keyDeployFailed')
      )
    },
  })

  // Auto-refresh storage for connections without storage info
  useEffect(() => {
    if (!canManageSsh) {
      return
    }
    if (connections && connections.length > 0) {
      const connectionsWithoutStorage = connections.filter((conn) => !conn.storage)

      if (connectionsWithoutStorage.length > 0) {
        // Refresh storage for each connection without storage (silently)
        connectionsWithoutStorage.forEach((conn) => {
          sshKeysAPI.refreshConnectionStorage(conn.id).catch(() => {
            // Silently fail - will show "No storage info" in card
          })
        })

        // Invalidate query after delay to show updated data
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })
        }, 2000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections?.length])

  if (!canManageSsh) {
    return <Navigate to="/dashboard" replace />
  }

  // Handlers
  const handleGenerateKey = () => {
    generateKeyMutation.mutate({
      name: 'System SSH Key',
      key_type: keyType,
      description: 'System SSH key for all remote connections',
    })
  }

  const handleImportKey = () => {
    importKeyMutation.mutate(importForm)
  }

  const handleCopyPublicKey = () => {
    if (systemKey?.public_key) {
      navigator.clipboard.writeText(systemKey.public_key)
      toast.success(t('sshConnections.toasts.publicKeyCopied'))
    }
  }

  const handleDeployKey = () => {
    if (!systemKey) return
    deployKeyMutation.mutate({
      keyId: systemKey.id,
      connectionData: connectionForm,
    })
  }

  const handleTestManualConnection = () => {
    if (!systemKey) return
    testConnectionMutation.mutate({
      keyId: systemKey.id,
      connectionData: testConnectionForm,
    })
    setTestConnectionDialogOpen(false)
    setTestConnectionForm({ host: '', username: '', port: 22 })
  }

  const handleEditConnection = (connection: SSHConnection) => {
    setSelectedConnection(connection)
    setEditConnectionForm({
      host: connection.host,
      username: connection.username,
      port: connection.port,
      use_sftp_mode: connection.use_sftp_mode,
      use_sudo: connection.use_sudo,
      default_path: connection.default_path || '',
      ssh_path_prefix: connection.ssh_path_prefix || '',
      mount_point: connection.mount_point || '',
    })
    setEditConnectionDialogOpen(true)
  }

  const handleUpdateConnection = () => {
    if (!selectedConnection) return
    updateConnectionMutation.mutate({
      connectionId: selectedConnection.id,
      connectionData: editConnectionForm,
    })
  }

  const handleDeleteConnection = (connection: SSHConnection) => {
    setSelectedConnection(connection)
    setDeleteConnectionDialogOpen(true)
  }

  const confirmDeleteConnection = () => {
    if (!selectedConnection) return
    deleteConnectionMutation.mutate(selectedConnection.id)
  }

  const handleTestConnection = (connection: SSHConnection) => {
    testExistingConnectionMutation.mutate(connection.id)
  }

  const handleDeployKeyToConnection = (connection: SSHConnection) => {
    setSelectedConnection(connection)
    setRedeployKeyDialogOpen(true)
  }

  const handleConfirmRedeployKey = () => {
    if (!selectedConnection || !redeployPassword) return
    redeployKeyMutation.mutate({
      connectionId: selectedConnection.id,
      password: redeployPassword,
    })
  }

  const handleDeleteKey = () => {
    if (!systemKey) return
    deleteKeyMutation.mutate(systemKey.id)
  }

  if (keyLoading || connectionsLoading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats band skeleton */}
        <div className="grid grid-cols-3 rounded-xl border border-border overflow-hidden mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`px-4 py-4 ${i < 2 ? 'border-r border-border' : ''}`}>
              <div className="flex items-center gap-1 mb-2">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-7 w-8" />
            </div>
          ))}
        </div>

        {/* System SSH Key card skeleton */}
        <div className="rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
            <Skeleton className="h-6 w-36 flex-1" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-col gap-4">
            <div><Skeleton className="h-3 w-12 mb-1" /><Skeleton className="h-4 w-20" /></div>
            <div><Skeleton className="h-3 w-20 mb-1" /><Skeleton className="h-4 w-3/5" /></div>
            <div><Skeleton className="h-3 w-18 mb-2" /><Skeleton className="h-14 w-full rounded-lg" /></div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-9 w-40 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Remote Connections section skeleton */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-full sm:w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] rounded-xl border border-border p-4 flex flex-col gap-3"
                style={{ opacity: Math.max(0.4, 1 - i * 0.2) }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-18" />
                </div>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-44" />
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-2">
                    {[0, 1].map((j) => (
                      <div key={j} className={`px-3 py-2 ${j === 0 ? 'border-r border-border' : ''}`}>
                        <Skeleton className="h-2 w-8 mb-1" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-border">
                    <div className="flex justify-between mb-1">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-8 w-8 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Alert style helpers removed — replaced by shadcn Alert component variants below

  const FormField = ({ label, children, helper, fieldId }: { label: string; children: React.ReactNode; helper?: string; fieldId?: string }) => (
    <div>
      <Label htmlFor={fieldId} className="text-xs font-semibold mb-1.5 block">{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">{t('sshConnections.title')}</h1>
          <span title={`${t('sshConnections.singleKeySystem.title')}: ${t('sshConnections.singleKeySystem.description')}`} className="cursor-help opacity-50">
            <Info size={16} />
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t('sshConnections.subtitle')}</p>
      </div>

      {/* Statistics Band */}
      {keyExists && (
        <div className="grid grid-cols-3 rounded-xl border border-border overflow-hidden mb-6">
          {[
            { label: t('sshConnections.stats.totalConnections'), value: stats.totalConnections, icon: <Wifi size={13} />, cls: 'text-foreground' },
            { label: t('sshConnections.stats.active'), value: stats.activeConnections, icon: <CheckCircle size={13} />, cls: 'text-primary' },
            { label: t('sshConnections.stats.failed'), value: stats.failedConnections, icon: <XCircle size={13} />, cls: 'text-destructive' },
          ].map((stat, i) => (
            <div key={stat.label} className={`px-3 sm:px-4 py-3 sm:py-4 ${i < 2 ? 'border-r border-border' : ''}`}>
              <div className="flex items-center gap-1 mb-1 sm:mb-1.5">
                <span className={`${stat.cls} opacity-75`}>{stat.icon}</span>
                <span className={`text-2xs font-bold uppercase tracking-wider whitespace-nowrap ${stat.cls} opacity-75`}>{stat.label}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums leading-none">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* System SSH Key Card */}
      <div className="rounded-xl border border-border p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
            <Key size={18} />
          </div>
          <p className="text-base font-semibold flex-1">{t('sshConnections.systemKey.title')}</p>
          {keyExists && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border border-primary/20 bg-primary/10 text-primary">
              <CheckCircle size={12} /> Active
            </span>
          )}
        </div>

        {!keyExists ? (
          <div>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{t('sshConnections.systemKey.noKey')}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setGenerateDialogOpen(true)} className="gap-1.5">
                <Plus size={18} />
                {t('sshConnections.systemKey.generate')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-1.5">
                <Key size={18} />
                {t('sshConnections.systemKey.import')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Key Type */}
            <div>
              <p className="text-xs text-muted-foreground">{t('sshConnections.systemKey.type')}</p>
              <p className="text-sm font-medium">{systemKey?.key_type?.toUpperCase() || 'Unknown'}</p>
            </div>

            {/* Fingerprint */}
            {systemKey?.fingerprint && (
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <p className="text-xs text-muted-foreground">{t('sshConnections.systemKey.fingerprint')}</p>
                  <button type="button" onClick={() => setFingerprintVisible((v) => !v)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors" title={fingerprintVisible ? 'Hide fingerprint' : 'Reveal fingerprint'}>
                    {fingerprintVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <p className="text-sm font-medium font-mono break-all transition-all" style={{ filter: fingerprintVisible ? 'none' : 'blur(4px)', userSelect: fingerprintVisible ? 'auto' : 'none' }}>
                  {systemKey.fingerprint}
                </p>
              </div>
            )}

            {/* Public Key */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-muted-foreground">{t('sshConnections.systemKey.publicKey')}</p>
                <button type="button" onClick={() => setKeyVisible((v) => !v)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors" title={keyVisible ? 'Hide key' : 'Reveal key'}>
                  {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <div className="relative bg-muted/30 p-3 pr-10 rounded-lg border border-border">
                <p className="text-xs font-mono break-all max-h-24 overflow-auto transition-all" style={{ filter: keyVisible ? 'none' : 'blur(4px)', userSelect: keyVisible ? 'auto' : 'none' }}>
                  {systemKey?.public_key || 'N/A'}
                </p>
                <button type="button" onClick={handleCopyPublicKey} title="Copy to clipboard" className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Copy size={15} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setDeployDialogOpen(true)} className="w-full sm:w-auto gap-1.5" aria-label="Automatically deploy SSH key using password authentication" title="Automatically deploy SSH key using password authentication">
                <Plus size={18} />
                {t('sshConnections.systemKey.actions.deploy')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setTestConnectionDialogOpen(true)} className="w-full sm:w-auto gap-1.5" aria-label="Add a connection for a manually deployed SSH key" title="Add a connection for a manually deployed SSH key">
                <Wifi size={18} />
                {t('sshConnections.systemKey.actions.addManual')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDeleteKeyDialogOpen(true)} className="w-full sm:w-auto gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10" title="Delete system SSH key (connections will be preserved)">
                <Trash2 size={18} />
                {t('sshConnections.systemKey.actions.delete')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Remote Connections */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-base font-bold leading-tight">{t('sshConnections.heading.remoteMachines')}</p>
              {connections.length > 0 && (
                <p className="text-xs text-muted-foreground">{connections.length} machine{connections.length !== 1 ? 's' : ''} configured</p>
              )}
            </div>
            {!keyExists && connections.length > 0 && (
              <span title={t('sshConnections.systemKey.noKey')} className="text-muted-foreground cursor-help">
                <Info size={18} />
              </span>
            )}
          </div>
          <button
            type="button"
            title="Refresh connections"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['ssh-connections'] })}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/10 px-6 py-10 text-center">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Wifi size={22} />
            </div>
            <p className="text-base font-semibold mb-1">{t('sshConnections.empty.title')}</p>
            <p className="text-sm text-muted-foreground">
              {keyExists
                ? t('sshConnections.empty.description')
                : t('sshConnections.empty.descriptionNoKey')}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 sm:gap-5">
            {connections.map((connection) => (
              <div key={connection.id} className="w-full sm:w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] min-w-0 flex">
                <RemoteMachineCard
                  machine={connection}
                  onEdit={handleEditConnection}
                  onDelete={handleDeleteConnection}
                  onRefreshStorage={(machine) => refreshStorageMutation.mutate(machine.id)}
                  onTestConnection={handleTestConnection}
                  onDeployKey={handleDeployKeyToConnection}
                  canManageConnections={canManageSsh}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Key Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={(open) => !open && setGenerateDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('sshConnections.generateDialog.title')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <Alert className="mb-0">
              <AlertDescription>
                This will generate a new SSH key pair for your system. You can only have one system key at a time.
              </AlertDescription>
            </Alert>
            <FormField label={t('sshConnections.generateDialog.keyType')} fieldId="generate-keytype">
              <select id="generate-keytype" value={keyType} onChange={(e) => setKeyType(e.target.value)} className="w-full rounded-md border border-input bg-background h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="ed25519">{t('sshConnections.generateDialog.ed25519')}</option>
                <option value="rsa">{t('sshConnections.generateDialog.rsa')}</option>
                <option value="ecdsa">{t('sshConnections.generateDialog.ecdsa')}</option>
              </select>
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerateKey} disabled={generateKeyMutation.isPending}>
                {generateKeyMutation.isPending ? t('sshConnections.generateDialog.generating') : t('sshConnections.generateDialog.generate')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Key Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => !open && setImportDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('sshConnections.importDialog.title')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <Alert className="mb-0">
              <AlertDescription>
                Import an existing SSH key from your filesystem (e.g., mounted volume). The key will be read from the specified paths and stored in the database.
              </AlertDescription>
            </Alert>
            <FormField label={t('sshConnections.importDialog.keyName')} fieldId="import-keyname">
              <Input id="import-keyname" value={importForm.name} onChange={(e) => setImportForm({ ...importForm, name: e.target.value })} placeholder="System SSH Key" className="h-9 text-sm" />
            </FormField>
            <FormField label={`${t('sshConnections.importDialog.privateKeyPath')} *`} helper={t('sshConnections.helpers.privateKeyPath')} fieldId="import-private-key-path">
              <Input id="import-private-key-path" value={importForm.private_key_path} onChange={(e) => setImportForm({ ...importForm, private_key_path: e.target.value })} placeholder="/home/borg/.ssh/id_ed25519 or /root/.ssh/id_rsa" className="h-9 text-sm" required />
            </FormField>
            <FormField label={t('sshConnections.importDialog.publicKeyPath')} helper={t('sshConnections.helpers.publicKeyPath')} fieldId="import-public-key-path">
              <Input id="import-public-key-path" value={importForm.public_key_path} onChange={(e) => setImportForm({ ...importForm, public_key_path: e.target.value })} placeholder="Leave empty to auto-detect (adds .pub to private key path)" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.importDialog.description')} fieldId="import-description">
              <textarea id="import-description" value={importForm.description} onChange={(e) => setImportForm({ ...importForm, description: e.target.value })} placeholder="Imported system SSH key" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleImportKey} disabled={importKeyMutation.isPending || !importForm.private_key_path}>
                {importKeyMutation.isPending ? t('sshConnections.importDialog.importing') : t('sshConnections.importDialog.import')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deploy Key Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={(open) => !open && setDeployDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('sshConnections.deployDialog.title')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <FormField label={t('sshConnections.deployDialog.host')} fieldId="deploy-host">
              <Input id="deploy-host" value={connectionForm.host} onChange={(e) => setConnectionForm({ ...connectionForm, host: e.target.value })} placeholder="192.168.1.100 or example.com" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.username')} fieldId="deploy-username">
              <Input id="deploy-username" value={connectionForm.username} onChange={(e) => setConnectionForm({ ...connectionForm, username: e.target.value })} placeholder="root" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.port')} fieldId="deploy-port">
              <Input id="deploy-port" type="number" value={connectionForm.port} onChange={(e) => setConnectionForm({ ...connectionForm, port: parseInt(e.target.value) })} className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.password')} fieldId="deploy-password">
              <div className="relative">
                <Input id="deploy-password" type="password" value={connectionForm.password} onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })} placeholder="Server password (for initial deployment)" className="h-9 text-sm pr-9" />
                <span title="The password is used to deploy your public key to the server's authorized_keys file. After deployment, you'll connect using the SSH key." className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground cursor-help">
                  <Info size={18} />
                </span>
              </div>
            </FormField>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={connectionForm.use_sftp_mode} onChange={(e) => setConnectionForm({ ...connectionForm, use_sftp_mode: e.target.checked })} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('sshConnections.deployDialog.sftpMode')}</p>
                <p className="text-xs text-muted-foreground">Required by Hetzner Storage Box. Disable for Synology NAS or older SSH servers.</p>
              </div>
            </label>
            <FormField label={t('sshConnections.deployDialog.defaultPath')} helper="Starting directory for SSH file browsing (e.g., /home for Hetzner Storage Box)" fieldId="deploy-default-path">
              <Input id="deploy-default-path" value={connectionForm.default_path} onChange={(e) => setConnectionForm({ ...connectionForm, default_path: e.target.value })} placeholder="/home" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.mountPoint')} helper="Friendly name for this remote machine (e.g., hetzner, backup-server)" fieldId="deploy-mount-point">
              <Input id="deploy-mount-point" value={connectionForm.mount_point} onChange={(e) => setConnectionForm({ ...connectionForm, mount_point: e.target.value })} placeholder="hetzner or homeserver" className="h-9 text-sm" />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDeployKey} disabled={deployKeyMutation.isPending || !connectionForm.host || !connectionForm.username || !connectionForm.password}>
                {deployKeyMutation.isPending ? t('sshConnections.deployDialog.deploying') : t('sshConnections.deployDialog.deploy')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Manual Connection Dialog */}
      <Dialog open={testConnectionDialogOpen} onOpenChange={(open) => !open && setTestConnectionDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('sshConnections.manualConnectionDialog.title')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <Alert className="mb-0">
              <AlertDescription>
                <p className="font-semibold mb-1">{t('sshConnections.manualConnectionDialog.instructions.title')}</p>
                <p className="text-xs mb-0.5">1. {t('sshConnections.manualConnectionDialog.instructions.step1')}</p>
                <p className="text-xs mb-0.5">2. {t('sshConnections.manualConnectionDialog.instructions.step2')}</p>
                <p className="text-xs">3. {t('sshConnections.manualConnectionDialog.instructions.step3')}</p>
              </AlertDescription>
            </Alert>
            <FormField label={t('sshConnections.deployDialog.host')} fieldId="test-conn-host">
              <Input id="test-conn-host" value={testConnectionForm.host} onChange={(e) => setTestConnectionForm({ ...testConnectionForm, host: e.target.value })} placeholder="192.168.1.100 or example.com" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.username')} fieldId="test-conn-username">
              <Input id="test-conn-username" value={testConnectionForm.username} onChange={(e) => setTestConnectionForm({ ...testConnectionForm, username: e.target.value })} placeholder="root" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.port')} fieldId="test-conn-port">
              <Input id="test-conn-port" type="number" value={testConnectionForm.port} onChange={(e) => setTestConnectionForm({ ...testConnectionForm, port: parseInt(e.target.value) })} className="h-9 text-sm" />
            </FormField>
            <Alert className="mb-0">
              <AlertDescription>
                This will test the connection and add it to your connections list if successful.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setTestConnectionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleTestManualConnection} disabled={testConnectionMutation.isPending || !testConnectionForm.host || !testConnectionForm.username}>
                {testConnectionMutation.isPending ? t('sshConnections.actions.testing') : t('sshConnections.manualConnectionDialog.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Connection Dialog */}
      <Dialog open={editConnectionDialogOpen} onOpenChange={(open) => { if (!open) { setEditConnectionDialogOpen(false); setSelectedConnection(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('sshConnections.editConnectionDialog.title')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <FormField label={t('sshConnections.deployDialog.host')} fieldId="edit-conn-host">
              <Input id="edit-conn-host" value={editConnectionForm.host} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, host: e.target.value })} placeholder="192.168.1.100 or example.com" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.username')} fieldId="edit-conn-username">
              <Input id="edit-conn-username" value={editConnectionForm.username} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, username: e.target.value })} placeholder="root" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.port')} fieldId="edit-conn-port">
              <Input id="edit-conn-port" type="number" value={editConnectionForm.port} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, port: parseInt(e.target.value) })} className="h-9 text-sm" />
            </FormField>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={editConnectionForm.use_sftp_mode} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, use_sftp_mode: e.target.checked })} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('sshConnections.deployDialog.sftpMode')}</p>
                <p className="text-xs text-muted-foreground">Required by Hetzner Storage Box. Disable for Synology NAS or older SSH servers.</p>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={editConnectionForm.use_sudo} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, use_sudo: e.target.checked })} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('sshConnections.deployDialog.useSudo')}</p>
                <p className="text-xs text-muted-foreground">{t('sshConnections.deployDialog.useSudoHint')}</p>
              </div>
            </label>
            <FormField label={t('sshConnections.deployDialog.defaultPath')} helper="Starting directory for SSH file browsing (e.g., /home for Hetzner Storage Box)" fieldId="edit-conn-default-path">
              <Input id="edit-conn-default-path" value={editConnectionForm.default_path} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, default_path: e.target.value })} placeholder="/home" className="h-9 text-sm" />
            </FormField>
            <FormField label={t('sshConnections.deployDialog.mountPoint')} helper="Friendly name for this remote machine (e.g., hetzner, backup-server)" fieldId="edit-conn-mount-point">
              <Input id="edit-conn-mount-point" value={editConnectionForm.mount_point} onChange={(e) => setEditConnectionForm({ ...editConnectionForm, mount_point: e.target.value })} placeholder="hetzner or homeserver" className="h-9 text-sm" />
            </FormField>
            <Alert className="mb-0">
              <AlertDescription>
                Update the connection details. You may want to test the connection after updating.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setEditConnectionDialogOpen(false); setSelectedConnection(null) }}>Cancel</Button>
              <Button onClick={handleUpdateConnection} disabled={updateConnectionMutation.isPending || !editConnectionForm.host || !editConnectionForm.username}>
                {updateConnectionMutation.isPending ? t('sshConnections.actions.updating') : t('sshConnections.editConnectionDialog.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Connection Dialog */}
      <AlertDialog open={deleteConnectionDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteConnectionDialogOpen(false); setSelectedConnection(null) } }}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sshConnections.deleteConnectionDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sshConnections.confirmations.deleteConnection')}</AlertDialogDescription>
          </AlertDialogHeader>
          {selectedConnection && (
            <div className="flex flex-col gap-1.5 text-sm">
              <p><strong>{t('sshConnections.deployDialog.host')}:</strong> {selectedConnection.host}</p>
              <p><strong>{t('sshConnections.deployDialog.username')}:</strong> {selectedConnection.username}</p>
              <p><strong>{t('sshConnections.deployDialog.port')}:</strong> {selectedConnection.port}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteConnectionDialogOpen(false); setSelectedConnection(null) }}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteConnection} disabled={deleteConnectionMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleteConnectionMutation.isPending ? t('sshConnections.actions.deleting') : t('sshConnections.deleteConnectionDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Redeploy Key Dialog */}
      <Dialog open={redeployKeyDialogOpen} onOpenChange={(open) => { if (!open) { setRedeployKeyDialogOpen(false); setSelectedConnection(null); setRedeployPassword('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('sshConnections.dialogs.deployTitle')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <Alert className="mb-0">
              <AlertDescription>
                This will deploy your current system SSH key to this connection. You'll need to provide the password to authenticate.
              </AlertDescription>
            </Alert>
            {selectedConnection && (
              <div className="p-3 rounded-xl bg-muted/30 text-sm flex flex-col gap-1">
                <p><strong>{t('sshConnections.deployDialog.host')}:</strong> {selectedConnection.host}</p>
                <p><strong>{t('sshConnections.deployDialog.username')}:</strong> {selectedConnection.username}</p>
                <p><strong>{t('sshConnections.deployDialog.port')}:</strong> {selectedConnection.port}</p>
              </div>
            )}
            <FormField label={t('sshConnections.deployDialog.password')} helper={t('sshConnections.helpers.passwordDeploy')} fieldId="redeploy-password">
              <Input id="redeploy-password" type="password" value={redeployPassword} onChange={(e) => setRedeployPassword(e.target.value)} placeholder="Enter SSH password" className="h-9 text-sm" />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setRedeployKeyDialogOpen(false); setSelectedConnection(null); setRedeployPassword('') }}>{t('common.cancel')}</Button>
              <Button onClick={handleConfirmRedeployKey} disabled={redeployKeyMutation.isPending || !redeployPassword}>
                {redeployKeyMutation.isPending ? t('sshConnections.actions.deploying') : t('sshConnections.dialogs.deployButton')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete SSH Key Dialog */}
      <AlertDialog open={deleteKeyDialogOpen} onOpenChange={(open) => !open && setDeleteKeyDialogOpen(false)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sshConnections.dialogs.deleteKeyTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sshConnections.deleteKeyDialog.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            {systemKey && (
              <div className="p-3 rounded-xl border border-border bg-muted/10 flex flex-col gap-1.5 text-sm">
                <p><strong>{t('sshConnections.fields.keyName')}:</strong> {systemKey.name}</p>
                <p><strong>{t('sshConnections.systemKey.type')}:</strong> {systemKey.key_type?.toUpperCase()}</p>
                <p><strong>{t('sshConnections.fields.activeConnections')}:</strong> {connections.length}</p>
                {systemKey.fingerprint && (
                  <p className="font-mono text-xs break-all"><strong>{t('sshConnections.systemKey.fingerprint')}:</strong> {systemKey.fingerprint}</p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">This action will:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-sm">
              <li>{t('sshConnections.deleteKeyDialog.warning1')}</li>
              <li>Mark {connections.length} connection(s) as failed</li>
              <li>Clear SSH key from any repositories using it</li>
            </ul>
            <Alert className="mb-0">
              <AlertDescription>{t('sshConnections.deleteKeyDialog.warning2')}</AlertDescription>
            </Alert>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteKeyDialogOpen(false)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} disabled={deleteKeyMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleteKeyMutation.isPending ? t('sshConnections.actions.deleting') : t('sshConnections.dialogs.deleteKeyButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
