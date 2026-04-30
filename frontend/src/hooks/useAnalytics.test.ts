import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

describe('useAnalytics', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/settings?tab=appearance')
  })

  it('returns all expected tracking functions', async () => {
    const { useAnalytics } = await import('./useAnalytics')
    const { result } = renderHook(() => useAnalytics())

    expect(typeof result.current.trackPage).toBe('function')
    expect(typeof result.current.track).toBe('function')
    expect(typeof result.current.trackRepository).toBe('function')
    expect(typeof result.current.trackBackup).toBe('function')
    expect(typeof result.current.trackArchive).toBe('function')
    expect(typeof result.current.trackMount).toBe('function')
    expect(typeof result.current.trackMaintenance).toBe('function')
    expect(typeof result.current.trackSSH).toBe('function')
    expect(typeof result.current.trackSettings).toBe('function')
    expect(typeof result.current.trackScripts).toBe('function')
    expect(typeof result.current.trackNotifications).toBe('function')
    expect(typeof result.current.trackSystem).toBe('function')
    expect(typeof result.current.trackPackage).toBe('function')
    expect(typeof result.current.trackNavigation).toBe('function')
    expect(typeof result.current.trackPlan).toBe('function')
    expect(typeof result.current.trackAnnouncement).toBe('function')
    expect(typeof result.current.trackAuth).toBe('function')
  })

  it('tracking functions are no-ops that return undefined', async () => {
    const { useAnalytics } = await import('./useAnalytics')
    const { result } = renderHook(() => useAnalytics())

    expect(result.current.trackPage()).toBeUndefined()
    expect(result.current.track('Category', 'Action')).toBeUndefined()
    expect(result.current.trackRepository('View')).toBeUndefined()
    expect(result.current.trackBackup('Start')).toBeUndefined()
    expect(result.current.trackSSH('Edit', 'ssh-prod')).toBeUndefined()
    expect(result.current.trackSettings('Edit', { section: 'appearance' })).toBeUndefined()
    expect(result.current.trackAnnouncement('Acknowledge', { id: 'a1' })).toBeUndefined()
  })

  it('exposes EventCategory and EventAction consts', async () => {
    const { useAnalytics } = await import('./useAnalytics')
    const { result } = renderHook(() => useAnalytics())

    expect(result.current.EventCategory.REPOSITORY).toBe('Repository')
    expect(result.current.EventCategory.BACKUP).toBe('Backup')
    expect(result.current.EventAction.VIEW).toBe('View')
    expect(result.current.EventAction.START).toBe('Start')
  })

  it('buildEntityData normalizes entity size and name', async () => {
    const { useAnalytics } = await import('./useAnalytics')
    const { result } = renderHook(() => useAnalytics())

    const data = result.current.buildEntityData({
      name: 'prod-repo',
      total_size: '1.5 GB',
    })

    expect(data).toMatchObject({
      name: 'prod-repo',
      size_bytes: 1610612736,
      size_human: '1.50 GB',
    })
  })
})
