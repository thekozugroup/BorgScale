import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save,
  AlertTriangle,
  Settings,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Key,
  Info,
  Loader2,
} from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import { authAPI, settingsAPI } from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const MIN_TIMEOUT = 10
const MAX_TIMEOUT = 86400

function formatTimeout(seconds: number): string {
  if (seconds >= 3600) {
    const hours = seconds / 3600
    return `${hours.toFixed(1)} hour${hours !== 1 ? 's' : ''}`
  } else if (seconds >= 60) {
    const minutes = seconds / 60
    return `${minutes.toFixed(0)} minute${minutes !== 1 ? 's' : ''}`
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`
}

interface TimeoutFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  sourceKey?: string
  helperExtra?: React.ReactNode
  timeoutSources?: Record<string, string | null>
  renderSourceLabel: (source: string | null | undefined) => React.ReactNode
}

function TimeoutField({ label, value, onChange, step, sourceKey, helperExtra, timeoutSources, renderSourceLabel }: TimeoutFieldProps) {
  const isErr = value < MIN_TIMEOUT || value > MAX_TIMEOUT
  return (
    <div>
      <Label className={cn('text-xs font-semibold mb-1.5 block', isErr && 'text-destructive')}>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={MIN_TIMEOUT}
        max={MAX_TIMEOUT}
        step={step ?? 60}
        className={cn('h-9 text-sm', isErr && 'border-destructive')}
      />
      <p className="text-xs text-muted-foreground mt-1">
        {helperExtra} {formatTimeout(value)}
        {sourceKey && renderSourceLabel(timeoutSources?.[sourceKey])}
      </p>
    </div>
  )
}

const SystemSettingsTab: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackSystem, EventAction } = useAnalytics()

  const [browseMaxItems, setBrowseMaxItems] = useState(1_000_000)
  const [browseMaxMemoryMb, setBrowseMaxMemoryMb] = useState(1024)
  const [mountTimeout, setMountTimeout] = useState(120)
  const [infoTimeout, setInfoTimeout] = useState(600)
  const [listTimeout, setListTimeout] = useState(600)
  const [initTimeout, setInitTimeout] = useState(300)
  const [backupTimeout, setBackupTimeout] = useState(3600)
  const [sourceSizeTimeout, setSourceSizeTimeout] = useState(3600)
  const [maxConcurrentScheduledBackups, setMaxConcurrentScheduledBackups] = useState(2)
  const [maxConcurrentScheduledChecks, setMaxConcurrentScheduledChecks] = useState(4)
  const [statsRefreshInterval, setStatsRefreshInterval] = useState(60)
  const [isRefreshingStats, setIsRefreshingStats] = useState(false)
  const [metricsEnabled, setMetricsEnabled] = useState(false)
  const [metricsRequireAuth, setMetricsRequireAuth] = useState(false)
  const [rotateMetricsToken, setRotateMetricsToken] = useState(false)
  const [newMetricsToken, setNewMetricsToken] = useState<string | null>(null)
  const [metricsTokenCopied, setMetricsTokenCopied] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [browseChanged, setBrowseChanged] = useState(false)
  const [systemChanged, setSystemChanged] = useState(false)
  const [activeSection, setActiveSection] = useState(0)

  interface CacheStats {
    browse_max_items?: number
    browse_max_memory_mb?: number
    cache_ttl_minutes?: number
    cache_max_size_mb?: number
    redis_url?: string
  }

  const { data: cacheData, isLoading: cacheLoading } = useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const response = await settingsAPI.getCacheStats()
      return response.data as CacheStats
    },
  })

  const { data: systemData, isLoading: systemLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await settingsAPI.getSystemSettings()
      return response.data
    },
  })

  const { data: authConfigData } = useQuery({
    queryKey: ['authConfig'],
    queryFn: async () => {
      const response = await authAPI.getAuthConfig()
      return response.data
    },
  })

  const cacheStats = cacheData
  const systemSettings = systemData?.settings
  const timeoutSources = systemData?.settings?.timeout_sources as
    | Record<string, string | null>
    | undefined
  const proxyAuthConfig = authConfigData

  const renderSourceLabel = (source: string | null | undefined) => {
    if (source === 'saved') {
      return (
        <span className="text-[0.7rem] font-medium text-green-600 dark:text-green-400">
          {' '}{t('systemSettings.sourceCustomized')}
        </span>
      )
    }
    if (source === 'env') {
      return (
        <span className="text-[0.7rem] font-medium text-amber-600 dark:text-amber-400">
          {' '}{t('systemSettings.sourceFromEnv')}
        </span>
      )
    }
    return (
      <span className="text-[0.7rem] font-medium text-blue-600 dark:text-blue-400">
        {' '}{t('systemSettings.sourceDefault')}
      </span>
    )
  }

  useEffect(() => {
    if (cacheStats) {
      setBrowseMaxItems(cacheStats.browse_max_items || 1_000_000)
      setBrowseMaxMemoryMb(cacheStats.browse_max_memory_mb || 1024)
    }
  }, [cacheStats])

  useEffect(() => {
    if (systemSettings) {
      setMountTimeout(systemSettings.mount_timeout || 120)
      setInfoTimeout(systemSettings.info_timeout || 600)
      setListTimeout(systemSettings.list_timeout || 600)
      setInitTimeout(systemSettings.init_timeout || 300)
      setBackupTimeout(systemSettings.backup_timeout || 3600)
      setSourceSizeTimeout(systemSettings.source_size_timeout || 3600)
      setMaxConcurrentScheduledBackups(systemSettings.max_concurrent_scheduled_backups ?? 2)
      setMaxConcurrentScheduledChecks(systemSettings.max_concurrent_scheduled_checks ?? 4)
      setStatsRefreshInterval(systemSettings.stats_refresh_interval_minutes ?? 60)
      setMetricsEnabled(systemSettings.metrics_enabled ?? false)
      setMetricsRequireAuth(systemSettings.metrics_require_auth ?? false)
      setRotateMetricsToken(false)
      setHasChanges(false)
    }
  }, [systemSettings])

  useEffect(() => {
    if (cacheStats && systemSettings) {
      const browseDirty =
        browseMaxItems !== (cacheStats.browse_max_items || 1_000_000) ||
        browseMaxMemoryMb !== (cacheStats.browse_max_memory_mb || 1024)

      const timeoutDirty =
        mountTimeout !== (systemSettings.mount_timeout || 120) ||
        infoTimeout !== (systemSettings.info_timeout || 600) ||
        listTimeout !== (systemSettings.list_timeout || 600) ||
        initTimeout !== (systemSettings.init_timeout || 300) ||
        backupTimeout !== (systemSettings.backup_timeout || 3600) ||
        sourceSizeTimeout !== (systemSettings.source_size_timeout || 3600) ||
        maxConcurrentScheduledBackups !== (systemSettings.max_concurrent_scheduled_backups ?? 2) ||
        maxConcurrentScheduledChecks !== (systemSettings.max_concurrent_scheduled_checks ?? 4)

      const statsRefreshDirty = statsRefreshInterval !== (systemSettings.stats_refresh_interval_minutes ?? 60)
      const metricsDirty =
        metricsEnabled !== (systemSettings.metrics_enabled ?? false) ||
        metricsRequireAuth !== (systemSettings.metrics_require_auth ?? false) ||
        rotateMetricsToken

      setBrowseChanged(browseDirty)
      setSystemChanged(timeoutDirty || statsRefreshDirty || metricsDirty)
      setHasChanges(browseDirty || timeoutDirty || statsRefreshDirty || metricsDirty)
    }
  }, [
    browseMaxItems, browseMaxMemoryMb, mountTimeout, infoTimeout, listTimeout,
    initTimeout, backupTimeout, sourceSizeTimeout, maxConcurrentScheduledBackups,
    maxConcurrentScheduledChecks, statsRefreshInterval, metricsEnabled, metricsRequireAuth,
    rotateMetricsToken, cacheStats, systemSettings,
  ])

  const MIN_FILES = 100_000
  const MAX_FILES = 50_000_000
  const MIN_MEMORY = 100
  const MAX_MEMORY = 16384
  const MAX_STATS_REFRESH = 1440
  const MAX_SCHEDULE_CONCURRENCY = 64

  const getValidationError = (): string | null => {
    if (browseMaxItems < MIN_FILES || browseMaxItems > MAX_FILES) {
      return `Max files must be between ${MIN_FILES.toLocaleString()} and ${MAX_FILES.toLocaleString()}`
    }
    if (browseMaxMemoryMb < MIN_MEMORY || browseMaxMemoryMb > MAX_MEMORY) {
      return `Max memory must be between ${MIN_MEMORY} MB and ${MAX_MEMORY} MB`
    }
    const timeouts = [mountTimeout, infoTimeout, listTimeout, initTimeout, backupTimeout, sourceSizeTimeout]
    if (timeouts.some((t) => t < MIN_TIMEOUT || t > MAX_TIMEOUT)) {
      return `Timeouts must be between ${MIN_TIMEOUT} seconds and ${MAX_TIMEOUT} seconds (24 hours)`
    }
    if (statsRefreshInterval < 0 || statsRefreshInterval > MAX_STATS_REFRESH) {
      return `Stats refresh interval must be between 0 and ${MAX_STATS_REFRESH} minutes (0 = disabled)`
    }
    if (
      maxConcurrentScheduledBackups < 0 || maxConcurrentScheduledBackups > MAX_SCHEDULE_CONCURRENCY ||
      maxConcurrentScheduledChecks < 0 || maxConcurrentScheduledChecks > MAX_SCHEDULE_CONCURRENCY
    ) {
      return `Scheduler concurrency limits must be between 0 and ${MAX_SCHEDULE_CONCURRENCY}`
    }
    return null
  }

  const validationError = getValidationError()

  const saveBrowseLimitsMutation = useMutation({
    mutationFn: async () => {
      return await settingsAPI.updateCacheSettings(
        cacheStats?.cache_ttl_minutes || 120,
        cacheStats?.cache_max_size_mb || 2048,
        cacheStats?.redis_url || '',
        browseMaxItems,
        browseMaxMemoryMb
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const data = error.response?.data
      let errorMsg = t('systemSettings.failedToSaveBrowseLimits')
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMsg = data.map((e: any) => e.msg).join(', ')
      } else if (data?.detail) {
        errorMsg = translateBackendKey(data.detail)
      }
      throw new Error(errorMsg)
    },
  })

  const saveTimeoutsMutation = useMutation({
    mutationFn: async () => {
      return await settingsAPI.updateSystemSettings({
        mount_timeout: mountTimeout,
        info_timeout: infoTimeout,
        list_timeout: listTimeout,
        init_timeout: initTimeout,
        backup_timeout: backupTimeout,
        source_size_timeout: sourceSizeTimeout,
        max_concurrent_scheduled_backups: maxConcurrentScheduledBackups,
        max_concurrent_scheduled_checks: maxConcurrentScheduledChecks,
        stats_refresh_interval_minutes: statsRefreshInterval,
        metrics_enabled: metricsEnabled,
        metrics_require_auth: metricsRequireAuth,
        rotate_metrics_token: rotateMetricsToken,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const data = error.response?.data
      let errorMsg = t('systemSettings.failedToSaveTimeoutSettings')
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMsg = data.map((e: any) => e.msg).join(', ')
      } else if (data?.detail) {
        errorMsg = translateBackendKey(data.detail)
      }
      throw new Error(errorMsg)
    },
  })

  const handleSaveSettings = async () => {
    if (validationError) { toast.error(validationError); return }
    try {
      const operations: Array<Promise<unknown>> = []
      let generatedMetricsToken: string | undefined
      if (browseChanged) operations.push(saveBrowseLimitsMutation.mutateAsync())
      if (systemChanged) {
        operations.push(
          saveTimeoutsMutation.mutateAsync().then((response) => {
            generatedMetricsToken = response?.data?.generated_metrics_token
            return response
          })
        )
      }
      if (operations.length === 0) return
      await Promise.all(operations)
      toast.success(t('systemSettings.savedSuccessfully'))
      setHasChanges(false)
      setRotateMetricsToken(false)
      if (generatedMetricsToken) {
        setNewMetricsToken(generatedMetricsToken)
        setMetricsTokenCopied(false)
      }
      trackSystem(EventAction.EDIT, {
        section: 'system_settings',
        browse_max_items: browseMaxItems,
        browse_max_memory_mb: browseMaxMemoryMb,
        mount_timeout: mountTimeout,
        info_timeout: infoTimeout,
        list_timeout: listTimeout,
        init_timeout: initTimeout,
        backup_timeout: backupTimeout,
        source_size_timeout: sourceSizeTimeout,
        max_concurrent_scheduled_backups: maxConcurrentScheduledBackups,
        max_concurrent_scheduled_checks: maxConcurrentScheduledChecks,
        stats_refresh_interval_minutes: statsRefreshInterval,
        metrics_enabled: metricsEnabled,
        metrics_require_auth: metricsRequireAuth,
        rotate_metrics_token: rotateMetricsToken,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || t('systemSettings.failedToSaveSettings'))
    }
  }

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true)
    try {
      const response = await settingsAPI.refreshAllStats()
      const data = response.data
      toast.success(translateBackendKey(data.message) || t('systemSettings.statsRefreshStarted'))
      trackSystem(EventAction.START, { section: 'system_settings', operation: 'refresh_stats' })
      const startTime = Date.now()
      const maxWaitTime = 5 * 60 * 1000
      const pollInterval = setInterval(async () => {
        if (Date.now() - startTime > maxWaitTime) { clearInterval(pollInterval); setIsRefreshingStats(false); return }
        try {
          const settingsResponse = await settingsAPI.getSystemSettings()
          const newLastRefresh = settingsResponse.data?.settings?.last_stats_refresh
          if (newLastRefresh && new Date(newLastRefresh) > new Date(startTime)) {
            clearInterval(pollInterval)
            setIsRefreshingStats(false)
            toast.success(t('systemSettings.statsRefreshCompleted'))
            queryClient.invalidateQueries({ queryKey: ['repositories'] })
            queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
          }
        } catch { /* ignore */ }
      }, 3000)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(
        translateBackendKey(error.response?.data?.detail) || t('systemSettings.failedToStartStatsRefresh')
      )
      setIsRefreshingStats(false)
    }
  }

  const handleCopyMetricsToken = async () => {
    if (!newMetricsToken) return
    await navigator.clipboard.writeText(newMetricsToken)
    setMetricsTokenCopied(true)
    setTimeout(() => setMetricsTokenCopied(false), 2000)
  }

  const isLoading = cacheLoading || systemLoading
  const isSaving = saveBrowseLimitsMutation.isPending || saveTimeoutsMutation.isPending

  const proxyAuthHeaderRows: Array<[string, string | null | undefined]> = [
    ['systemSettings.proxyAuthUsernameHeader', proxyAuthConfig?.proxy_auth_header],
    ['systemSettings.proxyAuthRoleHeader', proxyAuthConfig?.proxy_auth_role_header],
    ['systemSettings.proxyAuthAllRepositoriesRoleHeader', proxyAuthConfig?.proxy_auth_all_repositories_role_header],
    ['systemSettings.proxyAuthEmailHeader', proxyAuthConfig?.proxy_auth_email_header],
    ['systemSettings.proxyAuthFullNameHeader', proxyAuthConfig?.proxy_auth_full_name_header],
  ]

  const sectionTabs = [
    { label: t('systemSettings.operationTimeoutsTitle'), description: t('systemSettings.operationTimeoutsDescription'), icon: <Clock size={14} /> },
    { label: t('systemSettings.repositoryMonitoringTitle'), description: t('systemSettings.repositoryMonitoringDescription'), icon: <RefreshCw size={14} /> },
    { label: t('systemSettings.metricsAccessTitle'), description: t('systemSettings.metricsAccessDescription'), icon: <Key size={14} /> },
    { label: t('systemSettings.archiveBrowsingLimitsTitle'), description: t('systemSettings.archiveBrowsingLimitsDescription'), icon: <AlertTriangle size={14} /> },
    { label: t('systemSettings.proxyAuthTitle'), description: t('systemSettings.proxyAuthDescription'), icon: <Settings size={14} /> },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: 400 }}>
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <p className="text-lg font-bold mb-1">{t('systemSettings.title')}</p>
          <p className="text-sm text-muted-foreground">{t('systemSettings.subtitle')}</p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={!hasChanges || isSaving || !!validationError}
          className="w-full sm:w-auto gap-1.5"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {isSaving ? t('systemSettings.saving') : t('systemSettings.save')}
        </Button>
      </div>

      <SettingsCard contentClassName="p-0">
        {/* Tab bar */}
        <div className="border-b border-border overflow-x-auto">
          <div className="flex min-w-max px-2 md:px-4">
            {sectionTabs.map((tab, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSection(idx)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors duration-150',
                  activeSection === idx
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="flex flex-col gap-5">
            {/* Section header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {activeSection === 0 && <Clock size={20} />}
                {activeSection === 1 && <RefreshCw size={20} />}
                {activeSection === 2 && <Settings size={20} />}
                {activeSection === 3 && <AlertTriangle size={20} />}
                {activeSection === 4 && <Settings size={20} />}
                <p className="text-sm font-semibold">{sectionTabs[activeSection].label}</p>
                {activeSection === 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-blue-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>{t('systemSettings.manualRefreshAlert')}</TooltipContent>
                  </Tooltip>
                )}
                {activeSection === 2 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-blue-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>{t('systemSettings.metricsHeaderHelp')}</TooltipContent>
                  </Tooltip>
                )}
                {activeSection === 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle size={14} className="text-amber-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <strong>{t('systemSettings.warningLabel')}</strong>{' '}
                      {t('systemSettings.largeLimitsWarning')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{sectionTabs[activeSection].description}</p>
            </div>

            <div className="border-t border-border" />

            {/* Section 0: Operation Timeouts */}
            {activeSection === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <TimeoutField label={t('systemSettings.mountTimeoutLabel')} value={mountTimeout} onChange={setMountTimeout} step={10} sourceKey="mount_timeout" helperExtra={t('systemSettings.mountTimeoutHelper')} renderSourceLabel={renderSourceLabel} timeoutSources={timeoutSources} />
                <TimeoutField label={t('systemSettings.infoTimeoutLabel')} value={infoTimeout} onChange={setInfoTimeout} step={60} sourceKey="info_timeout" helperExtra={t('systemSettings.infoTimeoutHelper')} renderSourceLabel={renderSourceLabel} timeoutSources={timeoutSources} />
                <TimeoutField label={t('systemSettings.listTimeoutLabel')} value={listTimeout} onChange={setListTimeout} step={60} sourceKey="list_timeout" helperExtra={t('systemSettings.listTimeoutHelper')} renderSourceLabel={renderSourceLabel} timeoutSources={timeoutSources} />
                <TimeoutField label={t('systemSettings.initTimeoutLabel')} value={initTimeout} onChange={setInitTimeout} step={60} sourceKey="init_timeout" helperExtra={t('systemSettings.initTimeoutHelper')} renderSourceLabel={renderSourceLabel} timeoutSources={timeoutSources} />
                <TimeoutField label={t('systemSettings.backupTimeoutLabel')} value={backupTimeout} onChange={setBackupTimeout} step={300} sourceKey="backup_timeout" helperExtra={t('systemSettings.backupTimeoutHelper')} renderSourceLabel={renderSourceLabel} timeoutSources={timeoutSources} />
                <TimeoutField label={t('systemSettings.sourceSizeTimeoutLabel')} value={sourceSizeTimeout} onChange={setSourceSizeTimeout} step={300} sourceKey="source_size_timeout" helperExtra={t('systemSettings.sourceSizeTimeoutHelper')} renderSourceLabel={renderSourceLabel} timeoutSources={timeoutSources} />
              </div>
            )}

            {/* Section 1: Repository Monitoring */}
            {activeSection === 1 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,340px)_auto] gap-3 items-start">
                  <div>
                    <Label className={cn('text-xs font-semibold mb-1.5 block', (statsRefreshInterval < 0 || statsRefreshInterval > MAX_STATS_REFRESH) && 'text-destructive')}>
                      {t('systemSettings.statsRefreshIntervalLabel')}
                    </Label>
                    <Input
                      type="number"
                      value={statsRefreshInterval}
                      onChange={(e) => setStatsRefreshInterval(Number(e.target.value))}
                      min={0}
                      max={MAX_STATS_REFRESH}
                      step={15}
                      className={cn('h-9 text-sm', (statsRefreshInterval < 0 || statsRefreshInterval > MAX_STATS_REFRESH) && 'border-destructive')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {statsRefreshInterval === 0
                        ? t('systemSettings.statsRefreshDisabled')
                        : statsRefreshInterval < 0 || statsRefreshInterval > MAX_STATS_REFRESH
                          ? t('systemSettings.statsRefreshRangeError', { max: MAX_STATS_REFRESH })
                          : t('systemSettings.statsRefreshIntervalHelper', { interval: statsRefreshInterval })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRefreshStats}
                    disabled={isRefreshingStats}
                    className="gap-1.5 h-9 self-start mt-6"
                  >
                    {isRefreshingStats ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isRefreshingStats ? t('systemSettings.refreshing') : t('systemSettings.refreshNow')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ maxWidth: 640 }}>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">{t('systemSettings.maxConcurrentScheduledBackupsLabel')}</Label>
                    <Input type="number" value={maxConcurrentScheduledBackups} onChange={(e) => setMaxConcurrentScheduledBackups(Number(e.target.value))} min={0} max={MAX_SCHEDULE_CONCURRENCY} step={1} className="h-9 text-sm" />
                    <p className="text-xs text-muted-foreground mt-1">{t('systemSettings.maxConcurrentScheduledBackupsHelper')}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">{t('systemSettings.maxConcurrentScheduledChecksLabel')}</Label>
                    <Input type="number" value={maxConcurrentScheduledChecks} onChange={(e) => setMaxConcurrentScheduledChecks(Number(e.target.value))} min={0} max={MAX_SCHEDULE_CONCURRENCY} step={1} className="h-9 text-sm" />
                    <p className="text-xs text-muted-foreground mt-1">{t('systemSettings.maxConcurrentScheduledChecksHelper')}</p>
                  </div>
                </div>

                {systemSettings?.last_stats_refresh && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0369a1' }}
                  >
                    {t('systemSettings.lastRefreshed')}{' '}
                    {new Date(systemSettings.last_stats_refresh).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Metrics */}
            {activeSection === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={metricsEnabled}
                    onCheckedChange={(enabled) => {
                      setMetricsEnabled(enabled)
                      if (!enabled) { setMetricsRequireAuth(false); setRotateMetricsToken(false) }
                    }}
                  />
                  <span className="text-sm">{t('systemSettings.metricsEnabledLabel')}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={metricsRequireAuth}
                    disabled={!metricsEnabled}
                    onCheckedChange={(enabled) => {
                      setMetricsRequireAuth(enabled)
                      if (!enabled) setRotateMetricsToken(false)
                    }}
                  />
                  <span className={cn('text-sm', !metricsEnabled && 'text-muted-foreground')}>
                    {t('systemSettings.metricsRequireAuthLabel')}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                  <Button
                    variant="outline"
                    onClick={() => setRotateMetricsToken(true)}
                    disabled={!metricsEnabled || !metricsRequireAuth}
                    className="gap-1.5"
                  >
                    <Key size={15} />
                    {systemSettings?.metrics_token_set
                      ? t('systemSettings.metricsRotateToken')
                      : t('systemSettings.metricsGenerateToken')}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {!metricsEnabled || !metricsRequireAuth
                      ? t('systemSettings.metricsTokenDisabledHelper')
                      : rotateMetricsToken
                        ? t('systemSettings.metricsTokenWillRotate')
                        : systemSettings?.metrics_token_set
                          ? t('systemSettings.metricsTokenConfigured')
                          : t('systemSettings.metricsTokenWillGenerate')}
                  </p>
                </div>

                {newMetricsToken && (
                  <div
                    className="p-4 rounded-xl"
                    style={{ border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)' }}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {t('systemSettings.metricsTokenDialogWarning')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background">
                        <span
                          className="flex-1 text-[0.78rem] break-all select-all"
                          style={{ fontFamily: 'ui-monospace,monospace', lineHeight: 1.6 }}
                        >
                          {newMetricsToken}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={handleCopyMetricsToken}
                              className={cn(
                                'flex items-center justify-center w-7 h-7 rounded flex-shrink-0 transition-colors',
                                metricsTokenCopied
                                  ? 'text-green-500'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {metricsTokenCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {metricsTokenCopied ? t('systemSettings.metricsTokenCopied') : t('common.buttons.copy')}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Archive Browsing Limits */}
            {activeSection === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className={cn('text-xs font-semibold mb-1.5 block', (browseMaxItems < MIN_FILES || browseMaxItems > MAX_FILES) && 'text-destructive')}>
                    {t('systemSettings.maxFilesToLoadLabel')}
                  </Label>
                  <Input
                    type="number"
                    value={browseMaxItems}
                    onChange={(e) => setBrowseMaxItems(Number(e.target.value))}
                    min={MIN_FILES}
                    max={MAX_FILES}
                    step={100_000}
                    className={cn('h-9 text-sm', (browseMaxItems < MIN_FILES || browseMaxItems > MAX_FILES) && 'border-destructive')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {browseMaxItems < MIN_FILES || browseMaxItems > MAX_FILES
                      ? t('systemSettings.maxFilesRangeError', { min: MIN_FILES.toLocaleString(), max: MAX_FILES.toLocaleString() })
                      : t('systemSettings.maxFilesHelperText', { current: (browseMaxItems / 1_000_000).toFixed(1) })}
                  </p>
                </div>

                <div>
                  <Label className={cn('text-xs font-semibold mb-1.5 block', (browseMaxMemoryMb < MIN_MEMORY || browseMaxMemoryMb > MAX_MEMORY) && 'text-destructive')}>
                    {t('systemSettings.maxMemoryLabel')}
                  </Label>
                  <Input
                    type="number"
                    value={browseMaxMemoryMb}
                    onChange={(e) => setBrowseMaxMemoryMb(Number(e.target.value))}
                    min={MIN_MEMORY}
                    max={MAX_MEMORY}
                    step={128}
                    className={cn('h-9 text-sm', (browseMaxMemoryMb < MIN_MEMORY || browseMaxMemoryMb > MAX_MEMORY) && 'border-destructive')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {browseMaxMemoryMb < MIN_MEMORY || browseMaxMemoryMb > MAX_MEMORY
                      ? t('systemSettings.maxMemoryRangeError', { min: MIN_MEMORY, max: MAX_MEMORY })
                      : t('systemSettings.maxMemoryHelperText', { current: (browseMaxMemoryMb / 1024).toFixed(2) })}
                  </p>
                </div>
              </div>
            )}

            {/* Section 4: Proxy Auth */}
            {activeSection === 4 && (
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-sm"
                  style={
                    proxyAuthConfig?.proxy_auth_enabled
                      ? { background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0369a1' }
                      : { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#15803d' }
                  }
                >
                  {proxyAuthConfig?.proxy_auth_enabled
                    ? t('systemSettings.proxyAuthEnabledStatus')
                    : t('systemSettings.proxyAuthDisabledStatus')}
                </div>

                {proxyAuthConfig?.proxy_auth_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {proxyAuthHeaderRows.map(([labelKey, value]) => (
                      <div key={labelKey} className="p-3 rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{t(labelKey)}</p>
                        <p
                          className="text-sm break-words"
                          style={{ fontFamily: 'ui-monospace,monospace' }}
                        >
                          {value || t('systemSettings.proxyAuthNotConfigured')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {proxyAuthConfig?.proxy_auth_health?.warnings?.length ? (
                  <div
                    className="p-3 rounded-xl text-sm flex flex-col gap-2"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#b45309' }}
                  >
                    <p className="font-semibold">{t('systemSettings.proxyAuthWarningsTitle')}</p>
                    <div className="flex flex-col gap-1.5">
                      {proxyAuthConfig.proxy_auth_health.warnings.map((warning: { code: string; message: string }) => (
                        <p key={warning.code}>• {warning.message}</p>
                      ))}
                    </div>
                  </div>
                ) : proxyAuthConfig?.proxy_auth_enabled ? (
                  <div
                    className="p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#15803d' }}
                  >
                    {t('systemSettings.proxyAuthNoWarnings')}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}

export default SystemSettingsTab
