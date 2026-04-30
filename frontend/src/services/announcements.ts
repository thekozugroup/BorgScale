import type { AnnouncementManifest } from '../types/announcements'
import announcementsManifestData from '../data/announcements.json'

export const DEFAULT_ANNOUNCEMENTS_MANIFEST = announcementsManifestData as AnnouncementManifest

export async function fetchAnnouncementsManifest(): Promise<AnnouncementManifest> {
  const data = announcementsManifestData as Partial<AnnouncementManifest>
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    generated_at: data.generated_at,
    announcements: Array.isArray(data.announcements) ? data.announcements : [],
  }
}
