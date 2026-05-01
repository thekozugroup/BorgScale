import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Trash2, AlertTriangle, HardDrive, Loader2 } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import { settingsAPI } from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LogStorage {
  total_size_mb: number
  file_count: number
  oldest_log_date: string | null
  newest_log_date: string | null
  usage_percent: number
  files_by_type: Record<string, number>
  limit_mb: number
  retention_days: number
}

interface SystemSettings {
  log_retention_days: number
  log_save_policy: string
  log_max_total_size_mb: number
  log_cleanup_on_startup: boolean
}

const LogManagementTab: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackSystem, EventAction } = useAnalytics()

  const [logSavePolicy, setLogSavePolicy] = useState('failed_and_warnings')
  const [retentionDays, setRetentionDays] = useState(30)
  const [maxTotalSizeMb, setMaxTotalSizeMb] = useState(500)
  const [cleanupOnStartup, setCleanupOnStartup] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await settingsAPI.getSystemSettings()
      return response.data
    },
  })

  const { data: logStorageData, isLoading: loadingStorage } = useQuery({
    queryKey: ['log-storage-stats'],
    queryFn: async () => {
      const response = await settingsAPI.getLogStorageStats()
      return response.data
    },
    refetchInterval: 30000,
  })

  const logStorage: LogStorage | undefined = logStorageData?.storage || settingsData?.log_storage
  const settings: SystemSettings | undefined = settingsData?.settings

  useEffect(() => {
    if (settings) {
      setLogSavePolicy(settings.log_save_policy || 'failed_and_warnings')
      setRetentionDays(settings.log_retention_days || 30)
      setMaxTotalSizeMb(settings.log_max_total_size_mb || 500)
      setCleanupOnStartup(settings.log_cleanup_on_startup ?? true)
      setHasChanges(false)
    }
  }, [settings])

  useEffect(() => {
    if (settings) {
      const changed =
        logSavePolicy !== (settings.log_save_policy || 'failed_and_warnings') ||
        retentionDays !== (settings.log_retention_days || 30) ||
        maxTotalSizeMb !== (settings.log_max_total_size_mb || 500) ||
        cleanupOnStartup !== (settings.log_cleanup_on_startup ?? true)
      setHasChanges(changed)
    }
  }, [logSavePolicy, retentionDays, maxTotalSizeMb, cleanupOnStartup, settings])

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await settingsAPI.updateSystemSettings({
        log_save_policy: logSavePolicy,
        log_retention_days: retentionDays,
        log_max_total_size_mb: maxTotalSizeMb,
        log_cleanup_on_startup: cleanupOnStartup,
      })
      return response.data
    },
    onSuccess: (data) => {
      toast.success(t('logManagement.savedSuccessfully'))
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((warning: string) => {
          toast.error(warning, { duration: 6000 })
        })
      }
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['log-storage-stats'] })
      setHasChanges(false)
      trackSystem(EventAction.EDIT, {
        section: 'log_management',
        log_save_policy: logSavePolicy,
        retention_days: retentionDays,
        max_total_size_mb: maxTotalSizeMb,
        cleanup_on_startup: cleanupOnStartup,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('logManagement.failedToSaveSettings')
      )
    },
  })

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await settingsAPI.manualLogCleanup()
      return response.data
    },
    onSuccess: (data) => {
      toast.success(translateBackendKey(data.message) || t('logManagement.cleanupCompleted'))
      queryClient.invalidateQueries({ queryKey: ['log-storage-stats'] })
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      trackSystem(EventAction.DELETE, { section: 'log_management', operation: 'manual_cleanup' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('logManagement.failedToRunCleanup')
      )
    },
  })

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate()
  }

  const handleCleanup = () => {
    if (
      window.confirm(
        'Are you sure you want to run log cleanup? This will delete old log files according to your settings.'
      )
    ) {
      cleanupMutation.mutate()
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loadingSettings) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: 400 }}>
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const usagePercent = logStorage?.usage_percent || 0
  const isHighUsage = usagePercent >= 80
  const usageBarColor = isHighUsage ? '#f59e0b' : '#6366f1'

  const radioOptions = [
    {
      value: 'failed_only',
      label: 'Failed Jobs Only',
      description: 'Save logs only for failed or cancelled jobs (minimal disk usage)',
    },
    {
      value: 'failed_and_warnings',
      label: 'Failed Jobs and Warnings (Recommended)',
      description: 'Save logs for failed jobs and any job with warnings or errors',
    },
    {
      value: 'all_jobs',
      label: 'All Jobs',
      description: 'Save logs for all jobs, including successful ones (maximum disk usage)',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <p className="text-lg font-semibold mb-1">{t('logManagement.title')}</p>
          <p className="text-sm text-muted-foreground">
            Configure log storage, retention, and cleanup policies for job logs
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={!hasChanges || saveSettingsMutation.isPending}
          className="w-full sm:w-auto gap-1.5"
        >
          {saveSettingsMutation.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saveSettingsMutation.isPending ? t('logManagement.saving') : t('logManagement.save')}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Current Usage Card */}
        <SettingsCard>
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HardDrive size={18} />
                <p className="text-sm font-semibold">Storage Usage</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Current log storage utilization and statistics
              </p>
            </div>

            <div className="border-t border-border" />

            {loadingStorage ? (
              <div className="py-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-muted-foreground/30 rounded-full animate-pulse w-1/2" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Total Size
                    </p>
                    <p className="text-2xl font-bold">{logStorage?.total_size_mb || 0} MB</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      File Count
                    </p>
                    <p className="text-2xl font-bold">{logStorage?.file_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Oldest Log
                    </p>
                    <p className="text-sm mt-1">{formatDate(logStorage?.oldest_log_date || null)}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Newest Log
                    </p>
                    <p className="text-sm mt-1">{formatDate(logStorage?.newest_log_date || null)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-semibold">
                      {usagePercent}% of {logStorage?.limit_mb || 0} MB
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.max(0, (logStorage?.limit_mb || 0) - (logStorage?.total_size_mb || 0))}{' '}
                      MB available
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(usagePercent, 100)}%`,
                        background: usageBarColor,
                      }}
                    />
                  </div>
                </div>

                {isHighUsage && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      color: '#b45309',
                    }}
                  >
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Log storage usage is at {usagePercent}%. Consider running cleanup or
                      increasing the size limit.
                    </span>
                  </div>
                )}

                <div>
                  <Button
                    variant="outline"
                    onClick={handleCleanup}
                    disabled={cleanupMutation.isPending}
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    {cleanupMutation.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    {cleanupMutation.isPending
                      ? t('logManagement.clearing')
                      : t('logManagement.clearLogs')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SettingsCard>

        {/* Log Storage Policy */}
        <SettingsCard>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold mb-1">Log Storage Policy</p>
              <p className="text-sm text-muted-foreground">
                Choose which job types should have their logs saved to disk
              </p>
            </div>

            <div className="border-t border-border" />

            <div className="flex flex-col gap-3">
              {radioOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setLogSavePolicy(opt.value)}
                >
                  <input
                    type="radio"
                    name="logSavePolicy"
                    value={opt.value}
                    checked={logSavePolicy === opt.value}
                    onChange={() => setLogSavePolicy(opt.value)}
                    className="mt-1 flex-shrink-0"
                  />
                  <div className="py-1">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Retention Settings */}
        <SettingsCard>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold mb-1">Retention Settings</p>
              <p className="text-sm text-muted-foreground">
                Configure how long logs are kept and maximum storage size
              </p>
            </div>

            <div className="border-t border-border" />

            <div>
              <p className="text-sm font-semibold mb-3">
                Log Retention Period: {retentionDays} days
              </p>
              <div className="px-1 pt-1 pb-2">
                <input
                  type="range"
                  min={7}
                  max={90}
                  step={1}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>7d</span>
                  <span>30d</span>
                  <span>60d</span>
                  <span>90d</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Logs older than this will be automatically deleted during cleanup
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">
                Maximum Total Size (MB)
              </Label>
              <Input
                type="number"
                value={maxTotalSizeMb}
                onChange={(e) => setMaxTotalSizeMb(Math.max(10, parseInt(e.target.value) || 10))}
                min={10}
                max={10000}
                step={50}
                className="h-9 text-sm max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Total size limit for all log files. Min: 10 MB, Max: 10,000 MB (10 GB)
              </p>
            </div>
          </div>
        </SettingsCard>

        {/* Automatic Cleanup */}
        <SettingsCard>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold mb-1">Automatic Cleanup</p>
              <p className="text-sm text-muted-foreground">
                Configure when log cleanup runs automatically
              </p>
            </div>

            <div className="border-t border-border" />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cleanupOnStartup}
                onChange={(e) => setCleanupOnStartup(e.target.checked)}
                className="mt-1 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-medium">Run cleanup on application startup</p>
                <p className="text-sm text-muted-foreground">
                  Automatically clean old logs when the application starts
                </p>
              </div>
            </label>
          </div>
        </SettingsCard>
      </div>
    </div>
  )
}

export default LogManagementTab
