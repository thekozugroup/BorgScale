import React from 'react'
import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
  variant?: 'filled' | 'outlined'
}

type StatusTone = {
  classes: string
  Icon: React.ComponentType<{ className?: string }>
  spin?: boolean
}

/**
 * Standardized status badge used across Activity, Schedule, and Dashboard.
 *
 * Every status carries both a colour and a distinct icon. Colour alone would
 * fail WCAG 1.4.1, and more practically, "finished with warnings" and
 * "cancelled" are different enough that a glance should tell them apart.
 */
const STATUS_TONES: Record<string, StatusTone> = {
  completed: { classes: 'bg-success-subtle text-success border-success/25', Icon: CheckCircle2 },
  success: { classes: 'bg-success-subtle text-success border-success/25', Icon: CheckCircle2 },
  completed_with_warnings: {
    classes: 'bg-warning-subtle text-warning border-warning/25',
    Icon: AlertTriangle,
  },
  failed: {
    classes: 'bg-destructive-subtle text-destructive border-destructive/25',
    Icon: XCircle,
  },
  error: {
    classes: 'bg-destructive-subtle text-destructive border-destructive/25',
    Icon: XCircle,
  },
  running: { classes: 'bg-info-subtle text-info border-info/25', Icon: Loader2, spin: true },
  in_progress: { classes: 'bg-info-subtle text-info border-info/25', Icon: Loader2, spin: true },
  pending: { classes: 'bg-muted text-muted-foreground border-border', Icon: Clock },
  cancelled: { classes: 'bg-muted text-muted-foreground border-border', Icon: MinusCircle },
}

const DEFAULT_TONE: StatusTone = {
  classes: 'bg-muted text-muted-foreground border-border',
  Icon: MinusCircle,
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation()

  const tone = STATUS_TONES[status.toLowerCase()] ?? DEFAULT_TONE
  const { Icon } = tone

  const getStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return t('status.completed')
      case 'completed_with_warnings':
        return t('status.completedWithWarnings')
      case 'failed':
        return t('status.failed')
      case 'running':
      case 'in_progress':
        return t('status.running')
      case 'pending':
        return t('status.pending')
      case 'cancelled':
        return t('status.cancelled')
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  return (
    <Badge className={cn('gap-1 border font-medium', tone.classes)} variant="outline">
      <Icon
        className={cn('size-3 shrink-0', tone.spin && 'motion-safe:animate-spin')}
        aria-hidden="true"
      />
      {getStatusLabel(status)}
    </Badge>
  )
}

export default StatusBadge
