import { useCallback } from 'react'
import { formatBytes, parseBytes } from '../utils/dateUtils'

type AnalyticsEntity =
  | string
  | {
      name?: string | null
      repository?: string | null
      total_size?: string | number | null
      size_bytes?: number | null
    }

export const EventCategory = {
  REPOSITORY: 'Repository',
  BACKUP: 'Backup',
  ARCHIVE: 'Archive',
  MOUNT: 'Mount',
  MAINTENANCE: 'Maintenance',
  SSH: 'SSH Connection',
  SCRIPT: 'Script',
  NOTIFICATION: 'Notification',
  SYSTEM: 'System',
  PACKAGE: 'Package',
  SETTINGS: 'Settings',
  AUTH: 'Authentication',
  NAVIGATION: 'Navigation',
  PLAN: 'Plan',
  ANNOUNCEMENT: 'Announcement',
} as const

export const EventAction = {
  CREATE: 'Create',
  EDIT: 'Edit',
  DELETE: 'Delete',
  VIEW: 'View',
  START: 'Start',
  STOP: 'Stop',
  COMPLETE: 'Complete',
  FAIL: 'Fail',
  MOUNT: 'Mount',
  UNMOUNT: 'Unmount',
  DOWNLOAD: 'Download',
  UPLOAD: 'Upload',
  TEST: 'Test',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  SEARCH: 'Search',
  FILTER: 'Filter',
  EXPORT: 'Export',
  CANCEL: 'Cancel',
} as const

/** All analytics functions are no-ops — tracking was removed in Wave 2b. */
const anonymizeEntityName = (name: string): string => name

/**
 * Custom hook for analytics event tracking.
 * Provides easy-to-use tracking functions for components.
 * All tracking is a no-op; the hook shape is preserved for call-site stability.
 */
export const useAnalytics = () => {
  const resolveEntityName = useCallback((entity?: AnalyticsEntity) => {
    if (typeof entity === 'string') return entity
    return entity?.name ?? entity?.repository ?? undefined
  }, [])

  const resolveEntitySize = useCallback((entity?: AnalyticsEntity) => {
    if (!entity || typeof entity === 'string') return undefined
    if (typeof entity.size_bytes === 'number') return entity.size_bytes
    if (typeof entity.total_size === 'number') return entity.total_size
    if (typeof entity.total_size === 'string' && entity.total_size.trim()) {
      return parseBytes(entity.total_size)
    }
    return undefined
  }, [])

  const buildEntityData = useCallback(
    (entity?: AnalyticsEntity, extra?: Record<string, unknown>) => {
      const data: Record<string, unknown> = { ...(extra || {}) }
      const entityName = resolveEntityName(entity)
      const sizeBytes = resolveEntitySize(entity)

      if (entityName) {
        data.name = anonymizeEntityName(entityName)
      }

      if (sizeBytes !== undefined) {
        data.size_bytes = sizeBytes
        data.size_human = formatBytes(sizeBytes)
      }

      return Object.keys(data).length ? data : undefined
    },
    [resolveEntityName, resolveEntitySize]
  )

  // Track page view — no-op
  const trackPage = useCallback((_customTitle?: string) => {}, [])

  // Generic event tracking — no-op
  const track = useCallback(
    (
      _category: string,
      _action: string,
      _nameOrData?: string | Record<string, unknown>,
      _value?: number
    ) => {},
    []
  )

  // Repository-specific tracking — no-op
  const trackRepository = useCallback(
    (_action: string, _entity?: AnalyticsEntity, _extra?: Record<string, unknown>) => {},
    []
  )

  // Backup tracking — no-op
  const trackBackup = useCallback(
    (
      _action: string,
      _descriptor?: string,
      _entity?: AnalyticsEntity,
      _extra?: Record<string, unknown>
    ) => {},
    []
  )

  // Archive tracking — no-op
  const trackArchive = useCallback(
    (_action: string, _entity?: AnalyticsEntity, _extra?: Record<string, unknown>) => {},
    []
  )

  // Mount tracking — no-op
  const trackMount = useCallback((_action: string, _entity?: AnalyticsEntity) => {}, [])

  // Maintenance tracking — no-op
  const trackMaintenance = useCallback(
    (
      _action: string,
      _operationType: string,
      _entity?: AnalyticsEntity,
      _extra?: Record<string, unknown>
    ) => {},
    []
  )

  const trackSSH = useCallback(
    (_action: string, _entityNameOrData?: string | Record<string, unknown>) => {},
    []
  )

  const trackSettings = useCallback(
    (_action: string, _settingNameOrData?: string | Record<string, unknown>) => {},
    []
  )

  const trackScripts = useCallback(
    (_action: string, _scriptName?: string, _data?: Record<string, unknown>) => {},
    []
  )

  const trackNotifications = useCallback((_action: string, _data?: Record<string, unknown>) => {}, [])

  const trackSystem = useCallback((_action: string, _data?: Record<string, unknown>) => {}, [])

  const trackPackage = useCallback(
    (_action: string, _packageName?: string, _data?: Record<string, unknown>) => {},
    []
  )

  const trackNavigation = useCallback((_action: string, _data?: Record<string, unknown>) => {}, [])

  const trackPlan = useCallback((_action: string, _data?: Record<string, unknown>) => {}, [])

  const trackAnnouncement = useCallback((_action: string, _data?: Record<string, unknown>) => {}, [])

  const trackAuth = useCallback((_action: string, _data?: Record<string, unknown>) => {}, [])

  return {
    trackPage,
    track,
    trackRepository,
    trackBackup,
    trackArchive,
    trackMount,
    trackMaintenance,
    trackSSH,
    trackSettings,
    trackScripts,
    trackNotifications,
    trackSystem,
    trackPackage,
    trackNavigation,
    trackPlan,
    trackAnnouncement,
    trackAuth,
    buildEntityData,
    EventCategory,
    EventAction,
  }
}
