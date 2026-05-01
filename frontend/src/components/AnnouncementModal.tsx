import {
  BellRing,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Announcement } from '../types/announcements'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface AnnouncementModalProps {
  announcement: Announcement | null
  open: boolean
  onAcknowledge: () => void
  onSnooze: () => void
  onCtaClick?: () => void
}

function getAnnouncementTone(type: Announcement['type']) {
  switch (type) {
    case 'security_notice':
    case 'migration_notice':
      return 'warning'
    case 'maintenance_notice':
      return 'info'
    default:
      return 'success'
  }
}

function getAnnouncementIcon(type: Announcement['type']) {
  switch (type) {
    case 'security_notice':
    case 'migration_notice':
      return <ShieldAlert size={20} />
    case 'maintenance_notice':
      return <Wrench size={20} />
    default:
      return <BellRing size={20} />
  }
}

export default function AnnouncementModal({
  announcement,
  open,
  onAcknowledge,
  onSnooze,
  onCtaClick,
}: AnnouncementModalProps) {
  const { t } = useTranslation()

  if (!announcement) return null

  const tone = getAnnouncementTone(announcement.type)
  const icon = getAnnouncementIcon(announcement.type)

  const accentCls =
    tone === 'warning'
      ? { bg: 'bg-secondary text-secondary-foreground', border: 'border-border', icon: 'bg-muted text-muted-foreground', isPrimary: false }
      : tone === 'info'
        ? { bg: 'bg-muted text-muted-foreground', border: 'border-border', icon: 'bg-muted text-muted-foreground', isPrimary: false }
        : { bg: 'bg-primary/10 text-primary', border: 'border-primary/20', icon: 'bg-primary/10 text-primary', isPrimary: true }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onAcknowledge() }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0 bg-card text-card-foreground border-border rounded-3xl shadow-xl"
      >
        {/* Header section */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0 border ${accentCls.icon} ${accentCls.border}`}>
              {icon}
            </div>

            {/* Title + chips */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {/* Type chip */}
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border"
                  style={{ height: 24 }}
                >
                  <Sparkles size={12} />
                  {t(`announcements.types.${announcement.type}`)}
                </span>
                {announcement.type === 'update_available' && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${accentCls.bg} ${accentCls.border}`}
                    style={{ height: 24 }}
                  >
                    Latest release
                  </span>
                )}
              </div>

              <h2
                className="text-xl font-extrabold leading-tight tracking-tight mb-2"
                style={{ letterSpacing: '-0.02em' }}
              >
                {announcement.title}
              </h2>

              <p className="text-sm leading-relaxed max-w-prose text-muted-foreground">
                {announcement.message}
              </p>
            </div>

            {/* Dismiss X */}
            {announcement.dismissible !== false && (
              <button
                type="button"
                onClick={onAcknowledge}
                aria-label="Close announcement"
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 border border-border bg-muted/20 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Body section */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          {announcement.highlights?.length ? (
            <div className={`p-4 mb-4 rounded-2xl border ${accentCls.border} bg-muted/30`}>
              <p className={`text-xs font-extrabold uppercase tracking-[0.12em] mb-2.5 ${accentCls.isPrimary ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('announcements.highlights')}
              </p>

              <div className="flex flex-col gap-2">
                {announcement.highlights.map((highlight) => (
                  <div key={highlight} className="flex gap-2.5 items-start">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 bg-foreground/60`} />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Actions row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* CTA link */}
            {announcement.cta_url ? (
              <a
                href={announcement.cta_url}
                target="_blank"
                rel="noreferrer"
                onClick={onCtaClick}
                className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors duration-150 text-primary hover:text-primary/80 no-underline"
                style={{ textDecoration: 'none' }}
              >
                {announcement.cta_label || t('announcements.viewDetails')}
                <ExternalLink size={15} />
              </a>
            ) : (
              <div />
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2.5 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onSnooze}
              >
                {t('announcements.remindLater')}
              </Button>

              {announcement.dismissible !== false && (
                <Button
                  size="sm"
                  onClick={onAcknowledge}
                  className="gap-1.5"
                >
                  {t('announcements.gotIt')}
                  <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
