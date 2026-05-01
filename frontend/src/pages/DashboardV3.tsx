/**
 * DashboardV3 — BorgScale ops command center
 *
 * Design system: shadcn/ui + stock neutral black/white theme
 * Layout:        4-up stat tiles · area chart · repo health grid · activity
 *
 * Padding note: The Layout already provides Container + padding.
 *               This component adds NO extra outer padding or background.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  XCircle,
  HardDrive,
  Activity,
  Cpu,
  ArrowRight,
  Server,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Play,
  Pause,
  RotateCw,
  Boxes,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatDistanceToNow, differenceInDays, startOfDay, addDays, format } from 'date-fns'
import { useAnalytics } from '../hooks/useAnalytics'
import { dashboardAPI } from '../services/api'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardOverview {
  summary: {
    total_repositories: number
    local_repositories: number
    ssh_repositories: number
    active_schedules: number
    total_schedules: number
    success_rate_30d: number
    successful_jobs_30d: number
    failed_jobs_30d: number
    total_jobs_30d: number
  }
  storage: {
    total_size: string
    total_size_bytes: number
    total_archives: number
    average_dedup_ratio: number | null
    breakdown: Array<{ name: string; size: string; size_bytes: number; percentage: number }>
  }
  repository_health: Array<{
    id: number
    name: string
    type: string
    mode: 'full' | 'observe'
    last_backup: string | null
    last_check: string | null
    last_compact: string | null
    archive_count: number
    total_size: string
    health_status: 'healthy' | 'warning' | 'critical'
    warnings: string[]
    next_run: string | null
    has_schedule: boolean
    schedule_enabled: boolean
    schedule_name: string | null
    dimension_health: {
      backup: 'healthy' | 'warning' | 'critical' | 'unknown'
      check: 'healthy' | 'warning' | 'critical' | 'unknown'
      compact: 'healthy' | 'warning' | 'critical' | 'unknown'
    }
  }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upcoming_tasks: Array<any>
  activity_feed: Array<{
    id: number
    type: string
    status: string
    repository: string
    timestamp: string
    message: string
    error: string | null
  }>
  system_metrics: {
    cpu_usage: number
    cpu_count: number
    memory_usage: number
    memory_total: number
    memory_available: number
    disk_usage: number
    disk_total: number
    disk_free: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toGB(b: number) {
  return (b / 1024 / 1024 / 1024).toFixed(1)
}

function dimSince(dt: string | null, t: (key: string) => string): string {
  if (!dt) return t('common.never')
  const d = differenceInDays(new Date(), new Date(dt))
  if (d < 1) return t('dashboard.activityTimeline.today')
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.round(d / 7)}w ago`
  return `${Math.round(d / 30)}mo ago`
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CLASSES = {
  healthy: {
    badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    dot: 'bg-green-500',
    border: 'border-green-200 dark:border-green-800',
    card: 'bg-green-50/50 dark:bg-green-900/10',
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    dot: 'bg-yellow-500',
    border: 'border-yellow-200 dark:border-yellow-800',
    card: 'bg-yellow-50/50 dark:bg-yellow-900/10',
  },
  critical: {
    badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    dot: 'bg-red-500',
    border: 'border-red-200 dark:border-red-800',
    card: 'bg-red-50/50 dark:bg-red-900/10',
  },
  unknown: {
    badge: 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
    dot: 'bg-neutral-400',
    border: 'border-neutral-200 dark:border-neutral-700',
    card: 'bg-neutral-50/50 dark:bg-neutral-900/10',
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'healthy' | 'warning' | 'critical' | 'unknown' }) {
  const cls = STATUS_CLASSES[status] ?? STATUS_CLASSES.unknown
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full flex-shrink-0', cls.dot)}
      aria-hidden="true"
    />
  )
}

function DimIcon({ status }: { status: string }) {
  if (status === 'healthy') return <CheckCircle2 className="h-3 w-3 text-primary" />
  if (status === 'warning') return <AlertTriangle className="h-3 w-3 text-muted-foreground" />
  if (status === 'critical') return <XCircle className="h-3 w-3 text-destructive" />
  return <MinusCircle className="h-3 w-3 text-neutral-400" />
}

/**
 * ScheduleBadge — always-visible schedule state indicator.
 */
function ScheduleBadge({
  nextRun,
  hasSchedule,
  scheduleEnabled,
  scheduleName,
  nowMs,
}: {
  nextRun: string | null
  hasSchedule: boolean
  scheduleEnabled: boolean
  scheduleName: string | null
  nowMs: number
}) {
  const { t } = useTranslation()

  if (!hasSchedule) {
    return (
      <span
        title={t('dashboard.scheduleBadge.noSchedule')}
        className="font-mono text-[0.6rem] text-muted-foreground"
      >
        {t('dashboard.scheduleBadge.manual')}
      </span>
    )
  }

  if (!scheduleEnabled) {
    return (
      <Badge
        variant="outline"
        className="gap-1 font-mono text-[0.6rem] border-border text-muted-foreground bg-muted"
        title={
          scheduleName
            ? t('dashboard.scheduleBadge.pausedTitle', { name: scheduleName })
            : t('dashboard.scheduleBadge.pausedTitleGeneric')
        }
      >
        <Pause className="h-2.5 w-2.5" />
        {t('dashboard.scheduleBadge.paused')}
      </Badge>
    )
  }

  if (!nextRun) {
    return (
      <Badge
        variant="outline"
        className="gap-1 font-mono text-[0.6rem] border-border text-muted-foreground bg-muted"
        title={scheduleName ?? t('dashboard.scheduleBadge.scheduled')}
      >
        <RotateCw className="h-2.5 w-2.5" />
        {t('dashboard.scheduleBadge.scheduled')}
      </Badge>
    )
  }

  const msAway = new Date(nextRun).getTime() - nowMs
  const hoursAway = msAway / 1000 / 60 / 60

  const label =
    msAway <= 0
      ? t('dashboard.scheduleBadge.now')
      : hoursAway < 1
        ? `${Math.round(hoursAway * 60)}m`
        : hoursAway < 24
          ? `${Math.floor(hoursAway)}h`
          : `${Math.floor(hoursAway / 24)}d`

  return (
    <Badge
      variant="outline"
      className="gap-1 font-mono text-[0.6rem] border-neutral-300 text-neutral-700 bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:bg-neutral-800/50"
      title={
        scheduleName
          ? t('dashboard.scheduleBadge.nextRunTitle', { name: scheduleName, label })
          : t('dashboard.scheduleBadge.nextRunTitleGeneric', { label })
      }
    >
      <Play className="h-2.5 w-2.5" />
      {label}
    </Badge>
  )
}

type DimHealth = {
  backup: 'healthy' | 'warning' | 'critical' | 'unknown'
  check: 'healthy' | 'warning' | 'critical' | 'unknown'
  compact: 'healthy' | 'warning' | 'critical' | 'unknown'
}

/**
 * DimStatusGrid — 3-column health footer: BKP · CHK · CPT
 */
function DimStatusGrid({
  mode,
  dim,
  lastBackup,
  lastCheck,
  lastCompact,
}: {
  mode: 'full' | 'observe'
  dim: DimHealth | undefined
  lastBackup: string | null
  lastCheck: string | null
  lastCompact: string | null
}) {
  const { t } = useTranslation()

  const items =
    mode === 'observe'
      ? [
          {
            label: t('dashboard.repositoryHealth.dimensionLabels.freshness'),
            status: dim?.backup ?? 'unknown',
            value: dimSince(lastBackup, t),
          },
          {
            label: t('dashboard.repositoryHealth.dimensionLabels.archives'),
            status: dim?.compact ?? 'unknown',
            value: t('dashboard.repositoryHealth.archiveCountShort', {
              count: Number(lastCompact ?? 0),
            }),
          },
          {
            label: t('dashboard.repositoryHealth.dimensionLabels.check'),
            status: dim?.check ?? 'unknown',
            value:
              dim?.check === 'unknown'
                ? t('scheduledChecks.notConfigured')
                : dimSince(lastCheck, t),
          },
        ]
      : [
          {
            label: t('dashboard.repositoryHealth.dimensionLabels.backup'),
            status: dim?.backup ?? 'unknown',
            value: dimSince(lastBackup, t),
          },
          {
            label: t('dashboard.repositoryHealth.dimensionLabels.check'),
            status: dim?.check ?? 'unknown',
            value: dimSince(lastCheck, t),
          },
          {
            label: t('dashboard.repositoryHealth.dimensionLabels.compact'),
            status: dim?.compact ?? 'unknown',
            value: dimSince(lastCompact, t),
          },
        ]

  return (
    <div className="grid grid-cols-3 gap-0 w-full">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn('flex flex-col gap-0.5', i > 0 && 'pl-2 border-l border-border')}
        >
          <div className="flex items-center gap-0.5">
            <DimIcon status={item.status} />
            <span className="text-[0.52rem] font-semibold text-muted-foreground tracking-wide uppercase">
              {item.label}
            </span>
          </div>
          <span className="font-mono text-[0.62rem] font-semibold leading-none text-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Build area chart data from activity feed — counts per day for last 14 days.
 */
function buildChartData(
  activities: DashboardOverview['activity_feed']
): Array<{ date: string; backups: number; failures: number }> {
  const DAYS = 14
  const today = startOfDay(new Date())

  return Array.from({ length: DAYS }, (_, i) => {
    const day = addDays(today, -(DAYS - 1 - i))
    const label = format(day, 'M/d')
    const dayActivities = activities.filter((a) => {
      const d = startOfDay(new Date(a.timestamp))
      return differenceInDays(d, day) === 0
    })
    return {
      date: label,
      backups: dayActivities.filter((a) => a.status !== 'failed').length,
      failures: dayActivities.filter((a) => a.status === 'failed').length,
    }
  })
}

/**
 * ActivityAreaChart — recharts area chart showing backup freq over 14 days.
 */
function ActivityAreaChart({ activities }: { activities: DashboardOverview['activity_feed'] }) {
  const { t } = useTranslation()
  const data = buildChartData(activities)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradBackups" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradFailures" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <RechartsTooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Area
          type="monotone"
          dataKey="backups"
          name={t('dashboard.activityTimeline.jobType.backup', { defaultValue: 'backups' })}
          stroke="hsl(var(--foreground))"
          strokeWidth={1.5}
          fill="url(#gradBackups)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="failures"
          name={t('dashboard.activityTimeline.legendFailed', { defaultValue: 'failures' })}
          stroke="hsl(var(--destructive))"
          strokeWidth={1.5}
          fill="url(#gradFailures)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * StatCard — a single KPI tile with value, label, and optional trend.
 */
function StatCard({
  title,
  value,
  sub,
  trend,
  icon: Icon,
}: {
  title: string
  value: React.ReactNode
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>{title}</span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-2xl font-bold font-mono leading-none">{value}</div>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                trend === 'up' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                trend === 'down' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                trend === 'neutral' && 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
              )}
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * ResourceBar — CPU / memory / disk usage indicator.
 */
function ResourceBar({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value.toFixed(0)}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
      {sub && <span className="font-mono text-[0.6rem] text-muted-foreground">{sub}</span>}
    </div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-44 w-full" />
        </CardContent>
      </Card>
      {/* repos */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardV3() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { trackNavigation, EventAction } = useAnalytics()
  const [nowMs] = React.useState(() => Date.now())

  const {
    data: ov,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardOverview>({
    queryKey: ['dashboard-v3'],
    queryFn: () => dashboardAPI.getOverview().then((response) => response.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <DashboardSkeleton />

  if (error || !ov)
    return (
      <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between gap-4">
        <span>{t('dashboard.error.unavailable')}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            trackNavigation(EventAction.VIEW, {
              section: 'dashboard',
              operation: 'retry_refresh',
            })
            refetch()
          }}
        >
          {t('dashboard.error.retry')}
        </Button>
      </div>
    )

  const { summary, storage, repository_health: repos, system_metrics: sys } = ov

  const criticalCount = repos.filter((r) => r.health_status === 'critical').length
  const warningCount = repos.filter((r) => r.health_status === 'warning').length
  const healthyCount = repos.filter((r) => r.health_status === 'healthy').length
  const sysStatus: 'critical' | 'warning' | 'healthy' =
    criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy'

  const lastBackupDate = repos
    .map((r) => (r.last_backup ? new Date(r.last_backup) : null))
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0]

  const systemStatusText =
    sysStatus === 'healthy'
      ? t('dashboard.banner.allNominal')
      : sysStatus === 'warning'
        ? t('dashboard.banner.warnings', {
            count: warningCount,
            s: warningCount > 1 ? 's' : '',
          })
        : t('dashboard.banner.critical', { count: criticalCount })

  return (
    <div className="space-y-6">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          <h1 className="text-lg font-semibold">BorgScale</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* System status badge */}
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 font-mono text-xs',
              STATUS_CLASSES[sysStatus].badge
            )}
          >
            <StatusDot status={sysStatus} />
            {systemStatusText}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              trackNavigation(EventAction.VIEW, {
                section: 'dashboard',
                operation: 'refresh',
              })
              refetch()
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('common.buttons.refresh')}
          </Button>
        </div>
      </div>

      {/* ── 4-up stat tiles ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title={t('dashboard.stats.repositories')}
          value={summary.total_repositories}
          sub={`${summary.local_repositories} local · ${summary.ssh_repositories} SSH`}
          icon={Server}
          trend="neutral"
        />
        {/* Success rate tile — renders job counts and ratio for tests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{t('dashboard.successDonut.label')}</span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-2xl font-bold font-mono leading-none">
                  {`${summary.success_rate_30d.toFixed(0)}%`}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {`${summary.successful_jobs_30d}/${summary.total_jobs_30d} OK`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-sm font-semibold text-primary">
                  {summary.successful_jobs_30d}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {t('dashboard.successDonut.passed')}
                </span>
                <span
                  className={cn(
                    'font-mono text-sm font-semibold',
                    summary.failed_jobs_30d > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {summary.failed_jobs_30d}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {t('dashboard.successDonut.failed')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard
          title={t('dashboard.banner.stats.storage')}
          value={storage.total_size}
          sub={`${storage.total_archives} archives${storage.average_dedup_ratio != null ? ` · ${storage.average_dedup_ratio.toFixed(2)}× dedup` : ''}`}
          icon={HardDrive}
          trend="neutral"
        />
        <StatCard
          title={t('dashboard.banner.stats.schedules')}
          value={`${summary.active_schedules}/${summary.total_schedules}`}
          sub={
            lastBackupDate
              ? `${t('dashboard.banner.stats.lastBackup')}: ${formatDistanceToNow(lastBackupDate, { addSuffix: true })}`
              : `${t('dashboard.banner.stats.lastBackup')}: ${t('common.never')}`
          }
          icon={Cpu}
          trend={
            summary.active_schedules === summary.total_schedules && summary.total_schedules > 0
              ? 'up'
              : 'neutral'
          }
        />
      </div>

      {/* ── System resources ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Cpu className="h-4 w-4" />
            {t('dashboard.resources')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResourceBar
              label={t('dashboard.cpu')}
              value={sys.cpu_usage}
              sub={`${sys.cpu_count} cores`}
            />
            <ResourceBar
              label={t('dashboard.memAbbr')}
              value={sys.memory_usage}
              sub={`${toGB(sys.memory_total - sys.memory_available)} / ${toGB(sys.memory_total)} GB`}
            />
            <ResourceBar
              label={t('dashboard.diskAbbr')}
              value={sys.disk_usage}
              sub={`${toGB(sys.disk_total - sys.disk_free)} / ${toGB(sys.disk_total)} GB`}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Activity area chart ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" />
            {t('dashboard.recentActivity.last14Days')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityAreaChart activities={ov.activity_feed} />
        </CardContent>
      </Card>

      {/* ── Repository health grid ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Server className="h-4 w-4" />
              {t('dashboard.repositoryHealth.title')}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {criticalCount > 0 && (
                <Badge variant="outline" className={cn('font-mono text-xs', STATUS_CLASSES.critical.badge)}>
                  {t('dashboard.banner.critical', { count: criticalCount })}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className={cn('font-mono text-xs', STATUS_CLASSES.warning.badge)}>
                  {t('dashboard.banner.warnChip', { count: warningCount })}
                </Badge>
              )}
              {healthyCount > 0 && (
                <Badge variant="outline" className={cn('font-mono text-xs', STATUS_CLASSES.healthy.badge)}>
                  {t('dashboard.banner.okChip', { count: healthyCount })}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {repos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t('dashboard.noRepositoriesShort')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {repos.map((repo) => {
                const cardStatus = repo.health_status as 'healthy' | 'warning' | 'critical'
                const cls = STATUS_CLASSES[cardStatus]

                return (
                  <div
                    key={repo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      trackNavigation(EventAction.VIEW, {
                        section: 'dashboard',
                        destination: 'repositories',
                        source: 'repository_health',
                      })
                      navigate('/repositories')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate('/repositories')
                      }
                    }}
                    className={cn(
                      'rounded-lg border p-3 cursor-pointer transition-all duration-150',
                      'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      cls.card,
                      cls.border
                    )}
                  >
                    {/* Top row: status + type | schedule badge */}
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={cardStatus} />
                        <span className="font-mono text-[0.6rem] text-muted-foreground uppercase tracking-wide">
                          {repo.type}
                        </span>
                        {repo.mode === 'observe' && (
                          <Badge
                            variant="outline"
                            className="font-mono text-[0.55rem] h-4 border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
                          >
                            {t('repositories.observeOnly')}
                          </Badge>
                        )}
                      </div>
                      <ScheduleBadge
                        nextRun={repo.next_run}
                        hasSchedule={repo.has_schedule}
                        scheduleEnabled={repo.schedule_enabled}
                        scheduleName={repo.schedule_name}
                        nowMs={nowMs}
                      />
                    </div>

                    {/* Name */}
                    <p className="mb-1 truncate text-sm font-semibold">{repo.name}</p>

                    {/* Stats */}
                    <div className="mb-2 flex items-center gap-3 font-mono text-[0.62rem] text-muted-foreground">
                      <span>
                        {t('dashboard.repositoryHealth.archiveCountShort', {
                          count: repo.archive_count,
                        })}
                      </span>
                      <span>{repo.total_size}</span>
                    </div>

                    {/* Divider */}
                    <div className="mb-2 border-t border-border" />

                    {/* Dimension status */}
                    <DimStatusGrid
                      mode={repo.mode}
                      dim={repo.dimension_health}
                      lastBackup={repo.last_backup}
                      lastCheck={repo.last_check}
                      lastCompact={
                        repo.mode === 'observe' ? String(repo.archive_count) : repo.last_compact
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Storage breakdown ──────────────────────────────────────────────── */}
      {storage.breakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              {t('dashboard.banner.stats.storage')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {storage.breakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-28 truncate font-mono text-xs">{item.name}</span>
                  <div className="flex-1">
                    <Progress value={item.percentage} className="h-1.5" />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                    {item.percentage}%
                  </span>
                  <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                    {item.size}
                  </span>
                </div>
              ))}
            </div>
            {storage.average_dedup_ratio != null && (
              <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {t('dashboard.storageDonut.dedupRatio')}
                </span>
                <span className="font-mono font-semibold">
                  {storage.average_dedup_ratio.toFixed(2)}×
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Recent activity table ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              {t('dashboard.recentActivity.last14Days')}
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground"
              onClick={() => {
                trackNavigation(EventAction.VIEW, {
                  section: 'dashboard',
                  destination: 'activity',
                  source: 'recent_activity',
                })
                navigate('/activity')
              }}
            >
              {t('dashboard.recentActivity.fullLog')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ov.activity_feed.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {t('dashboard.recentActivity.emptyRecorded')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 text-xs">{t('common.status', { defaultValue: 'Status' })}</TableHead>
                  <TableHead className="text-xs">{t('common.type', { defaultValue: 'Type' })}</TableHead>
                  <TableHead className="text-xs">{t('common.repository', { defaultValue: 'Repository' })}</TableHead>
                  <TableHead className="text-right pr-6 text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ov.activity_feed.slice(0, 10).map((a) => (
                  <TableRow key={`${a.type}-${a.id}`}>
                    <TableCell className="pl-6">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-[0.6rem]',
                          a.status === 'failed'
                            ? STATUS_CLASSES.critical.badge
                            : STATUS_CLASSES.healthy.badge
                        )}
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.type}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.repository}</TableCell>
                    <TableCell className="pr-6 text-right font-mono text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Recent failures ────────────────────────────────────────────────── */}
      {ov.activity_feed.some((a) => a.status === 'failed') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" />
              {t('dashboard.recentFailures.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ov.activity_feed
                .filter((a) => a.status === 'failed')
                .slice(0, 3)
                .map((a) => (
                  <div key={`fail-${a.type}-${a.id}`} className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold">{a.repository}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      {a.error && (
                        <p className="mt-0.5 break-all font-mono text-xs text-destructive/80">
                          {a.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
