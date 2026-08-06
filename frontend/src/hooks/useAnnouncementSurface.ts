import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSystemInfo } from './useSystemInfo'
import type { Announcement } from '../types/announcements'
import {
  DEFAULT_ANNOUNCEMENTS_MANIFEST,
  fetchAnnouncementsManifest,
} from '../services/announcements'
import {
  acknowledgeAnnouncement,
  getAnnouncementSnoozeDays,
  resolveAnnouncementLocale,
  selectAnnouncement,
  snoozeAnnouncement,
} from '../utils/announcements'

interface UseAnnouncementSurfaceResult {
  announcement: Announcement | null
  acknowledgeAnnouncement: () => void
  snoozeAnnouncement: () => void
}

export function useAnnouncementSurface(): UseAnnouncementSurfaceResult {
  const [hiddenAnnouncementIds, setHiddenAnnouncementIds] = useState<string[]>([])
  const { i18n } = useTranslation()
  const { data: systemInfo } = useSystemInfo()

  const { data: manifest } = useQuery({
    queryKey: ['announcements-manifest'],
    queryFn: () => fetchAnnouncementsManifest(),
    initialData: DEFAULT_ANNOUNCEMENTS_MANIFEST,
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const announcement = useMemo(() => {
    if (!systemInfo || !manifest) return null

    const selectedAnnouncement = selectAnnouncement(
      manifest.announcements.filter(
        (manifestAnnouncement) => !hiddenAnnouncementIds.includes(manifestAnnouncement.id)
      ),
      {
        appVersion: systemInfo.app_version,
        now: new Date(),
      }
    )

    return selectedAnnouncement
      ? resolveAnnouncementLocale(selectedAnnouncement, i18n.resolvedLanguage)
      : null
  }, [hiddenAnnouncementIds, i18n.resolvedLanguage, manifest, systemInfo])

  const hideAnnouncement = useCallback((id: string) => {
    setHiddenAnnouncementIds((current) => [...current, id])
  }, [])

  const handleAcknowledgeAnnouncement = useCallback(() => {
    if (!announcement || announcement.dismissible === false) return
    acknowledgeAnnouncement(announcement.id)
    hideAnnouncement(announcement.id)
  }, [announcement, hideAnnouncement])

  const handleSnoozeAnnouncement = useCallback(() => {
    if (!announcement) return
    const snoozeUntil = new Date()
    snoozeUntil.setDate(snoozeUntil.getDate() + getAnnouncementSnoozeDays(announcement))
    snoozeAnnouncement(announcement.id, snoozeUntil)
    hideAnnouncement(announcement.id)
  }, [announcement, hideAnnouncement])

  return {
    announcement,
    acknowledgeAnnouncement: handleAcknowledgeAnnouncement,
    snoozeAnnouncement: handleSnoozeAnnouncement,
  }
}
