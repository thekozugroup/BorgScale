import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Play,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Edit,
} from 'lucide-react'
import api from '../services/api'
import React from 'react'
import { toast } from 'react-hot-toast'
import DataTable, { Column, ActionButton } from './DataTable'
import { formatDateShort } from '../utils/dateUtils'
import { useTranslation } from 'react-i18next'
import { translateBackendKey } from '../utils/translateBackendKey'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PackageType {
  id: number
  name: string
  install_command: string
  description: string | null
  status: 'pending' | 'installed' | 'installing' | 'failed'
  install_log: string | null
  installed_at: string | null
  last_check: string | null
  created_at: string
  updated_at: string
}

interface InstallJobResponse {
  job_id: number
  message: string
  status: string
}

interface JobStatusType {
  id: number
  package_id: number
  status: 'pending' | 'installing' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  exit_code: number | null
  stdout: string | null
  stderr: string | null
  error_message: string | null
}

const STATUS_BADGE: Record<string, string> = {
  installed: 'bg-primary/10 text-primary border-primary/20',
  pending: 'bg-muted text-muted-foreground border-border',
  installing: 'bg-secondary text-secondary-foreground border-border',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default function PackagesTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackPackage, EventAction } = useAnalytics()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null)
  const [deleteConfirmPackage, setDeleteConfirmPackage] = useState<PackageType | null>(null)
  const [activeJobId, setActiveJobId] = useState<number | null>(null)
  const [activeJobOperation, setActiveJobOperation] = useState<'install' | 'reinstall' | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusType | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  const [packageForm, setPackageForm] = useState({
    name: '',
    install_command: '',
    description: '',
  })
  const [advancedMode, setAdvancedMode] = useState(false)

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const response = await api.get('/packages/')
      return response.data
    },
  })
  const packages = useMemo(
    () => (Array.isArray(packagesData) ? (packagesData as PackageType[]) : []),
    [packagesData]
  )

  useEffect(() => {
    if (!activeJobId) return

    const pollJobStatus = async () => {
      try {
        const response = await api.get(`/packages/jobs/${activeJobId}`)
        const status: JobStatusType = response.data
        setJobStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          const trackedPackage = packages.find((pkg: PackageType) => pkg.id === status.package_id)
          trackPackage(
            status.status === 'completed' ? EventAction.COMPLETE : EventAction.FAIL,
            trackedPackage?.name,
            {
              operation: activeJobOperation ?? 'install',
              job_id: status.id,
              exit_code: status.exit_code,
              error_present: !!(status.error_message || status.stderr),
            }
          )
          setActiveJobId(null)
          setActiveJobOperation(null)
          setShowResultDialog(true)
          queryClient.invalidateQueries({ queryKey: ['packages'] })
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error)
        setActiveJobId(null)
        setActiveJobOperation(null)
      }
    }

    pollJobStatus()
    const interval = setInterval(pollJobStatus, 2000)
    return () => clearInterval(interval)
  }, [activeJobId, activeJobOperation, packages, queryClient, trackPackage, EventAction])

  const createPackageMutation = useMutation({
    mutationFn: async (data: typeof packageForm) => {
      const response = await api.post('/packages/', data)
      return response.data
    },
    onSuccess: () => {
      toast.success(t('packages.toasts.addedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      setShowCreateDialog(false)
      setPackageForm({ name: '', install_command: '', description: '' })
      trackPackage(EventAction.CREATE, packageForm.name, { advanced_mode: advancedMode })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('packages.toasts.addFailed')
      )
    },
  })

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof packageForm }) => {
      const response = await api.put(`/packages/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success(t('packages.toasts.updatedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      setEditingPackage(null)
      setPackageForm({ name: '', install_command: '', description: '' })
      setAdvancedMode(false)
      trackPackage(EventAction.EDIT, packageForm.name, { advanced_mode: advancedMode })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('packages.toasts.updateFailed')
      )
    },
  })

  const installPackageMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const response = await api.post(`/packages/${packageId}/install`)
      return response.data
    },
    onSuccess: (data: InstallJobResponse) => {
      toast.success(translateBackendKey(data.message))
      setActiveJobId(data.job_id)
      setActiveJobOperation('install')
      setJobStatus(null)
      queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('packages.toasts.fixFailed')
      )
    },
  })

  const deletePackageMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const response = await api.delete(`/packages/${packageId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success(t('packages.toasts.removedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      setDeleteConfirmPackage(null)
      trackPackage(EventAction.DELETE, deleteConfirmPackage?.name)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('packages.toasts.removeFailed')
      )
    },
  })

  const reinstallPackageMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const response = await api.post(`/packages/${packageId}/reinstall`)
      return response.data
    },
    onSuccess: (data: InstallJobResponse) => {
      toast.success(translateBackendKey(data.message))
      setActiveJobId(data.job_id)
      setActiveJobOperation('reinstall')
      setJobStatus(null)
      queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('packages.toasts.reinstallFailed')
      )
    },
  })

  const handleOpenEdit = (pkg: PackageType) => {
    setEditingPackage(pkg)
    setPackageForm({
      name: pkg.name,
      install_command: pkg.install_command,
      description: pkg.description || '',
    })
    const autoGeneratedCommand = `sudo apt-get update && sudo apt-get install -y ${pkg.name}`
    setAdvancedMode(pkg.install_command !== autoGeneratedCommand)
    trackPackage(EventAction.VIEW, pkg.name, { source: 'edit_dialog' })
  }

  const handleCloseDialog = () => {
    setShowCreateDialog(false)
    setEditingPackage(null)
    setAdvancedMode(false)
    setPackageForm({ name: '', install_command: '', description: '' })
  }

  const handleSubmitPackage = (e: React.FormEvent) => {
    e.preventDefault()
    const finalPackageData = {
      ...packageForm,
      install_command: advancedMode
        ? packageForm.install_command
        : `sudo apt-get update && sudo apt-get install -y ${packageForm.name}`,
    }
    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id, data: finalPackageData })
    } else {
      createPackageMutation.mutate(finalPackageData)
    }
  }

  const statusIcons = {
    installed: <CheckCircle size={14} />,
    pending: <Clock size={14} />,
    installing: <Loader2 size={14} className="animate-spin" />,
    failed: <XCircle size={14} />,
  }

  const statusLabels: Record<string, string> = {
    installed: t('packages.status.installed'),
    pending: t('packages.status.pending'),
    installing: t('packages.status.installing'),
    failed: t('packages.status.failed'),
  }

  const columns: Column<PackageType>[] = [
    {
      id: 'name',
      label: t('packages.columns.package'),
      render: (pkg) => (
        <div>
          <p className="text-sm font-medium">{pkg.name}</p>
          {pkg.description && (
            <p className="text-xs text-muted-foreground">{pkg.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      label: t('packages.columns.status'),
      render: (pkg) => (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
            STATUS_BADGE[pkg.status] ?? STATUS_BADGE.pending
          )}
        >
          {statusIcons[pkg.status]}
          {statusLabels[pkg.status] ?? pkg.status}
        </span>
      ),
    },
    {
      id: 'installed_at',
      label: t('packages.columns.installed'),
      render: (pkg) => (
        <span className="text-sm text-muted-foreground">
          {pkg.installed_at ? formatDateShort(pkg.installed_at) : '-'}
        </span>
      ),
    },
  ]

  const actions: ActionButton<PackageType>[] = [
    {
      icon: <Play size={16} />,
      label: t('packages.actions.install'),
      onClick: (pkg) => {
        trackPackage(EventAction.START, pkg.name, { operation: 'install' })
        installPackageMutation.mutate(pkg.id)
      },
      color: 'primary',
      tooltip: t('packages.actions.installTooltip'),
      show: (pkg) => pkg.status === 'pending' || pkg.status === 'failed',
    },
    {
      icon: <RefreshCw size={16} />,
      label: t('packages.actions.reinstall'),
      onClick: (pkg) => {
        trackPackage(EventAction.START, pkg.name, { operation: 'reinstall' })
        reinstallPackageMutation.mutate(pkg.id)
      },
      color: 'warning',
      tooltip: t('packages.actions.reinstallTooltip'),
      show: (pkg) => pkg.status === 'installed',
    },
    {
      icon: <Edit size={16} />,
      label: t('packages.actions.edit'),
      onClick: handleOpenEdit,
      color: 'default',
      tooltip: t('packages.actions.editTooltip'),
      show: (pkg) => pkg.status !== 'installing',
    },
    {
      icon: <Trash2 size={16} />,
      label: t('packages.actions.delete'),
      onClick: setDeleteConfirmPackage,
      color: 'error',
      tooltip: t('packages.actions.deleteTooltip'),
      show: (pkg) => pkg.status !== 'installing',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <p className="text-lg font-semibold mb-1">{t('packages.title')}</p>
        <p className="text-sm text-muted-foreground">{t('packages.subtitle')}</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-6 border border-border bg-muted/40 text-muted-foreground">
        {t('packages.hint')}
      </div>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
        <p className="text-base font-semibold">{t('packages.installedPackages')}</p>
        <Button
          onClick={() => {
            setShowCreateDialog(true)
            trackPackage(EventAction.VIEW, undefined, { source: 'create_dialog' })
          }}
          className="w-full sm:w-auto gap-1.5"
        >
          <Plus size={16} />
          {t('packages.addPackage')}
        </Button>
      </div>

      <DataTable
        data={packages}
        columns={columns}
        actions={actions}
        getRowKey={(pkg) => pkg.id}
        loading={isLoading}
        emptyState={{
          icon: <Package size={48} />,
          title: t('packages.empty'),
          description: t('packages.emptyDesc'),
        }}
        variant="outlined"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingPackage} onOpenChange={(v) => !v && handleCloseDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? t('packages.createDialog.titleEdit') : t('packages.createDialog.titleAdd')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPackage} className="flex flex-col gap-4 pt-2">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('packages.fields.packageName')}</Label>
              <Input
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                required
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {advancedMode
                  ? t('packages.fields.packageNameHintAdvanced')
                  : t('packages.fields.packageNameHintSimple')}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
              />
              <span className="text-sm">{t('packages.fields.advancedMode')}</span>
            </label>

            {advancedMode && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">{t('packages.fields.installCommand')}</Label>
                <textarea
                  value={packageForm.install_command}
                  onChange={(e) => setPackageForm({ ...packageForm, install_command: e.target.value })}
                  required={advancedMode}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('packages.fields.installCommandHint')}</p>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">{t('packages.fields.description')}</Label>
              <Input
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('packages.fields.descriptionHint')}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseDialog}>
                {t('common.buttons.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                className="gap-1.5"
              >
                {(createPackageMutation.isPending || updatePackageMutation.isPending) && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                {editingPackage
                  ? updatePackageMutation.isPending
                    ? t('packages.buttons.updating')
                    : t('packages.buttons.updatePackage')
                  : createPackageMutation.isPending
                    ? t('packages.buttons.adding')
                    : t('packages.buttons.addPackage')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmPackage} onOpenChange={(v) => !v && setDeleteConfirmPackage(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('packages.deleteDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-sm">
              {t('packages.deleteDialog.message', { name: deleteConfirmPackage?.name })}
            </p>
            <p className="text-sm text-muted-foreground">{t('packages.deleteDialog.note')}</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmPackage(null)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteConfirmPackage && deletePackageMutation.mutate(deleteConfirmPackage.id)}
                disabled={deletePackageMutation.isPending}
                className="gap-1.5"
              >
                {deletePackageMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                {deletePackageMutation.isPending
                  ? t('packages.deleteDialog.deleting')
                  : t('packages.deleteDialog.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={(v) => !v && setShowResultDialog(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                {jobStatus?.status === 'completed' ? (
                  <>
                    <CheckCircle size={20} className="text-primary" />
                    {t('packages.resultDialog.successful')}
                  </>
                ) : jobStatus?.status === 'failed' ? (
                  <>
                    <XCircle size={20} className="text-destructive" />
                    {t('packages.resultDialog.failed')}
                  </>
                ) : (
                  <>
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    {t('packages.resultDialog.installing')}
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            {jobStatus?.error_message && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm border border-destructive/25 bg-destructive/10 text-destructive">
                {jobStatus.error_message}
              </div>
            )}

            {jobStatus?.status === 'installing' && (
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('packages.resultDialog.installingDesc')}</p>
              </div>
            )}

            {jobStatus?.stdout && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t('packages.resultDialog.stdout')}</p>
                <div className="p-3 rounded-xl overflow-auto max-h-72 bg-foreground">
                  <pre className="text-sm whitespace-pre-wrap break-words m-0 text-background font-mono">
                    {jobStatus.stdout}
                  </pre>
                </div>
              </div>
            )}

            {jobStatus?.stderr && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t('packages.resultDialog.stderr')}</p>
                <div className="p-3 rounded-xl overflow-auto max-h-72 bg-foreground">
                  <pre className="text-sm whitespace-pre-wrap break-words m-0 text-destructive font-mono">
                    {jobStatus.stderr}
                  </pre>
                </div>
              </div>
            )}

            {jobStatus?.exit_code !== null && jobStatus?.exit_code !== undefined && (
              <span
                className={cn(
                  'self-start inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
                  jobStatus.exit_code === 0
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20'
                )}
              >
                {t('packages.resultDialog.exitCode', { code: jobStatus.exit_code })}
              </span>
            )}

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={() => { setShowResultDialog(false); setJobStatus(null) }}
                disabled={jobStatus?.status === 'installing'}
                className="gap-1.5"
              >
                {jobStatus?.status === 'installing' && <Loader2 size={13} className="animate-spin" />}
                {jobStatus?.status === 'installing'
                  ? t('packages.resultDialog.installing')
                  : t('packages.resultDialog.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
