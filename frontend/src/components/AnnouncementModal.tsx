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
import { useTheme } from '../context/ThemeContext'
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
  const { effectiveMode } = useTheme()

  if (!announcement) return null

  const isDark = effectiveMode === 'dark'
  const tone = getAnnouncementTone(announcement.type)
  const icon = getAnnouncementIcon(announcement.type)

  const accentColor =
    tone === 'warning' ? '#f59e0b' : tone === 'info' ? '#3b82f6' : '#6366f1'

  const panelBackground = isDark ? '#18181b' : '#ffffff'
  const foreground = isDark ? '#ffffff' : '#1f2937'
  const mutedText = isDark ? 'rgba(255,255,255,0.76)' : 'rgba(31,41,55,0.82)'
  const secondaryText = isDark ? 'rgba(255,255,255,0.58)' : 'rgba(31,41,55,0.5)'
  const borderAlpha = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const subtleBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
  const subtleBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
  const highlightBg = isDark ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.03)'
  const glintTop = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'
  const hoverBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onAcknowledge() }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0"
        style={{
          color: foreground,
          background: panelBackground,
          border: `1px solid ${borderAlpha}`,
          borderRadius: '1.5rem',
          boxShadow: isDark
            ? `0 28px 80px rgba(0,0,0,0.52)`
            : `0 28px 80px rgba(0,0,0,0.16)`,
        }}
      >
        {/* Header section */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className="flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
              style={{
                background: `${accentColor}2e`,
                color: accentColor,
                border: `1px solid ${accentColor}52`,
                boxShadow: `inset 0 1px 0 ${glintTop}`,
              }}
            >
              {icon}
            </div>

            {/* Title + chips */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {/* Type chip */}
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold"
                  style={{
                    background: subtleBg,
                    color: foreground,
                    border: `1px solid ${subtleBorder}`,
                    height: 24,
                  }}
                >
                  <Sparkles size={12} style={{ color: mutedText }} />
                  {t(`announcements.types.${announcement.type}`)}
                </span>
                {announcement.type === 'update_available' && (
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold"
                    style={{
                      background: `${accentColor}29`,
                      color: accentColor,
                      border: `1px solid ${accentColor}47`,
                      height: 24,
                    }}
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

              <p className="text-sm leading-relaxed max-w-prose" style={{ color: mutedText }}>
                {announcement.message}
              </p>
            </div>

            {/* Dismiss X */}
            {announcement.dismissible !== false && (
              <button
                type="button"
                onClick={onAcknowledge}
                aria-label="Close announcement"
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors duration-150"
                style={{
                  color: secondaryText,
                  border: `1px solid ${borderAlpha}`,
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = foreground
                  ;(e.currentTarget as HTMLButtonElement).style.background = hoverBg
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = secondaryText
                  ;(e.currentTarget as HTMLButtonElement).style.background = isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)'
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Body section */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          {announcement.highlights?.length ? (
            <div
              className="p-4 mb-4 rounded-2xl"
              style={{
                background: highlightBg,
                border: `1px solid ${accentColor}2e`,
                boxShadow: `inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)'}`,
              }}
            >
              <p
                className="text-[0.7rem] font-extrabold uppercase tracking-[0.12em] mb-2.5"
                style={{ color: accentColor }}
              >
                {t('announcements.highlights')}
              </p>

              <div className="flex flex-col gap-2">
                {announcement.highlights.map((highlight) => (
                  <div key={highlight} className="flex gap-2.5 items-start">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                      style={{
                        background: accentColor,
                        boxShadow: `0 0 0 4px ${accentColor}24`,
                      }}
                    />
                    <p className="text-sm leading-relaxed" style={{ color: mutedText }}>
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
                className="inline-flex items-center gap-1.5 text-[0.95rem] font-bold transition-colors duration-150"
                style={{ color: accentColor, textDecoration: 'none' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = `${accentColor}d1`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.color = accentColor
                }}
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
                style={{
                  color: mutedText,
                  borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.15)',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}
              >
                {t('announcements.remindLater')}
              </Button>

              {announcement.dismissible !== false && (
                <Button
                  size="sm"
                  onClick={onAcknowledge}
                  className="gap-1.5"
                  style={{
                    background: accentColor,
                    color: '#ffffff',
                  }}
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
