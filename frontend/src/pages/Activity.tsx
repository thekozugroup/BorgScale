import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'
import { useQuery } from '@tanstack/react-query'
import { History, Info, RefreshCw } from 'lucide-react'
import { activityAPI } from '../services/api'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../hooks/useAuth'
import BackupJobsTable from '../components/BackupJobsTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ActivityItem {
  id: number
  type: string
  status: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  repository: string | null
  log_file_path: string | null
  archive_name: string | null
  package_name: string | null
  repository_path: string | null
  triggered_by?: string
  schedule_id?: number | null
  schedule_name?: string | null
  has_logs?: boolean
}

const Activity: React.FC = () => {
  const { t } = useTranslation()
  usePageTitle(t('activity.title'))
  const { track, EventCategory, EventAction } = useAnalytics()
  const { hasGlobalPermission } = useAuth()
  const canManageActivityJobs = hasGlobalPermission('repositories.manage_all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const {
    data: activities,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['activity', typeFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { limit: 200 }
      if (typeFilter !== 'all') params.job_type = typeFilter
      if (statusFilter !== 'all') params.status = statusFilter
      const response = await activityAPI.list(params)
      return response.data
    },
    refetchInterval: 3000,
  })

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    track(EventCategory.NAVIGATION, EventAction.FILTER, {
      filter_kind: 'type',
      filter_value: value,
    })
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    track(EventCategory.NAVIGATION, EventAction.FILTER, {
      filter_kind: 'status',
      filter_value: value,
    })
  }

  const processedActivities = React.useMemo(() => {
    if (!activities) return { grouped: [], individual: [] }
    return { grouped: [], individual: activities }
  }, [activities])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <History size={28} className="flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('activity.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('activity.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          title={t('common.buttons.refresh')}
          aria-label={t('common.buttons.refresh')}
          className="self-end sm:self-auto flex items-center justify-center w-9 h-9 rounded-xl border border-border hover:bg-muted/40 transition-colors"
        >
          <RefreshCw size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <label htmlFor="activity-type-filter" className="sr-only">
          {t('activity.filters.type')}
        </label>
        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger
            id="activity-type-filter"
            className="min-w-36"
            aria-label={t('activity.filters.type')}
          >
            <SelectValue placeholder={t('activity.filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('activity.filters.allTypes')}</SelectItem>
            <SelectItem value="backup">{t('activity.filters.types.backup')}</SelectItem>
            <SelectItem value="restore">{t('activity.filters.types.restore')}</SelectItem>
            <SelectItem value="check">{t('activity.filters.types.check')}</SelectItem>
            <SelectItem value="compact">{t('activity.filters.types.compact')}</SelectItem>
            <SelectItem value="prune">{t('activity.filters.types.prune')}</SelectItem>
            <SelectItem value="package">{t('activity.filters.types.package')}</SelectItem>
          </SelectContent>
        </Select>

        <label htmlFor="activity-status-filter" className="sr-only">
          {t('activity.filters.status')}
        </label>
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger
            id="activity-status-filter"
            className="min-w-36"
            aria-label={t('activity.filters.status')}
          >
            <SelectValue placeholder={t('activity.filters.allStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('activity.filters.allStatus')}</SelectItem>
            <SelectItem value="completed">{t('activity.filters.statuses.completed')}</SelectItem>
            <SelectItem value="failed">{t('activity.filters.statuses.failed')}</SelectItem>
            <SelectItem value="running">{t('activity.filters.statuses.running')}</SelectItem>
            <SelectItem value="pending">{t('activity.filters.statuses.pending')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <BackupJobsTable<ActivityItem>
          jobs={[]}
          showTypeColumn={true}
          showTriggerColumn={true}
          loading={true}
          actions={{
            viewLogs: true,
            downloadLogs: true,
            errorInfo: true,
            breakLock: true,
            delete: true,
          }}
          canBreakLocks={canManageActivityJobs}
          canDeleteJobs={canManageActivityJobs}
          getRowKey={(activity) => `${activity.type}-${activity.id}`}
          headerBgColor="background.default"
          enableHover={true}
          tableId="activity"
        />
      ) : (
        <BackupJobsTable<ActivityItem>
          jobs={processedActivities.individual}
          showTypeColumn={true}
          showTriggerColumn={true}
          loading={false}
          actions={{
            viewLogs: true,
            downloadLogs: true,
            errorInfo: true,
            breakLock: true,
            delete: true,
          }}
          canBreakLocks={canManageActivityJobs}
          canDeleteJobs={canManageActivityJobs}
          getRowKey={(activity) => `${activity.type}-${activity.id}`}
          headerBgColor="background.default"
          enableHover={true}
          tableId="activity"
          emptyState={{
            icon: <Info size={48} />,
            title: t('activity.empty.title'),
            description: t('activity.empty.message'),
          }}
        />
      )}
    </div>
  )
}

export default Activity
