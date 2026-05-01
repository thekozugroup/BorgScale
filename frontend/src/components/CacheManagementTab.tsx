import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Trash2, AlertTriangle, Server, Zap, Database, Loader2 } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import { settingsAPI } from '../services/api'
import { translateBackendKey } from '../utils/translateBackendKey'
import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CacheStats {
  backend: string
  available: boolean
  hits: number
  misses: number
  hit_rate: number
  size_bytes: number
  entry_count: number
  cache_ttl_minutes: number
  cache_max_size_mb: number
  ttl_seconds?: number
  max_size_mb?: number
  connection_type?: string
  connection_info?: string
  redis_url?: string
}

const CacheManagementTab: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { trackSystem, EventAction } = useAnalytics()

  const [ttlMinutes, setTtlMinutes] = useState(120)
  const [maxSizeMb, setMaxSizeMb] = useState(2048)
  const [redisUrl, setRedisUrl] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const { data: cacheData, isLoading: loadingCache } = useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const response = await settingsAPI.getCacheStats()
      return response.data
    },
    refetchInterval: 10000,
  })

  const stats: CacheStats | undefined = cacheData

  useEffect(() => {
    if (stats) {
      setTtlMinutes(stats.cache_ttl_minutes || 120)
      setMaxSizeMb(stats.cache_max_size_mb || 2048)
      setRedisUrl(stats.redis_url || '')
      setHasChanges(false)
    }
  }, [stats])

  useEffect(() => {
    if (stats) {
      const changed =
        ttlMinutes !== (stats.cache_ttl_minutes || 120) ||
        maxSizeMb !== (stats.cache_max_size_mb || 2048) ||
        redisUrl !== (stats.redis_url || '')
      setHasChanges(changed)
    }
  }, [ttlMinutes, maxSizeMb, redisUrl, stats])

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      return await settingsAPI.updateCacheSettings(ttlMinutes, maxSizeMb, redisUrl)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] })
      const message = response.data?.message || 'Cache settings saved successfully'
      toast.success(message, { duration: 5000 })
      setHasChanges(false)
      trackSystem(EventAction.EDIT, { section: 'cache', ttl_minutes: ttlMinutes, max_size_mb: maxSizeMb, backend: redisUrl ? 'redis' : 'memory' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('cache.failedToSaveCacheSettings'))
    },
  })

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      return await settingsAPI.clearCache()
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] })
      const clearedCount = response.data?.cleared_count || 0
      toast.success(t('cache.clearSuccess', { count: clearedCount }))
      setClearDialogOpen(false)
      trackSystem(EventAction.DELETE, { section: 'cache', operation: 'clear_cache' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('cache.failedToClearCache'))
      setClearDialogOpen(false)
    },
  })

  const handleTestConnection = async () => {
    if (!redisUrl.trim()) { toast.error(t('cache.pleaseEnterRedisUrl')); return }
    setTestingConnection(true)
    try {
      const response = await settingsAPI.updateCacheSettings(
        stats?.cache_ttl_minutes || ttlMinutes,
        stats?.cache_max_size_mb || maxSizeMb,
        redisUrl
      )
      const data = response.data
      if (data.backend === 'redis') {
        toast.success(t('cache.redisConnected', { info: data.connection_info }), { duration: 5000 })
        queryClient.invalidateQueries({ queryKey: ['cache-stats'] })
        setHasChanges(false)
        trackSystem(EventAction.TEST, { section: 'cache', operation: 'test_connection', backend: 'redis', success: true })
      } else {
        toast.error(t('cache.redisConnectFailed', { message: translateBackendKey(data.message) || t('cache.usingInMemoryFallback') }), { duration: 5000 })
        trackSystem(EventAction.TEST, { section: 'cache', operation: 'test_connection', backend: 'redis', success: false })
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(translateBackendKey(error.response?.data?.detail) || t('cache.connectionTestFailed'), { duration: 5000 })
      trackSystem(EventAction.TEST, { section: 'cache', operation: 'test_connection', backend: 'redis', success: false })
    } finally {
      setTestingConnection(false)
    }
  }

  const sizeMb = stats ? stats.size_bytes / (1024 * 1024) : 0
  const maxSizeFromStats = stats?.cache_max_size_mb || 2048
  const usagePercent = (sizeMb / maxSizeFromStats) * 100
  const totalRequests = stats ? stats.hits + stats.misses : 0
  const hitRate = stats?.hit_rate || 0

  const formatTtl = (minutes: number) => {
    if (minutes >= 1440) { const d = Math.floor(minutes / 1440); return `${d} day${d > 1 ? 's' : ''}` }
    if (minutes >= 60) { const h = Math.floor(minutes / 60); return `${h} hour${h > 1 ? 's' : ''}` }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  const redisUrlInvalid = redisUrl.trim() !== '' && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://') && !redisUrl.startsWith('unix://')

  if (loadingCache) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: 400 }}>
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('cacheManagement.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('cache.subtitle')}</p>
        </div>
        <Button
          disabled={!hasChanges || saveSettingsMutation.isPending}
          className="gap-1.5 w-full sm:w-auto"
          onClick={() => saveSettingsMutation.mutate()}
        >
          {saveSettingsMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saveSettingsMutation.isPending ? t('cacheManagement.saving') : t('cacheManagement.save')}
        </Button>
      </div>

      {/* Cache Status Card */}
      <SettingsCard>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={22} />
              <p className="text-base font-semibold">{t('cache.cacheStatus')}</p>
            </div>
            {stats && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stats.backend === 'redis' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                {stats.backend === 'redis' ? <Database size={12} /> : <Zap size={12} />}
                {stats.backend === 'redis' ? 'Redis' : 'In-Memory'}
              </span>
            )}
          </div>

          {stats?.connection_info && (
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Connection:</strong> {stats.connection_info}
                {stats.connection_type === 'external_url' && ' (External Redis)'}
                {stats.connection_type === 'local' && ' (Local Docker)'}
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t border-border" />

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: String(stats?.entry_count || 0), label: t('cache.cachedArchives') },
              { value: `${sizeMb.toFixed(1)} MB`, label: t('cache.memoryUsed') },
              { value: `${hitRate.toFixed(1)}%`, label: t('cache.hitRate'), sub: t('cache.totalRequests', { count: totalRequests }) },
              { value: stats ? formatTtl(stats.cache_ttl_minutes) : '2 hours', label: t('cache.cacheTtl') },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 bg-muted/40 rounded-xl">
                <p className="text-2xl font-bold text-primary tabular-nums">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
              </div>
            ))}
          </div>

          {/* Usage bar */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between gap-1 mb-2">
              <p className="text-sm text-muted-foreground">{t('cache.cacheUsage')}</p>
              <p className="text-sm text-muted-foreground">{t('cache.cacheUsageDetail', { used: sizeMb.toFixed(1), max: maxSizeFromStats, percent: usagePercent.toFixed(1) })}</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-muted">
              <div className={`h-full rounded-full transition-all ${usagePercent >= 80 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
            </div>
          </div>

          {usagePercent >= 80 && (
            <Alert>
              <AlertTriangle size={16} />
              <AlertDescription>{t('cache.highUsageWarning', { percent: usagePercent.toFixed(1) })}</AlertDescription>
            </Alert>
          )}

          {stats?.backend === 'in-memory' && (
            <Alert>
              <AlertDescription>{t('cache.inMemoryWarning')}</AlertDescription>
            </Alert>
          )}

          <div>
            <Button
              variant="outline"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setClearDialogOpen(true)}
              disabled={!stats || stats.entry_count === 0 || clearCacheMutation.isPending}
            >
              <Trash2 size={16} />
              {t('cache.clearAllCache')}
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Configuration Card */}
      <SettingsCard>
        <div className="flex flex-col gap-5">
          <p className="text-base font-semibold">{t('cache.cacheConfiguration')}</p>
          <div className="border-t border-border" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="cache-ttl" className="text-xs font-semibold mb-1.5 block">{t('cache.ttlLabel')}</Label>
              <Input id="cache-ttl" type="number" value={ttlMinutes} min={1} max={10080} onChange={(e) => setTtlMinutes(Number(e.target.value))} className="h-9 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{t('cache.ttlHelperText', { current: formatTtl(ttlMinutes) })}</p>
            </div>
            <div>
              <Label htmlFor="cache-max-size" className="text-xs font-semibold mb-1.5 block">{t('cache.maxSizeLabel')}</Label>
              <Input id="cache-max-size" type="number" value={maxSizeMb} min={100} max={10240} onChange={(e) => setMaxSizeMb(Number(e.target.value))} className="h-9 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{t('cache.maxSizeHelperText', { current: (maxSizeMb / 1024).toFixed(2) })}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex-1">
              <Label htmlFor="cache-redis-url" className="text-xs font-semibold mb-1.5 block">{t('cache.redisUrlLabel')}</Label>
              <Input
                id="cache-redis-url"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
                placeholder="redis://192.168.1.100:6379/0"
                className={`h-9 text-sm ${redisUrlInvalid ? 'border-destructive' : ''}`}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('cache.redisUrlHelperText')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={!redisUrl.trim() || testingConnection} className="mt-6 flex-shrink-0 gap-1.5">
              {testingConnection && <Loader2 size={12} className="animate-spin" />}
              {testingConnection ? t('cache.testing') : t('cache.testConnection')}
            </Button>
          </div>

          <Alert>
            <AlertDescription>
              <strong>{t('cache.noteLabel')}</strong> {t('cache.ttlNoteText')}
            </AlertDescription>
          </Alert>
        </div>
      </SettingsCard>

      {/* Clear Cache Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={(v) => !v && setClearDialogOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('cache.clearDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t('cache.clearConfirmCount', { count: stats?.entry_count || 0 })}
              <br /><br />
              {t('cache.clearConfirmQuestion')}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setClearDialogOpen(false)}>{t('cache.cancel')}</Button>
              <Button variant="destructive" size="sm" disabled={clearCacheMutation.isPending} onClick={() => clearCacheMutation.mutate()} className="gap-1.5">
                {clearCacheMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                {clearCacheMutation.isPending ? t('cacheManagement.clearing') : t('cacheManagement.clearCache')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CacheManagementTab
