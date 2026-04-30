/**
 * Analytics stub — opt-in surface removed in Wave 2b.
 * All functions are no-ops; the hook layer (useAnalytics) remains
 * for a future clean-up pass without breaking the rest of the app.
 */

export const setAppVersion = (_version: string): void => {}

export const loadUserPreference = async (): Promise<void> => {}

export const hasConsentBeenGiven = (): boolean | null => null


export const identifyUser = (_username: string): void => {}

export const trackEvent = (
  _category: string,
  _action: string,
  _nameOrData?: string | Record<string, unknown>,
  _value?: number
): void => {}

export const trackPageView = (_title?: string): void => {}

export const anonymizeEntityName = (name: string): string => name

export const resetOptOutCache = async (): Promise<void> => {}

export const trackOptOut = (): void => {}

export const trackLanguageChange = (_langCode: string): void => {}

export const PUBLIC_ANALYTICS_DASHBOARD_URL = ''

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
