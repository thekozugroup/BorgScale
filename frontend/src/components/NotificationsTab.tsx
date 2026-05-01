import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bell, Info, ExternalLink, Archive, RotateCcw, Settings, Loader2 } from 'lucide-react'
import { notificationsAPI, repositoriesAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import { translateBackendKey } from '../utils/translateBackendKey'
import { Repository } from '../types'
import MultiRepositorySelector from './MultiRepositorySelector'
import { useAnalytics } from '../hooks/useAnalytics'
import NotificationCard from './NotificationCard'
import ResponsiveDialog from './ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NotificationSetting {
  id: number
  name: string
  service_url: string
  enabled: boolean
  title_prefix: string | null
  include_job_name_in_title: boolean
  notify_on_backup_start: boolean
  notify_on_backup_success: boolean
  notify_on_backup_warning: boolean
  notify_on_backup_failure: boolean
  notify_on_restore_success: boolean
  notify_on_restore_failure: boolean
  notify_on_check_success: boolean
  notify_on_check_failure: boolean
  notify_on_schedule_failure: boolean
  monitor_all_repositories: boolean
  repositories: Repository[]
  created_at: string
  updated_at: string
  last_used_at: string | null
}

const NotificationsTab: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackNotifications, EventAction } = useAnalytics()
  const [showDialog, setShowDialog] = useState(false)
  const [editingNotification, setEditingNotification] = useState<NotificationSetting | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<NotificationSetting | null>(null)
  const [testing, setTesting] = useState<number | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    service_url: '',
    enabled: true,
    title_prefix: '',
    include_job_name_in_title: false,
    notify_on_backup_start: false,
    notify_on_backup_success: false,
    notify_on_backup_warning: false,
    notify_on_backup_failure: true,
    notify_on_restore_success: false,
    notify_on_restore_failure: true,
    notify_on_check_success: false,
    notify_on_check_failure: true,
    notify_on_schedule_failure: true,
    monitor_all_repositories: true,
    repository_ids: [] as number[],
  })

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsAPI.list()
      return response.data
    },
  })

  // Fetch repositories for filtering
  const { data: repositoriesData } = useQuery({
    queryKey: ['repositories'],
    queryFn: repositoriesAPI.list,
  })

  const repositories = repositoriesData?.data?.repositories || []

  // Create notification
  const createMutation = useMutation({
    mutationFn: notificationsAPI.create,
    onSuccess: () => {
      toast.success(t('notifications.serviceAddedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setShowDialog(false)
      trackNotifications(EventAction.CREATE, {
        enabled: formData.enabled,
        monitor_all_repositories: formData.monitor_all_repositories,
        repository_count: formData.repository_ids.length,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('notifications.failedToAdd')
      )
    },
  })

  // Update notification
  const updateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, data }: { id: number; data: any }) => notificationsAPI.update(id, data),
    onSuccess: () => {
      toast.success(t('notifications.serviceUpdatedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setShowDialog(false)
      trackNotifications(EventAction.EDIT, {
        enabled: formData.enabled,
        monitor_all_repositories: formData.monitor_all_repositories,
        repository_count: formData.repository_ids.length,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('notifications.failedToUpdate')
      )
    },
  })

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: notificationsAPI.delete,
    onSuccess: () => {
      toast.success(t('notifications.serviceDeletedSuccessfully'))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setDeleteConfirm(null)
      trackNotifications(EventAction.DELETE, {})
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('notifications.failedToDelete')
      )
    },
  })

  // Test notification
  const testMutation = useMutation({
    mutationFn: (serviceUrl: string) => notificationsAPI.test(serviceUrl),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(t('notifications.testSentSuccessfully'))
      } else {
        toast.error(
          translateBackendKey(response.data.message) || t('notifications.failedToSendTest')
        )
      }
      setTesting(null)
      trackNotifications(EventAction.TEST, { success: !!response.data.success })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('notifications.failedToTest')
      )
      setTesting(null)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      service_url: '',
      enabled: true,
      title_prefix: '',
      include_job_name_in_title: false,
      notify_on_backup_start: false,
      notify_on_backup_success: false,
      notify_on_backup_warning: false,
      notify_on_backup_failure: true,
      notify_on_restore_success: false,
      notify_on_restore_failure: true,
      notify_on_check_success: false,
      notify_on_check_failure: true,
      notify_on_schedule_failure: true,
      monitor_all_repositories: true,
      repository_ids: [],
    })
  }

  const openEditDialog = (notification: NotificationSetting) => {
    setEditingNotification(notification)
    setFormData({
      name: notification.name,
      service_url: notification.service_url,
      enabled: notification.enabled,
      title_prefix: notification.title_prefix || '',
      include_job_name_in_title: notification.include_job_name_in_title || false,
      notify_on_backup_start: notification.notify_on_backup_start,
      notify_on_backup_success: notification.notify_on_backup_success,
      notify_on_backup_warning: notification.notify_on_backup_warning,
      notify_on_backup_failure: notification.notify_on_backup_failure,
      notify_on_restore_success: notification.notify_on_restore_success,
      notify_on_restore_failure: notification.notify_on_restore_failure,
      notify_on_check_success: notification.notify_on_check_success,
      notify_on_check_failure: notification.notify_on_check_failure,
      notify_on_schedule_failure: notification.notify_on_schedule_failure,
      monitor_all_repositories: notification.monitor_all_repositories,
      repository_ids: Array.isArray(notification.repositories)
        ? notification.repositories.map((r) => r.id)
        : [],
    })
    setShowDialog(true)
  }

  const handleDuplicate = (notification: NotificationSetting) => {
    // Clear editing state so it creates a new notification
    setEditingNotification(null)
    // Copy all settings and append "(Copy)" to the name
    setFormData({
      name: `${notification.name} (Copy)`,
      service_url: notification.service_url,
      enabled: notification.enabled,
      title_prefix: notification.title_prefix || '',
      include_job_name_in_title: notification.include_job_name_in_title || false,
      notify_on_backup_start: notification.notify_on_backup_start,
      notify_on_backup_success: notification.notify_on_backup_success,
      notify_on_backup_warning: notification.notify_on_backup_warning,
      notify_on_backup_failure: notification.notify_on_backup_failure,
      notify_on_restore_success: notification.notify_on_restore_success,
      notify_on_restore_failure: notification.notify_on_restore_failure,
      notify_on_check_success: notification.notify_on_check_success,
      notify_on_check_failure: notification.notify_on_check_failure,
      notify_on_schedule_failure: notification.notify_on_schedule_failure,
      monitor_all_repositories: notification.monitor_all_repositories,
      repository_ids: Array.isArray(notification.repositories)
        ? notification.repositories.map((r) => r.id)
        : [],
    })
    setShowDialog(true)
    trackNotifications(EventAction.VIEW, {
      source: 'duplicate',
      repository_count: notification.repositories.length,
    })
  }

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.service_url.trim()) {
      toast.error(t('notifications.nameAndUrlRequired'))
      return
    }

    if (editingNotification) {
      updateMutation.mutate({ id: editingNotification.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleTest = (notification: NotificationSetting) => {
    setTesting(notification.id)
    testMutation.mutate(notification.service_url)
  }

  const notifications = notificationsData || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-base font-semibold">{t('notifications.title')}</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(true)}
                    className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground rounded"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t('notifications.serviceUrlExamples')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">{t('notifications.subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setEditingNotification(null)
            setShowDialog(true)
            trackNotifications(EventAction.VIEW, { source: 'create_dialog' })
          }}
          className="w-full sm:w-auto"
        >
          <Plus size={18} className="mr-1" />
          {t('notifications.addService')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden"
              style={{ opacity: Math.max(0.4, 1 - i * 0.2) }}
            >
              <div className="px-4 pt-4 pb-3">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 mb-1" style={{ width: [120, 160, 100][i] }} />
                    <Skeleton className="h-3" style={{ width: [200, 170, 220][i] }} />
                  </div>
                  <Skeleton className="h-5 w-5 rounded shrink-0" />
                </div>
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-border overflow-hidden mb-3">
                  {[0, 1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className={`px-3 py-2 ${j < 3 ? 'border-r border-border' : ''}`}
                    >
                      <Skeleton className="h-2 w-10 mb-1" />
                      <Skeleton className="h-3" style={{ width: [55, 45, 60, 50][j] }} />
                    </div>
                  ))}
                </div>
                {/* Tags row */}
                <div className="flex gap-2 mb-3">
                  {[52, 56, 46, 62].map((w, j) => (
                    <Skeleton key={j} className="h-5 rounded" style={{ width: w }} />
                  ))}
                </div>
                {/* Actions row */}
                <div className="flex items-center gap-1 pt-3 border-t border-border">
                  {[0, 1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-8 w-8 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <Bell size={48} className="opacity-30 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-1">{t('notifications.noServicesTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('notifications.noServicesSubtitle')}
          </p>
          <Button
            onClick={() => {
              resetForm()
              setEditingNotification(null)
              setShowDialog(true)
            }}
          >
            <Plus size={18} className="mr-1" />
            {t('notifications.addService')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification: NotificationSetting) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onTest={() => handleTest(notification)}
              onEdit={() => openEditDialog(notification)}
              onDuplicate={() => handleDuplicate(notification)}
              onDelete={() => setDeleteConfirm(notification)}
              isTesting={testing === notification.id}
            />
          ))}
        </div>
      )}

      {/* Service URL Info Modal */}
      <ResponsiveDialog
        open={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <div className="p-4">
          <h2 className="text-base font-medium leading-none mb-1">{t('notifications.appriseUrlExamplesTitle')}</h2>
          <p className="text-sm text-muted-foreground mb-3 mt-2">
            {t('notifications.alertDescription')}
          </p>
          <div className="font-mono text-xs bg-foreground text-background p-3 rounded-lg border border-border overflow-auto leading-relaxed">
            {[
              {
                label: t('notifications.exampleEmailGmail'),
                value: 'mailto://user:app_password@gmail.com?smtp=smtp.gmail.com&mode=starttls',
              },
              { label: t('notifications.exampleSlack'), value: 'slack://TokenA/TokenB/TokenC/' },
              {
                label: t('notifications.exampleDiscord'),
                value: 'discord://webhook_id/webhook_token',
              },
              { label: t('notifications.exampleTelegram'), value: 'tgram://bot_token/chat_id' },
              {
                label: t('notifications.exampleMicrosoftTeams'),
                value: 'msteams://TokenA/TokenB/TokenC/',
              },
              { label: t('notifications.examplePushover'), value: 'pover://user@token' },
              { label: t('notifications.exampleNtfy'), value: 'ntfy://topic/' },
              {
                label: t('notifications.exampleCustomWebhook'),
                value: 'json://hostname/path/to/endpoint',
              },
            ].map(({ label, value }) => (
              <div key={value}>
                <span className="text-background/50">{label} </span>
                <span>{value}</span>
              </div>
            ))}
          </div>
          <a
            href="https://github.com/caronc/apprise/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-3 text-sm underline underline-offset-2 hover:text-foreground text-muted-foreground"
          >
            <ExternalLink size={14} />
            {t('notifications.fullAppriseDocumentation')}
          </a>
        </div>
      </ResponsiveDialog>

      {/* Add/Edit Dialog */}
      <ResponsiveDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="sm"
        fullWidth
        footer={
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('notifications.cancel')}
            </Button>
            <div className="flex-1" />
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 size={16} className="animate-spin mr-1" />
              ) : null}
              {editingNotification ? t('notifications.update') : t('notifications.add')}
            </Button>
          </div>
        }
      >
        <div className="p-4">
          <h2 className="text-base font-medium leading-none mb-1">
            {editingNotification
              ? t('notifications.editService')
              : t('notifications.addService')}
          </h2>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notif-name">{t('notifications.form.serviceName')} *</Label>
              <Input
                id="notif-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('notifications.form.serviceNamePlaceholder')}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-url">{t('notifications.form.serviceUrl')} *</Label>
              <Input
                id="notif-url"
                value={formData.service_url}
                onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
                placeholder={t('notifications.form.serviceUrlPlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('notifications.form.serviceUrlHelper')}
              </p>
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm text-muted-foreground">
              <strong>{t('notifications.form.tipLabel')}</strong>{' '}
              {t('notifications.form.tipText')}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-prefix">{t('notifications.form.titlePrefix')}</Label>
              <Input
                id="notif-prefix"
                value={formData.title_prefix}
                onChange={(e) => setFormData({ ...formData, title_prefix: e.target.value })}
                placeholder={t('notifications.form.titlePrefixPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('notifications.form.titlePrefixHelper')}
              </p>
            </div>

            <div className="flex items-center gap-3 py-1">
              <Switch
                id="notif-enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="notif-enabled">{t('notifications.form.enableNotifications')}</Label>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium">{t('notifications.form.notificationEnhancements')}</p>
              <div className="flex items-center gap-3">
                <Switch
                  id="notif-job-name"
                  checked={formData.include_job_name_in_title}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, include_job_name_in_title: checked })
                  }
                />
                <div>
                  <Label htmlFor="notif-job-name">{t('notifications.form.includeJobName')}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('notifications.form.includeJobNameHelper')}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm font-medium pt-1">{t('notifications.form.notifyOn')}</p>

            {/* Backup Events Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Archive size={16} />
                <span className="text-sm font-semibold text-muted-foreground">
                  {t('notifications.category.backupEvents')}
                </span>
              </div>
              <div className="pl-5 space-y-2">
                {[
                  {
                    id: 'notif-backup-start',
                    key: 'notify_on_backup_start' as const,
                    label: t('notifications.form.started'),
                  },
                  {
                    id: 'notif-backup-success',
                    key: 'notify_on_backup_success' as const,
                    label: t('notifications.form.success'),
                  },
                  {
                    id: 'notif-backup-warning',
                    key: 'notify_on_backup_warning' as const,
                    label: t('notifications.form.warning'),
                  },
                  {
                    id: 'notif-backup-failure',
                    key: 'notify_on_backup_failure' as const,
                    label: t('notifications.form.failure'),
                  },
                ].map(({ id, key, label }) => (
                  <div key={id} className="flex items-center gap-3">
                    <Switch
                      id={id}
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Restore Events Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RotateCcw size={16} />
                <span className="text-sm font-semibold text-muted-foreground">
                  {t('notifications.category.restoreEvents')}
                </span>
              </div>
              <div className="pl-5 space-y-2">
                {[
                  {
                    id: 'notif-restore-success',
                    key: 'notify_on_restore_success' as const,
                    label: t('notifications.form.success'),
                  },
                  {
                    id: 'notif-restore-failure',
                    key: 'notify_on_restore_failure' as const,
                    label: t('notifications.form.failure'),
                  },
                ].map(({ id, key, label }) => (
                  <div key={id} className="flex items-center gap-3">
                    <Switch
                      id={id}
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Check Jobs Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Settings size={16} />
                <span className="text-sm font-semibold text-muted-foreground">
                  {t('notifications.category.checkJobs')}
                </span>
              </div>
              <div className="pl-5 space-y-2">
                {[
                  {
                    id: 'notif-check-success',
                    key: 'notify_on_check_success' as const,
                    label: t('notifications.form.success'),
                  },
                  {
                    id: 'notif-check-failure',
                    key: 'notify_on_check_failure' as const,
                    label: t('notifications.form.failure'),
                  },
                ].map(({ id, key, label }) => (
                  <div key={id} className="flex items-center gap-3">
                    <Switch
                      id={id}
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* System Events Category */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Settings size={16} />
                <span className="text-sm font-semibold text-muted-foreground">
                  {t('notifications.category.systemEvents')}
                </span>
              </div>
              <div className="pl-5 space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="notif-schedule-failure"
                    checked={formData.notify_on_schedule_failure}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notify_on_schedule_failure: checked })
                    }
                  />
                  <div>
                    <Label htmlFor="notif-schedule-failure">
                      {t('notifications.form.schedulerErrors')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('notifications.form.schedulerErrorsHelper')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Repository Filter Section */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm font-medium">{t('notifications.form.applyToRepositories')}</p>
              <RadioGroup
                value={formData.monitor_all_repositories ? 'all' : 'selected'}
                onValueChange={(val) =>
                  setFormData({ ...formData, monitor_all_repositories: val === 'all' })
                }
                className="gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="repo-all" />
                  <Label htmlFor="repo-all">
                    {t('notifications.form.allRepositories')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="selected" id="repo-selected" />
                  <Label htmlFor="repo-selected">
                    {t('notifications.form.selectedRepositoriesOnly')}
                  </Label>
                </div>
              </RadioGroup>

              {!formData.monitor_all_repositories && (
                <div className="mt-2">
                  <MultiRepositorySelector
                    repositories={repositories || []}
                    selectedIds={formData.repository_ids}
                    onChange={(ids) => setFormData({ ...formData, repository_ids: ids })}
                    label={t('notifications.form.selectRepositories')}
                    placeholder={t('notifications.form.selectRepositoriesPlaceholder')}
                    helperText={t('notifications.form.selectRepositoriesHelper')}
                    allowReorder={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <ResponsiveDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        footer={
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t('notifications.cancel')}
            </Button>
            <div className="flex-1" />
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 size={16} className="animate-spin mr-1" />
              ) : null}
              {t('notifications.delete')}
            </Button>
          </div>
        }
      >
        <div className="p-4">
          <h2 className="text-base font-medium leading-none mb-1">{t('notifications.deleteServiceTitle')}</h2>
          <p className="mt-2 text-sm">
            {t('notifications.confirmDelete.messagePrefix')}{' '}
            <strong>{deleteConfirm?.name}</strong>
            {t('notifications.confirmDelete.messageSuffix')}
          </p>
        </div>
      </ResponsiveDialog>
    </div>
  )
}

export default NotificationsTab
