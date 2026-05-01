import React from 'react'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'small' | 'medium'
  variant?: 'filled' | 'outlined'
}

/**
 * Standardized status badge component used across Activity, Schedule, and Dashboard views
 * Shows consistent color and label representation for all job statuses (no icon)
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation()

  const getStatusClasses = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'completed_with_warnings':
        return 'bg-muted text-muted-foreground border-border'
      case 'failed':
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'running':
      case 'in_progress':
        return 'bg-secondary text-secondary-foreground border-border'
      case 'pending':
        return 'bg-muted text-muted-foreground border-border'
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-border'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

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
    <Badge
      className={cn('font-medium border', getStatusClasses(status))}
      variant="outline"
    >
      {getStatusLabel(status)}
    </Badge>
  )
}

export default StatusBadge
